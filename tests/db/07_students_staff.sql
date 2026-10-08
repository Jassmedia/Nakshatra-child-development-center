-- =============================================================================
-- Stage 2: student & staff management rules.
-- =============================================================================
select tests.logout();

-- Admission numbers are generated when left empty, and normalised when typed.
select tests.login_as('a1000000-0000-0000-0000-000000000001');
insert into public.students (id, admission_number, full_name) values
  ('5d000000-0000-0000-0000-0000000000a1', '', 'Auto Number'),
  ('5d000000-0000-0000-0000-0000000000a2', '  ncdc-x-9 ', 'Typed Number');
select tests.ok((select admission_number from public.students where id = '5d000000-0000-0000-0000-0000000000a1') ~ '^NCDC-[0-9]{4}-[0-9]{4}$',
  'empty admission number gets NCDC-YYYY-NNNN');
select tests.eq((select admission_number from public.students where id = '5d000000-0000-0000-0000-0000000000a2'),
  'NCDC-X-9', 'typed admission number is trimmed and upper-cased');
select tests.throws($$ insert into public.students (admission_number, full_name) values ('ncdc-x-9', 'Dup') $$,
  'duplicate admission number (any case) is rejected', '23505');
select tests.throws($$ update public.students set blood_group = 'Z+' where id = '5d000000-0000-0000-0000-0000000000a1' $$,
  'invalid blood group is rejected', '23514');
select tests.logout();

-- Staff cannot edit student records or parent links, even for assigned students.
select tests.login_as('51000000-0000-0000-0000-000000000001');
select tests.eq(tests.rows_affected($$ update public.students set notes = 'x' where id = '5d000000-0000-0000-0000-000000000001' $$),
  0, 'assigned staff cannot edit the student record');
select tests.throws($$ insert into public.student_parents (student_id, parent_id, relationship) values
  ('5d000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-00000000000c', 'other') $$,
  'staff cannot link parents', '42501');
-- Staff can read parent contacts of assigned students only.
select tests.eq((select count(*)::int from public.parents where id = 'fa000000-0000-0000-0000-00000000000a'), 1,
  'staff sees parent of an assigned student');
select tests.eq((select count(*)::int from public.parents where id = 'fa000000-0000-0000-0000-00000000000b'), 0,
  'staff cannot see parent of an unassigned student');
select tests.logout();

-- Parents cannot see the sequence-based numbering internals or create students.
select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select tests.throws($$ insert into public.students (admission_number, full_name) values ('', 'Hack') $$,
  'parent cannot create a student', '42501');
select tests.throws($$ select nextval('public.student_admission_seq') $$,
  'parent cannot use the admission sequence directly', '42501');
select tests.logout();

-- An assignment ended TODAY gives no access today (ends_on is exclusive).
insert into public.student_staff_assignments (student_id, staff_id, starts_on, ends_on)
  values ('5d000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000004', current_date - 5, current_date);
-- ...while an assignment ending tomorrow still does.
insert into public.student_staff_assignments (student_id, staff_id, starts_on, ends_on)
  values ('5d000000-0000-0000-0000-0000000000a1', '51000000-0000-0000-0000-000000000004', current_date - 5, current_date + 1);
select tests.login_as('51000000-0000-0000-0000-000000000004');
select tests.eq((select count(*)::int from public.students where id = '5d000000-0000-0000-0000-000000000003'), 0,
  'assignment ended today removes access immediately');
select tests.eq((select count(*)::int from public.students where id = '5d000000-0000-0000-0000-0000000000a1'), 1,
  'assignment ending tomorrow still grants access today');
select tests.logout();
