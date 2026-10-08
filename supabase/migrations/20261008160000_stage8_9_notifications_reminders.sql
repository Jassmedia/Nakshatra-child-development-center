-- =============================================================================
-- STAGES 8 + 9 — In-app notifications and automatic payment reminders
--
-- Notifications are created by DATABASE TRIGGERS, so every way of recording an
-- activity, attendance, progress, home task, fee or payment notifies the right
-- people. Recipients read only their own and may only change read_at.
--
-- Payment reminders: public.run_payment_reminders() sends
--   before_due (N days before), due_today, overdue (repeats every M days)
-- once per fee per kind (logged in payment_reminders). Scheduled daily with
-- pg_cron where available (Supabase), and runnable by an admin on demand.
-- =============================================================================

-- The center works in India: make CURRENT_DATE / now()::date mean Indian dates.
do $$
begin
  execute format('alter database %I set timezone = %L', current_database(), 'Asia/Kolkata');
exception when others then
  raise notice 'Could not set database timezone (%). Set it in the Supabase dashboard.', sqlerrm;
end;
$$;
set timezone = 'Asia/Kolkata';


-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  type          text not null check (type in ('activity', 'assignment', 'progress', 'attendance', 'payment', 'reminder', 'general')),
  title         text not null check (char_length(title) <= 200),
  body          text check (body is null or char_length(body) <= 1000),
  link          text check (link is null or (link like '/%' and link not like '//%')),
  student_id    uuid references public.students (id) on delete set null,
  created_at    timestamptz not null default now(),
  read_at       timestamptz
);
create index notifications_inbox_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;   -- column-level: nothing else can change

create policy notifications_select on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
-- No insert/delete policies: only the SECURITY DEFINER functions below create notifications.


