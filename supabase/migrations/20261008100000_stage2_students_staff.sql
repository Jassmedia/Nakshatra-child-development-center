-- =============================================================================
-- STAGE 2 — Student & staff management
--
-- The tables (students, parents, student_parents, staff_details,
-- student_staff_assignments) exist since the foundation migration. This adds:
--   1. automatic admission numbers (NCDC-<year>-<0001>) when none is entered
--   2. extra student profile fields used by the student form
--   3. indexes for search
-- =============================================================================

-- 1. Admission numbers ----------------------------------------------------------
create sequence public.student_admission_seq;
-- Only the trigger (SECURITY DEFINER) uses it.
revoke all on sequence public.student_admission_seq from anon, authenticated;

create function private.assign_admission_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.admission_number is null or btrim(new.admission_number) = '' then
    new.admission_number := 'NCDC-' || to_char(coalesce(new.enrollment_date, current_date), 'YYYY') || '-'
      || lpad(nextval('public.student_admission_seq')::text, 4, '0');
  else
    new.admission_number := upper(btrim(new.admission_number));
  end if;
  return new;
end;
$$;

create trigger students_assign_admission_number
  before insert on public.students
  for each row execute function private.assign_admission_number();

-- 2. More profile fields ---------------------------------------------------------
alter table public.students
  add column school_name   text check (school_name is null or char_length(school_name) <= 200),
  add column address       text check (address is null or char_length(address) <= 500),
  add column blood_group   text check (blood_group is null or blood_group in ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  add column notes         text check (notes is null or char_length(notes) <= 2000);

comment on column public.students.notes is 'General notes about the child, visible to admin, assigned staff and the child''s parents.';

-- 3. Search indexes ------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;
create index students_full_name_trgm_idx on public.students using gin (full_name extensions.gin_trgm_ops);
create index parents_full_name_trgm_idx on public.parents using gin (full_name extensions.gin_trgm_ops);
create index parents_profile_idx on public.parents (profile_id);

-- 4. Ending an assignment takes effect immediately ------------------------------
-- ends_on is now EXCLUSIVE: the assignment is active while
--   starts_on <= today < ends_on   (or ends_on is null).
-- So "End assignment" (ends_on = today) removes access at once, and an assignment
-- that never started can be closed with ends_on = starts_on (active zero days).
create or replace function private.is_assigned_staff(p_student_id uuid)
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
         and (a.ends_on is null or a.ends_on > current_date)
     );
$$;

comment on column public.student_staff_assignments.ends_on is
  'Day the assignment ended (exclusive): access stops at the start of this day. NULL = ongoing.';
