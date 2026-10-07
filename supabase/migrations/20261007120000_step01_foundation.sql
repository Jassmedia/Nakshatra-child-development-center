-- =============================================================================
-- STEP 1 — FOUNDATION MIGRATION
-- Nakshatra Child Development Center
--
-- What this migration creates (the "access graph" every later module hangs on):
--   1. app_role enum + `private` schema for security helpers
--   2. profiles            one row per login (admin / staff / parent)
--   3. staff_details       staff-only extra information
--   4. parents             parent/guardian contact records (login optional)
--   5. students            the children (no login)
--   6. student_parents     which parent belongs to which child
--   7. student_staff_assignments  which therapist works with which child (with history)
--   8. audit_log           who changed what, when (complete history)
--   9. Row Level Security on every table above
--
-- Module tables (activities, attendance, billing, ...) are NOT created here.
-- Each later step adds its own migration. See docs/PROJECT_DOCUMENTATION.md.
--
-- Golden rules used throughout:
--   * Authorization lives in the database (RLS). The UI only hides things.
--   * Roles are read from public.profiles, NEVER from user-editable JWT metadata.
--   * Records with history are never hard-deleted; they are ended/deactivated.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Types and schemas
-- -----------------------------------------------------------------------------

-- The only three roles that can log in. Students have no login.
create type public.app_role as enum ('admin', 'staff', 'parent');

-- `private` is NOT exposed through the Supabase REST API, so helper functions
-- placed here can be used by RLS policies but cannot be called directly by clients.
create schema if not exists private;


-- -----------------------------------------------------------------------------
-- 2. Generic trigger functions
-- -----------------------------------------------------------------------------

-- Keeps `updated_at` correct without relying on the application to set it.
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- -----------------------------------------------------------------------------
-- 3. profiles — one row per authenticated user
-- -----------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'parent',
  full_name   text not null default '' check (char_length(full_name) <= 200),
  email       text check (email is null or char_length(email) <= 320),
  phone       text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One row per login. role is the single source of truth for authorization. Never hard-delete: set is_active = false.';

create index profiles_role_idx on public.profiles (role) where is_active;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();


-- -----------------------------------------------------------------------------
-- 4. staff_details — information that only applies to staff/therapists
-- -----------------------------------------------------------------------------

