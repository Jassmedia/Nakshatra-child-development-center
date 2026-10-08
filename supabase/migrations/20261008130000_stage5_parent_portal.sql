-- =============================================================================
-- STAGE 5 — Parent portal
--
-- Parents must see WHO works with their child and who wrote a remark, but not
-- staff phone numbers or emails. RLS is per row, not per column, so instead of
-- opening public.profiles to parents we expose two narrow, names-only functions.
-- =============================================================================

-- Names (and designation) of active staff/admins, for showing "by Meera Iyer".
-- Any logged-in, active user may call it; it never returns contact details.
create function public.get_staff_names()
returns table (id uuid, full_name text, designation text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, sd.designation
  from public.profiles p
  left join public.staff_details sd on sd.profile_id = p.id
  where p.role in ('staff', 'admin')
    and private.current_app_role() is not null;
$$;

-- Therapists currently assigned to a child the caller may view.
create function public.get_student_therapists(p_student_id uuid)
returns table (staff_id uuid, full_name text, designation text, assignment_role text, starts_on date)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.full_name, sd.designation, a.assignment_role, a.starts_on
  from public.student_staff_assignments a
  join public.profiles p on p.id = a.staff_id and p.is_active
  left join public.staff_details sd on sd.profile_id = p.id
  where a.student_id = p_student_id
    and private.can_view_student(p_student_id)
    and a.starts_on <= current_date
    and (a.ends_on is null or a.ends_on > current_date)
  order by a.starts_on;
$$;

revoke all on function public.get_staff_names() from public, anon;
revoke all on function public.get_student_therapists(uuid) from public, anon;
grant execute on function public.get_staff_names() to authenticated;
grant execute on function public.get_student_therapists(uuid) to authenticated;
