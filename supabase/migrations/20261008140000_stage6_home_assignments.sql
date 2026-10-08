-- =============================================================================
-- STAGE 6 — Home assignments
--
--   home_assignments          a task for the parent to do at home with the child
--                             status: pending -> completed (by parent) -> reviewed (by staff)
--   home_assignment_comments  append-only conversation (parent comments, staff replies)
--
-- Who can do what:
--   admin / assigned staff : create, edit, review, send back, comment
--   parent of the child    : read, mark as done (RPC only), comment
--   others                 : nothing
-- Parents get NO update grant on home_assignments: the only change they can make
-- is through public.complete_home_assignment(), which checks everything itself.
-- =============================================================================

create table public.home_assignments (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students (id) on delete restrict,
  title           text not null check (char_length(btrim(title)) between 1 and 150),
  instructions    text check (instructions is null or char_length(instructions) <= 4000),
  assigned_on     date not null default current_date,
  due_date        date,
  status          text not null default 'pending' check (status in ('pending', 'completed', 'reviewed')),
  completed_at    timestamptz,
  completed_by    uuid references public.profiles (id) on delete set null,
  staff_feedback  text check (staff_feedback is null or char_length(staff_feedback) <= 4000),
  reviewed_at     timestamptz,
  reviewed_by     uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint home_assignments_due_after_assigned check (due_date is null or due_date >= assigned_on)
);

create index home_assignments_student_idx on public.home_assignments (student_id, status, due_date);
create index home_assignments_status_idx on public.home_assignments (status, due_date);

-- Keeps the completion / review stamps consistent with the status.
create function private.home_assignment_status_stamps()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'pending' then
      -- Sent back to the parent: clear the completion, keep the conversation.
      new.completed_at := null;
      new.completed_by := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
    elsif new.status = 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
      new.reviewed_at := null;
      new.reviewed_by := null;
    elsif new.status = 'reviewed' then
      new.reviewed_at := now();
      new.reviewed_by := coalesce((select auth.uid()), new.reviewed_by);
    end if;
  end if;
  return new;
end;
$$;

create trigger home_assignments_set_updated_at before update on public.home_assignments
  for each row execute function private.set_updated_at();
create trigger home_assignments_stamp_actor before insert or update on public.home_assignments
  for each row execute function private.stamp_actor();
create trigger home_assignments_no_move before update on public.home_assignments
  for each row execute function private.prevent_student_change();
create trigger home_assignments_status_stamps before update on public.home_assignments
  for each row execute function private.home_assignment_status_stamps();
create trigger audit_home_assignments after insert or update or delete on public.home_assignments
  for each row execute function private.audit_row_change();


create table public.home_assignment_comments (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid not null references public.home_assignments (id) on delete restrict,
  student_id     uuid not null references public.students (id) on delete restrict,
  author_id      uuid references public.profiles (id) on delete set null,
  body           text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at     timestamptz not null default now()
);
create index hac_assignment_idx on public.home_assignment_comments (assignment_id, created_at);

-- student_id is copied from the assignment and author_id from the login: neither can be faked.
create function private.home_comment_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select a.student_id into new.student_id from public.home_assignments a where a.id = new.assignment_id;
  if new.student_id is null then
    raise exception 'Assignment not found' using errcode = '23503';
  end if;
  new.author_id := coalesce((select auth.uid()), new.author_id);
  new.created_at := now();
  return new;
end;
$$;

create trigger home_comments_defaults before insert on public.home_assignment_comments
  for each row execute function private.home_comment_defaults();
create trigger audit_home_assignment_comments after insert or update or delete on public.home_assignment_comments
  for each row execute function private.audit_row_change();


-- -----------------------------------------------------------------------------
-- Parent action: mark an assignment as done (optionally with a comment).
-- -----------------------------------------------------------------------------
create function public.complete_home_assignment(p_assignment_id uuid, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
  v_status text;
begin
  select student_id, status into v_student, v_status
  from public.home_assignments where id = p_assignment_id;

  if v_student is null or not private.is_parent_of(v_student) then
    raise exception 'Assignment not found' using errcode = '42501';
  end if;
  if v_status <> 'pending' then
    raise exception 'This assignment is already marked as done' using errcode = 'P0001';
  end if;
  if p_comment is not null and char_length(p_comment) > 2000 then
    raise exception 'Comment is too long (2000 characters max)' using errcode = 'P0001';
  end if;

  update public.home_assignments
     set status = 'completed', completed_at = now(), completed_by = (select auth.uid())
   where id = p_assignment_id;

  if p_comment is not null and btrim(p_comment) <> '' then
    insert into public.home_assignment_comments (assignment_id, student_id, body)
    values (p_assignment_id, v_student, btrim(p_comment));
  end if;
end;
$$;

revoke all on function public.complete_home_assignment(uuid, text) from public, anon;
grant execute on function public.complete_home_assignment(uuid, text) to authenticated;


-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.home_assignments         enable row level security;
alter table public.home_assignment_comments enable row level security;

revoke all on public.home_assignments, public.home_assignment_comments from anon, authenticated;
grant select, insert, update on public.home_assignments to authenticated;
grant select, insert         on public.home_assignment_comments to authenticated;

create policy home_assignments_select on public.home_assignments for select to authenticated
  using (private.can_view_student(student_id));
create policy home_assignments_insert on public.home_assignments for insert to authenticated
  with check (private.can_manage_student(student_id));
create policy home_assignments_update on public.home_assignments for update to authenticated
  using (private.can_manage_student(student_id)) with check (private.can_manage_student(student_id));

create policy home_comments_select on public.home_assignment_comments for select to authenticated
  using (private.can_view_student(student_id));
-- Anyone who can see the child (own parent, assigned staff, admin) may add to the conversation.
create policy home_comments_insert on public.home_assignment_comments for insert to authenticated
  with check (private.can_view_student(student_id));
