-- =============================================================================
-- STAGE 3 — Daily activities, workouts and attendance
--
--   activities           reusable catalogue (Admin manages; staff pick from it)
--   student_activities   what a child does on a given day + status + staff remarks
--   attendance           one row per child per day
--
-- Access (same pattern for every child-related table):
--   read   : private.can_view_student(student_id)  (admin / assigned staff / own parent)
--   write  : admin or actively assigned staff
--   delete : nobody via the API (cancel instead; history is kept)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Generic helpers for module tables
-- -----------------------------------------------------------------------------

-- Stamps who created / last changed a row, from the verified JWT. Clients cannot fake it.
-- Works for any table that has created_by and updated_by columns.
create function private.stamp_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.updated_by := new.created_by;
  else
    new.created_by := old.created_by;
    new.updated_by := coalesce((select auth.uid()), new.updated_by);
  end if;
  return new;
end;
$$;

-- A record can never be moved to a different child.
create function private.prevent_student_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_id is distinct from old.student_id then
    raise exception 'A record cannot be moved to another student' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- "May the current user record work for this child?"
create function private.can_manage_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or private.is_assigned_staff(p_student_id);
$$;

grant execute on function private.can_manage_student(uuid) to authenticated;


-- -----------------------------------------------------------------------------
-- 1. activities — catalogue
-- -----------------------------------------------------------------------------
create table public.activities (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null check (char_length(btrim(name)) between 1 and 150),
  kind                  text not null default 'activity' check (kind in ('activity', 'workout')),
  category              text check (category is null or char_length(category) <= 60),
  description           text check (description is null or char_length(description) <= 2000),
  default_duration_min  integer check (default_duration_min is null or default_duration_min between 1 and 480),
  is_active             boolean not null default true,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index activities_name_unique_idx on public.activities (lower(name));

create trigger activities_set_updated_at before update on public.activities
  for each row execute function private.set_updated_at();
create trigger activities_stamp_actor before insert or update on public.activities
  for each row execute function private.stamp_actor();


-- -----------------------------------------------------------------------------
-- 2. student_activities — daily activities & workouts per child
-- -----------------------------------------------------------------------------
create table public.student_activities (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students (id) on delete restrict,
  activity_id         uuid references public.activities (id) on delete restrict,
  title               text not null check (char_length(btrim(title)) between 1 and 150),
  kind                text not null default 'activity' check (kind in ('activity', 'workout')),
  category            text check (category is null or char_length(category) <= 60),
  scheduled_date      date not null,
  scheduled_time      time,
  duration_min        integer check (duration_min is null or duration_min between 1 and 480),
  goal                text check (goal is null or char_length(goal) <= 1000),
  status              text not null default 'scheduled'
                        check (status in ('scheduled', 'completed', 'partially_completed', 'not_completed', 'cancelled')),
  performance_rating  smallint check (performance_rating is null or performance_rating between 1 and 5),
  staff_remarks       text check (staff_remarks is null or char_length(staff_remarks) <= 2000),
  completed_at        timestamptz,
  created_by          uuid references public.profiles (id) on delete set null,
  updated_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index student_activities_student_date_idx on public.student_activities (student_id, scheduled_date desc);
create index student_activities_date_idx on public.student_activities (scheduled_date, status);

comment on column public.student_activities.title is 'Copied from the catalogue when chosen, so renaming the catalogue never rewrites history.';

create function private.student_activity_status_time()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('completed', 'partially_completed', 'not_completed') then
    if tg_op = 'INSERT' or old.status is distinct from new.status then
      new.completed_at := now();
    end if;
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger student_activities_set_updated_at before update on public.student_activities
  for each row execute function private.set_updated_at();
create trigger student_activities_stamp_actor before insert or update on public.student_activities
  for each row execute function private.stamp_actor();
create trigger student_activities_no_move before update on public.student_activities
  for each row execute function private.prevent_student_change();
create trigger student_activities_status_time before insert or update on public.student_activities
  for each row execute function private.student_activity_status_time();


-- -----------------------------------------------------------------------------
-- 3. attendance — one row per child per day
-- -----------------------------------------------------------------------------
create table public.attendance (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students (id) on delete restrict,
  attendance_date  date not null,
  status           text not null check (status in ('present', 'absent', 'late', 'leave')),
  check_in         time,
  check_out        time,
  remarks          text check (remarks is null or char_length(remarks) <= 500),
  created_by       uuid references public.profiles (id) on delete set null,
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint attendance_one_per_day unique (student_id, attendance_date),
  constraint attendance_times_valid check (check_out is null or check_in is null or check_out >= check_in),
  constraint attendance_no_times_when_absent check (status not in ('absent', 'leave') or (check_in is null and check_out is null))
);
create index attendance_date_idx on public.attendance (attendance_date, status);

create trigger attendance_set_updated_at before update on public.attendance
  for each row execute function private.set_updated_at();
create trigger attendance_stamp_actor before insert or update on public.attendance
  for each row execute function private.stamp_actor();
create trigger attendance_no_move before update on public.attendance
  for each row execute function private.prevent_student_change();


-- -----------------------------------------------------------------------------
-- Audit history
-- -----------------------------------------------------------------------------
create trigger audit_activities after insert or update or delete on public.activities
  for each row execute function private.audit_row_change();
create trigger audit_student_activities after insert or update or delete on public.student_activities
  for each row execute function private.audit_row_change();
create trigger audit_attendance after insert or update or delete on public.attendance
  for each row execute function private.audit_row_change();


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.activities         enable row level security;
alter table public.student_activities enable row level security;
alter table public.attendance         enable row level security;

revoke all on public.activities, public.student_activities, public.attendance from anon, authenticated;
grant select, insert, update on public.activities         to authenticated;
grant select, insert, update on public.student_activities to authenticated;
grant select, insert, update on public.attendance         to authenticated;

-- Catalogue: admin + staff read; admin writes.
create policy activities_select on public.activities for select to authenticated
  using ((select private.is_admin()) or (select private.is_staff()));
create policy activities_admin_insert on public.activities for insert to authenticated
  with check ((select private.is_admin()));
create policy activities_admin_update on public.activities for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Student activities.
create policy student_activities_select on public.student_activities for select to authenticated
  using (private.can_view_student(student_id));
create policy student_activities_insert on public.student_activities for insert to authenticated
  with check (private.can_manage_student(student_id));
create policy student_activities_update on public.student_activities for update to authenticated
  using (private.can_manage_student(student_id)) with check (private.can_manage_student(student_id));

-- Attendance.
create policy attendance_select on public.attendance for select to authenticated
  using (private.can_view_student(student_id));
create policy attendance_insert on public.attendance for insert to authenticated
  with check (private.can_manage_student(student_id));
create policy attendance_update on public.attendance for update to authenticated
  using (private.can_manage_student(student_id)) with check (private.can_manage_student(student_id));
