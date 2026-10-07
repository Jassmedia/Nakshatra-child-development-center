-- =============================================================================
-- Staff / therapists see only ACTIVELY assigned students.
-- =============================================================================

select tests.login_as('51000000-0000-0000-0000-000000000001');  -- Staff One

select tests.eq(
  (select array_agg(admission_number) from public.students),
  array['TEST-001'], 'staff sees only actively assigned student (ended assignment hidden)');

select tests.eq(
  (select array_agg(full_name) from public.parents),
  array['Parent A'], 'staff sees parents of assigned students only');

select tests.eq(
  (select count(*)::int from public.student_staff_assignments),
  2, 'staff sees own assignment history (active + ended)');

select tests.ok(
  (select count(*) from public.profiles where role = 'parent') = 0,
  'staff cannot read parent login profiles');

select tests.ok(
  (select count(*) from public.profiles where role in ('staff', 'admin')) >= 3,
  'staff can see colleague names');

select tests.throws(
  $$insert into public.student_staff_assignments (student_id, staff_id)
    values ('5d000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000001')$$,
  'staff CANNOT assign themselves to another student', '42501');

select tests.eq(
  tests.rows_affected($$update public.student_staff_assignments set ends_on = null
                        where student_id = '5d000000-0000-0000-0000-000000000003'$$),
  0, 'staff cannot re-open their ended assignment');

select tests.throws(
  $$insert into public.students (admission_number, full_name) values ('X-2', 'Fake')$$,
  'staff cannot create students (admin function)', '42501');

select tests.logout();

select tests.login_as('51000000-0000-0000-0000-000000000004');  -- Staff Four (future assignment)
select tests.eq((select count(*)::int from public.students), 0,
  'assignment that starts in the future does not grant access yet');
select tests.logout();