create table public.staff_details (
  profile_id      uuid primary key references public.profiles (id) on delete cascade,
  designation     text check (designation is null or char_length(designation) <= 120),   -- e.g. 'Speech Therapist'
  specialization  text check (specialization is null or char_length(specialization) <= 200),
  qualification   text check (qualification is null or char_length(qualification) <= 200),
  joined_on       date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger staff_details_set_updated_at
  before update on public.staff_details
  for each row execute function private.set_updated_at();


-- -----------------------------------------------------------------------------
-- 5. parents — parent/guardian contact records
--    A parent record can exist BEFORE (or without) a login. When the parent is
--    invited, profile_id links the record to their profile.
-- -----------------------------------------------------------------------------

create table public.parents (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid unique references public.profiles (id) on delete set null,
  full_name        text not null check (char_length(btrim(full_name)) between 1 and 200),
  phone            text check (phone is null or phone ~ '^\+?[0-9 ()-]{7,20}$'),
  alternate_phone  text check (alternate_phone is null or alternate_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  email            text check (email is null or char_length(email) <= 320),
  address          text check (address is null or char_length(address) <= 500),
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- We must be able to reach a parent (payment reminders, notifications).
  constraint parents_contact_required check (phone is not null or email is not null)
);

create trigger parents_set_updated_at
  before update on public.parents
  for each row execute function private.set_updated_at();


-- -----------------------------------------------------------------------------
-- 6. students — the children. No login.
--    IMPORTANT: RLS works per ROW, not per column. Anything a parent must not
--    see (e.g. internal staff notes) must live in a separate table, not here.
-- -----------------------------------------------------------------------------

create table public.students (
  id                uuid primary key default gen_random_uuid(),
  admission_number  text not null unique check (char_length(btrim(admission_number)) between 1 and 40),
  full_name         text not null check (char_length(btrim(full_name)) between 1 and 200),
  date_of_birth     date,
  gender            text check (gender in ('male', 'female', 'other')),
  diagnosis         text check (diagnosis is null or char_length(diagnosis) <= 2000),
  medical_notes     text check (medical_notes is null or char_length(medical_notes) <= 4000), -- allergies, medication
  enrollment_date   date not null default current_date,
  status            text not null default 'active' check (status in ('active', 'on_hold', 'discharged')),
  discharged_on     date,
  photo_path        text,  -- object path inside a PRIVATE Supabase Storage bucket (Step 3)
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint students_discharge_consistent
    check ((status = 'discharged') = (discharged_on is not null)),
  constraint students_discharge_after_enrollment
    check (discharged_on is null or discharged_on >= enrollment_date)
);

create index students_status_idx on public.students (status);

create trigger students_set_updated_at
  before update on public.students
  for each row execute function private.set_updated_at();


-- -----------------------------------------------------------------------------
-- 7. student_parents — many-to-many: a child can have several parents/guardians,
--    and a parent can have several children (siblings).
-- -----------------------------------------------------------------------------

create table public.student_parents (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students (id) on delete restrict,
  parent_id           uuid not null references public.parents (id) on delete restrict,
  relationship        text not null check (relationship in ('mother', 'father', 'guardian', 'other')),
  is_primary_contact  boolean not null default false,
  created_at          timestamptz not null default now(),
  constraint student_parents_unique unique (student_id, parent_id)
);

create index student_parents_parent_idx on public.student_parents (parent_id);
-- At most one primary contact per child.
create unique index student_parents_one_primary_idx
  on public.student_parents (student_id) where is_primary_contact;


-- -----------------------------------------------------------------------------
-- 8. student_staff_assignments — which therapist works with which child.
--    History is kept: to end an assignment set ends_on, never delete the row.
--    An assignment is ACTIVE when starts_on <= today <= coalesce(ends_on, today).
-- -----------------------------------------------------------------------------

create table public.student_staff_assignments (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students (id) on delete restrict,
  staff_id         uuid not null references public.profiles (id) on delete restrict,
  assignment_role  text check (assignment_role is null or char_length(assignment_role) <= 120), -- e.g. 'Primary therapist'
  starts_on        date not null default current_date,
  ends_on          date,
  notes            text check (notes is null or char_length(notes) <= 1000),
  assigned_by      uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint ssa_dates_valid check (ends_on is null or ends_on >= starts_on)
);

create index ssa_student_idx on public.student_staff_assignments (student_id);
create index ssa_staff_idx on public.student_staff_assignments (staff_id);
-- A therapist cannot have two open-ended assignments to the same child.
create unique index ssa_one_open_assignment_idx
  on public.student_staff_assignments (student_id, staff_id) where ends_on is null;

create trigger ssa_set_updated_at
  before update on public.student_staff_assignments
  for each row execute function private.set_updated_at();


-- -----------------------------------------------------------------------------
-- 9. audit_log — append-only change history (written only by triggers)
-- -----------------------------------------------------------------------------

create table public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text not null,
  record_id   text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by  uuid,          -- auth.uid() of the actor; NULL = system / service role / SQL console
  changed_at  timestamptz not null default now(),
  old_data    jsonb,
  new_data    jsonb
);

create index audit_log_record_idx on public.audit_log (table_name, record_id);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);


-- =============================================================================
-- SECURITY HELPERS
-- These are SECURITY DEFINER: they run with the privileges of their owner, so
-- they can read profiles/assignments without triggering RLS recursion.
-- They only ever answer questions about the CURRENT user (auth.uid()).
-- `set search_path = ''` prevents search-path hijacking.
-- =============================================================================

-- Role of the current user, or NULL if not logged in / no profile / deactivated.
create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.is_active;
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false);
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'staff', false);
$$;

-- TRUE when the current user is an active staff member with an ACTIVE assignment to the student.
create function private.is_assigned_staff(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_staff()
     and exists (
       select 1
       from public.student_staff_assignments a
       where a.student_id = p_student_id
         and a.staff_id = (select auth.uid())
         and a.starts_on <= current_date
         and (a.ends_on is null or a.ends_on >= current_date)
     );
$$;

-- TRUE when the current user is an active parent linked to the student.
-- This is THE check that stops one parent from seeing another parent's child.
create function private.is_parent_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'parent', false)
     and exists (
       select 1
       from public.student_parents sp
       join public.parents pa on pa.id = sp.parent_id
       where sp.student_id = p_student_id
         and pa.profile_id = (select auth.uid())
     );
$$;

-- The one function later modules should use for "may the current user see this child's records?"
create function private.can_view_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
      or private.is_assigned_staff(p_student_id)
      or private.is_parent_of(p_student_id);