-- -----------------------------------------------------------------------------
-- Delivery helpers
-- -----------------------------------------------------------------------------
create function private.notify(p_recipient uuid, p_type text, p_title text, p_body text, p_link text, p_student uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (recipient_id, type, title, body, link, student_id)
  select p_recipient, p_type, left(p_title, 200), left(p_body, 1000), p_link, p_student
  where p_recipient is not null
    and exists (select 1 from public.profiles p where p.id = p_recipient and p.is_active)
    and p_recipient is distinct from (select auth.uid());   -- never notify people about their own action
$$;

-- Every parent of the child who has an active login. Returns how many were notified.
create function private.notify_parents(p_student uuid, p_type text, p_title text, p_body text, p_section text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select distinct pa.profile_id
    from public.student_parents sp
    join public.parents pa on pa.id = sp.parent_id
    join public.profiles pr on pr.id = pa.profile_id and pr.is_active
    where sp.student_id = p_student
  loop
    perform private.notify(r.profile_id, p_type, p_title, p_body,
      '/parent/children/' || p_student || coalesce('/' || p_section, ''), p_student);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Every therapist actively assigned to the child.
create function private.notify_staff(p_student uuid, p_type text, p_title text, p_body text, p_section text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select distinct a.staff_id
    from public.student_staff_assignments a
    where a.student_id = p_student
      and a.starts_on <= current_date
      and (a.ends_on is null or a.ends_on > current_date)
  loop
    perform private.notify(r.staff_id, p_type, p_title, p_body,
      '/staff/students/' || p_student || coalesce('/' || p_section, ''), p_student);
  end loop;
end;
$$;

create function private.student_first_name(p_student uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(full_name, ' ', 1) from public.students where id = p_student;
$$;

create function private.money(p numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select '₹' || to_char(p, 'FM99,99,99,990.00');
$$;


-- -----------------------------------------------------------------------------
-- Event triggers
-- -----------------------------------------------------------------------------

-- Activities scheduled: ONE notification per child per batch (repeats would otherwise spam).
create function private.on_activities_scheduled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select student_id, count(*) as n, min(scheduled_date) as first_day, min(title) as title
    from new_rows group by student_id
  loop
    perform private.notify_parents(r.student_id, 'activity',
      case when r.n = 1
        then 'New activity for ' || private.student_first_name(r.student_id) || ': ' || r.title
        else r.n || ' activities scheduled for ' || private.student_first_name(r.student_id) end,
      'From ' || to_char(r.first_day, 'DD Mon YYYY'),
      'activities');
  end loop;
  return null;
end;
$$;
create trigger notify_activities_scheduled after insert on public.student_activities
  referencing new table as new_rows
  for each statement execute function private.on_activities_scheduled();

-- Activity outcome recorded.
create function private.on_activity_outcome()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_parents(new.student_id, 'activity',
    private.student_first_name(new.student_id) || ': ' || new.title || ' ' ||
      case new.status when 'completed' then 'completed'
                      when 'partially_completed' then 'partly done'
                      when 'not_completed' then 'not done'
                      else 'cancelled' end,
    new.staff_remarks, 'activities');
  return null;
end;
$$;
create trigger notify_activity_outcome after update of status, staff_remarks on public.student_activities
  for each row
  when (new.status in ('completed', 'partially_completed', 'not_completed', 'cancelled')
        and (old.status is distinct from new.status or old.staff_remarks is distinct from new.staff_remarks))
  execute function private.on_activity_outcome();

-- Attendance marked or corrected.
create function private.on_attendance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_parents(new.student_id, 'attendance',
    private.student_first_name(new.student_id) || ' marked ' ||
      case new.status when 'present' then 'present' when 'late' then 'late' when 'absent' then 'absent' else 'on leave' end ||
      ' on ' || to_char(new.attendance_date, 'DD Mon'),
    case when new.check_in is not null then 'Arrived ' || to_char(new.check_in, 'HH24:MI') else new.remarks end,
    'attendance');
  return null;
end;
$$;
create trigger notify_attendance_insert after insert on public.attendance
  for each row execute function private.on_attendance();
create trigger notify_attendance_update after update of status on public.attendance
  for each row when (old.status is distinct from new.status)
  execute function private.on_attendance();

-- Progress shared with parents.
create function private.on_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_parents(new.student_id, 'progress',
    'Progress update for ' || private.student_first_name(new.student_id) || ': ' || new.area,
    left(new.observations, 300), 'progress');
  return null;
end;
$$;
create trigger notify_progress_insert after insert on public.progress_updates
  for each row when (new.shared_with_parent)
  execute function private.on_progress();
create trigger notify_progress_shared after update of shared_with_parent on public.progress_updates
  for each row when (new.shared_with_parent and not old.shared_with_parent)
  execute function private.on_progress();

-- Home assignments: new, done by parent, reviewed / sent back.
create function private.on_home_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := private.student_first_name(new.student_id);
begin
  if tg_op = 'INSERT' then
    perform private.notify_parents(new.student_id, 'assignment', 'New home task for ' || v_name || ': ' || new.title,
      case when new.due_date is not null then 'Due ' || to_char(new.due_date, 'DD Mon YYYY') end, 'home-tasks');
  elsif new.status = 'completed' then
    perform private.notify_staff(new.student_id, 'assignment', 'Home task done: ' || new.title || ' (' || v_name || ')',
      'The parent marked it as done. Please review.', 'home-tasks');
  elsif new.status = 'reviewed' then
    perform private.notify_parents(new.student_id, 'assignment', 'Therapist reviewed: ' || new.title,
      new.staff_feedback, 'home-tasks');
  elsif new.status = 'pending' and old.status <> 'pending' then
    perform private.notify_parents(new.student_id, 'assignment', 'Please try again: ' || new.title,
      new.staff_feedback, 'home-tasks');
  end if;
  return null;
end;
$$;
create trigger notify_home_assignment_insert after insert on public.home_assignments
  for each row execute function private.on_home_assignment();
create trigger notify_home_assignment_status after update of status on public.home_assignments
  for each row when (old.status is distinct from new.status)
  execute function private.on_home_assignment();

-- Comments go to "the other side" of the conversation.
create function private.on_home_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_author_role public.app_role;
begin
  select title into v_title from public.home_assignments where id = new.assignment_id;
  select role into v_author_role from public.profiles where id = new.author_id;
  if v_author_role = 'parent' then
    perform private.notify_staff(new.student_id, 'assignment', 'Parent comment on ' || v_title, left(new.body, 300), 'home-tasks');
  else
    perform private.notify_parents(new.student_id, 'assignment', 'New comment on ' || v_title, left(new.body, 300), 'home-tasks');
  end if;
  return null;
end;
$$;
create trigger notify_home_comment after insert on public.home_assignment_comments
  for each row execute function private.on_home_comment();

-- Billing: new fee, payment received.
create function private.on_fee_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify_parents(new.student_id, 'payment',
    'New fee for ' || private.student_first_name(new.student_id) || ': ' || new.title,
    private.money(new.amount - new.discount) || ' due by ' || to_char(new.due_date, 'DD Mon YYYY'), 'fees');
  return null;
end;
$$;
create trigger notify_fee_created after insert on public.fees
  for each row execute function private.on_fee_created();

create function private.on_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance numeric;
begin
  select balance into v_balance from public.fees where id = new.fee_id;
  perform private.notify_parents(new.student_id, 'payment',
    'Payment received: ' || private.money(new.amount),
    'Receipt ' || new.receipt_number || '. ' ||
      case when v_balance > 0 then private.money(v_balance) || ' still pending.' else 'Fully paid, thank you.' end,
    'fees');
  return null;
end;
$$;
create trigger notify_payment after insert on public.payments
  for each row execute function private.on_payment();


-- -----------------------------------------------------------------------------
-- Settings (one row) and reminder log
-- -----------------------------------------------------------------------------
create table public.app_settings (
  id                     smallint primary key default 1 check (id = 1),
  reminders_enabled      boolean not null default true,
  reminder_days_before   smallint not null default 3 check (reminder_days_before between 1 and 30),
  overdue_repeat_days    smallint not null default 7 check (overdue_repeat_days between 1 and 60),
  updated_by             uuid references public.profiles (id) on delete set null,
  updated_at             timestamptz not null default now()
);
insert into public.app_settings (id) values (1);

create trigger app_settings_set_updated_at before update on public.app_settings
  for each row execute function private.set_updated_at();
create trigger audit_app_settings after insert or update or delete on public.app_settings
  for each row execute function private.audit_row_change();

alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;
grant select, update on public.app_settings to authenticated;
create policy app_settings_admin_select on public.app_settings for select to authenticated using ((select private.is_admin()));
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create table public.payment_reminders (
  id          uuid primary key default gen_random_uuid(),
  fee_id      uuid not null references public.fees (id) on delete restrict,
  student_id  uuid not null references public.students (id) on delete restrict,
  kind        text not null check (kind in ('before_due', 'due_today', 'overdue')),
  sent_on     date not null,
  recipients  integer not null default 0,
  created_at  timestamptz not null default now(),
  constraint payment_reminders_once unique (fee_id, kind, sent_on)
);
create index payment_reminders_recent_idx on public.payment_reminders (sent_on desc);

alter table public.payment_reminders enable row level security;
revoke all on public.payment_reminders from anon, authenticated;
grant select on public.payment_reminders to authenticated;
create policy payment_reminders_select on public.payment_reminders for select to authenticated
  using ((select private.is_admin()) or private.is_parent_of(student_id));


-- -----------------------------------------------------------------------------
-- The reminder job
-- -----------------------------------------------------------------------------
create function public.run_payment_reminders(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.app_settings%rowtype;
  f record;
  v_kind text;
  v_title text;
  v_n integer;
  v_sent integer := 0;
  v_first text;
begin
  -- Allowed for the scheduler / server (no user) and for admins only.
  if (select auth.uid()) is not null and not private.is_admin() then
    raise exception 'Only an administrator can run payment reminders' using errcode = '42501';
  end if;

  select * into s from public.app_settings where id = 1;
  if not s.reminders_enabled then
    return 0;
  end if;

  for f in
    select fe.* from public.fees fe
    where fe.status in ('pending', 'partially_paid') and fe.balance > 0
  loop
    v_kind := null;
    if p_today = f.due_date then
      if not exists (select 1 from public.payment_reminders r where r.fee_id = f.id and r.kind = 'due_today') then
        v_kind := 'due_today';
      end if;
    elsif p_today < f.due_date and p_today >= f.due_date - s.reminder_days_before then
      if not exists (select 1 from public.payment_reminders r where r.fee_id = f.id and r.kind = 'before_due') then
        v_kind := 'before_due';
      end if;
    elsif p_today > f.due_date then
      if not exists (
        select 1 from public.payment_reminders r
        where r.fee_id = f.id and r.kind = 'overdue' and r.sent_on > p_today - s.overdue_repeat_days
      ) then
        v_kind := 'overdue';
      end if;
    end if;

    continue when v_kind is null;

    v_first := private.student_first_name(f.student_id);
    v_title := case v_kind
      when 'before_due' then 'Payment reminder: ' || f.title || ' due ' || to_char(f.due_date, 'DD Mon')
      when 'due_today'  then 'Payment due today: ' || f.title
      else 'Payment overdue: ' || f.title
    end;
    v_n := private.notify_parents(f.student_id, 'reminder', v_title,
      private.money(f.balance) || ' pending for ' || v_first ||
        case when v_kind = 'overdue' then ' (due ' || to_char(f.due_date, 'DD Mon YYYY') || ')' else '' end ||
        '. Please pay at the front desk or by UPI.',
      'fees');

    insert into public.payment_reminders (fee_id, student_id, kind, sent_on, recipients)
    values (f.id, f.student_id, v_kind, p_today, v_n)
    on conflict on constraint payment_reminders_once do nothing;
    v_sent := v_sent + 1;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.run_payment_reminders(date) from public, anon;
grant execute on function public.run_payment_reminders(date) to authenticated;

-- Notifications must not reveal the helpers.
revoke all on function private.notify(uuid, text, text, text, text, uuid) from public;
revoke all on function private.notify_parents(uuid, text, text, text, text) from public;
revoke all on function private.notify_staff(uuid, text, text, text, text) from public;


-- -----------------------------------------------------------------------------
-- Daily schedule: 03:30 UTC = 09:00 IST (pg_cron runs in UTC). Supabase only.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('nakshatra-payment-reminders', '30 3 * * *', 'select public.run_payment_reminders()');
  else
    raise notice 'pg_cron not available: schedule public.run_payment_reminders() another way (see docs).';
  end if;
exception when others then
  raise notice 'Could not schedule reminders automatically (%). Enable pg_cron in Supabase and re-run the schedule command from the docs.', sqlerrm;
end;
$$;