$$;

-- Staff may see the parent record of a child they are actively assigned to.
create function private.staff_can_view_parent(p_parent_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_staff()
     and exists (
       select 1
       from public.student_parents sp
       where sp.parent_id = p_parent_id
         and private.is_assigned_staff(sp.student_id)
     );
$$;

-- Lock the helpers down: only logged-in users may execute them (needed by RLS).
revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function
  private.current_app_role(),
  private.is_admin(),
  private.is_staff(),
  private.is_assigned_staff(uuid),
  private.is_parent_of(uuid),
  private.can_view_student(uuid),
  private.staff_can_view_parent(uuid)
to authenticated;


-- =============================================================================
-- INTEGRITY TRIGGERS
-- =============================================================================

-- Ensures a column points at a profile with the expected role.
-- Usage: execute function private.assert_profile_role('<column>', '<role>')
create function private.assert_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  v_role public.app_role := tg_argv[1]::public.app_role;
begin
  if v_profile_id is not null and not exists (
    select 1 from public.profiles p where p.id = v_profile_id and p.role = v_role
  ) then
    raise exception '%.% must reference a profile with role %', tg_table_name, tg_argv[0], v_role
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger staff_details_profile_is_staff
  before insert or update of profile_id on public.staff_details
  for each row execute function private.assert_profile_role('profile_id', 'staff');

create trigger parents_profile_is_parent
  before insert or update of profile_id on public.parents
  for each row execute function private.assert_profile_role('profile_id', 'parent');

create trigger ssa_staff_is_staff
  before insert or update of staff_id on public.student_staff_assignments
  for each row execute function private.assert_profile_role('staff_id', 'staff');


-- Stops privilege escalation on profiles:
--   * only an Admin (or the system/service role, where auth.uid() is NULL) may change role / is_active / email
--   * the last active Admin can never be demoted or deactivated (prevents lock-out)
create function private.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role
      or new.is_active is distinct from old.is_active
      or new.email is distinct from old.email
      or new.id is distinct from old.id)
     and (select auth.uid()) is not null
     and not private.is_admin()
  then
    raise exception 'Only an administrator can change role, active status or email'
      using errcode = '42501';
  end if;

  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or not new.is_active)
     and not exists (
       select 1 from public.profiles p
       where p.role = 'admin' and p.is_active and p.id <> old.id
     )
  then
    raise exception 'Cannot demote or deactivate the last active administrator'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function private.protect_profile_columns();


-- Generic audit trigger: records every change to important tables.
create function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;

  insert into public.audit_log (table_name, record_id, action, changed_by, old_data, new_data)
  values (
    tg_table_name,
    coalesce(coalesce(v_new, v_old) ->> 'id', coalesce(v_new, v_old) ->> 'profile_id'),
    tg_op,
    (select auth.uid()),
    v_old,
    v_new
  );
  return null;  -- AFTER trigger: return value is ignored
end;
$$;

create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function private.audit_row_change();
create trigger audit_staff_details after insert or update or delete on public.staff_details
  for each row execute function private.audit_row_change();
create trigger audit_parents after insert or update or delete on public.parents
  for each row execute function private.audit_row_change();
create trigger audit_students after insert or update or delete on public.students
  for each row execute function private.audit_row_change();
create trigger audit_student_parents after insert or update or delete on public.student_parents
  for each row execute function private.audit_row_change();
create trigger audit_student_staff_assignments after insert or update or delete on public.student_staff_assignments
  for each row execute function private.audit_row_change();


-- =============================================================================
-- AUTH INTEGRATION — create / sync a profile for every Supabase Auth user
-- =============================================================================

-- The role comes from raw_APP_meta_data, which only the service role (server)
-- can set. raw_USER_meta_data is editable by the user, so it is only used for
-- the display name. Missing/invalid role => 'parent' with no linked children,
-- which can see nothing.
create function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  begin
    v_role := coalesce((new.raw_app_meta_data ->> 'role')::public.app_role, 'parent');
  exception when invalid_text_representation then
    v_role := 'parent';
  end;

  insert into public.profiles (id, role, full_name, email)
  values (
    new.id,
    v_role,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 200),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_auth_user();

-- Keep profiles.email in sync when a user changes their login email.
create function private.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function private.handle_auth_user_email_change();


-- =============================================================================
-- ROW LEVEL SECURITY
-- Pattern: `(select private.fn())` lets Postgres evaluate the helper once per
-- query instead of once per row.
-- No policy for an action = that action is denied.
-- =============================================================================

alter table public.profiles                  enable row level security;
alter table public.staff_details             enable row level security;
alter table public.parents                   enable row level security;
alter table public.students                  enable row level security;
alter table public.student_parents           enable row level security;
alter table public.student_staff_assignments enable row level security;
alter table public.audit_log                 enable row level security;

-- Table privileges (defense in depth on top of RLS):
-- anonymous visitors get nothing; logged-in users get only the verbs they need.
revoke all on
  public.profiles, public.staff_details, public.parents, public.students,
  public.student_parents, public.student_staff_assignments, public.audit_log
from anon, authenticated;

grant select, update                 on public.profiles                  to authenticated;
grant select, insert, update, delete on public.staff_details             to authenticated;
grant select, insert, update, delete on public.parents                   to authenticated;
grant select, insert, update         on public.students                  to authenticated;
grant select, insert, update, delete on public.student_parents           to authenticated;
grant select, insert, update         on public.student_staff_assignments to authenticated;
grant select                         on public.audit_log                 to authenticated;


-- ---- profiles ---------------------------------------------------------------
-- Everyone sees their own profile. Admin sees all. Staff see colleagues
-- (staff/admin) so names can be shown on records. Parents do NOT read staff
-- profiles directly (phone/email privacy); Step 7 adds a names-only view.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or (select private.is_admin())
    or ((select private.is_staff()) and role in ('admin', 'staff'))
  );

-- Users may edit their own name/phone; protect_profile_columns blocks role changes.
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));
-- No INSERT policy: profiles are created by the auth trigger.
-- No DELETE policy: deactivate instead.


-- ---- staff_details ----------------------------------------------------------
create policy staff_details_select on public.staff_details
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

create policy staff_details_admin_insert on public.staff_details
  for insert to authenticated with check ((select private.is_admin()));
create policy staff_details_admin_update on public.staff_details
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy staff_details_admin_delete on public.staff_details
  for delete to authenticated using ((select private.is_admin()));


-- ---- parents ----------------------------------------------------------------
create policy parents_select on public.parents
  for select to authenticated
  using (
    (select private.is_admin())
    or profile_id = (select auth.uid())
    or private.staff_can_view_parent(id)
  );

create policy parents_admin_insert on public.parents
  for insert to authenticated with check ((select private.is_admin()));
create policy parents_admin_update on public.parents
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- Delete only succeeds if the parent is not linked to any child (FK restrict).
create policy parents_admin_delete on public.parents
  for delete to authenticated using ((select private.is_admin()));


-- ---- students ---------------------------------------------------------------
create policy students_select on public.students
  for select to authenticated
  using (private.can_view_student(id));

create policy students_admin_insert on public.students
  for insert to authenticated with check ((select private.is_admin()));
create policy students_admin_update on public.students
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- No DELETE policy: students are discharged (status), never deleted — history must survive.


-- ---- student_parents --------------------------------------------------------
create policy student_parents_select on public.student_parents
  for select to authenticated
  using (private.can_view_student(student_id));

-- Only Admin can link/unlink. A parent can NEVER link themselves to another child.
create policy student_parents_admin_insert on public.student_parents
  for insert to authenticated with check ((select private.is_admin()));
create policy student_parents_admin_update on public.student_parents
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy student_parents_admin_delete on public.student_parents
  for delete to authenticated using ((select private.is_admin()));


-- ---- student_staff_assignments ---------------------------------------------
-- Staff see their own assignments (including ended ones = their history).
-- Parents see assignments for their own children.
create policy ssa_select on public.student_staff_assignments
  for select to authenticated
  using (
    (select private.is_admin())
    or (staff_id = (select auth.uid()) and (select private.is_staff()))
    or private.is_parent_of(student_id)
  );

create policy ssa_admin_insert on public.student_staff_assignments
  for insert to authenticated with check ((select private.is_admin()));
create policy ssa_admin_update on public.student_staff_assignments
  for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
-- No DELETE policy: end the assignment (ends_on) to keep history.


-- ---- audit_log --------------------------------------------------------------
create policy audit_log_admin_select on public.audit_log
  for select to authenticated using ((select private.is_admin()));
-- No write policies: only the audit trigger (SECURITY DEFINER) writes here.
