-- =============================================================================
-- THE most important guarantee: a parent sees ONLY their own child(ren).
-- =============================================================================

select tests.login_as('9a000000-0000-0000-0000-00000000000a');  -- Parent A

select tests.eq(
  (select array_agg(admission_number order by admission_number) from public.students),
  array['TEST-001', 'TEST-003'], 'Parent A sees exactly their two children');

select tests.eq(
  (select count(*)::int from public.students where id = '5d000000-0000-0000-0000-000000000002'),
  0, 'Parent A cannot read Parent B''s child even by guessing the id');

select tests.eq(
  (select count(*)::int from public.student_parents where student_id = '5d000000-0000-0000-0000-000000000002'),
  0, 'Parent A cannot see Parent B''s child links');

select tests.eq(
  (select array_agg(full_name) from public.parents),
  array['Parent A'], 'Parent A sees only their own parent record');

select tests.eq(
  (select count(*)::int from public.student_staff_assignments where student_id = '5d000000-0000-0000-0000-000000000002'),
  0, 'Parent A cannot see therapist assignments of another child');

select tests.ok(
  (select count(*) from public.student_staff_assignments) > 0,
  'Parent A can see therapist assignments for their own children');

select tests.eq(
  (select count(*)::int from public.staff_details), 0, 'parents cannot read staff HR details');

-- ---- attacks ---------------------------------------------------------------
select tests.throws(
  $$insert into public.student_parents (student_id, parent_id, relationship)
    values ('5d000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-00000000000a', 'mother')$$,
  'Parent A CANNOT link themselves to Parent B''s child', '42501');

select tests.eq(
  tests.rows_affected($$update public.parents set profile_id = '9a000000-0000-0000-0000-00000000000a'
                        where id = 'fa000000-0000-0000-0000-00000000000c'$$),
  0, 'Parent A cannot take over another guardian record');

select tests.eq(
  tests.rows_affected($$update public.student_parents set student_id = '5d000000-0000-0000-0000-000000000002'
                        where parent_id = 'fa000000-0000-0000-0000-00000000000a'$$),
  0, 'Parent A cannot re-point their own link to another child');

select tests.eq(
  tests.rows_affected($$update public.students set full_name = 'changed' where id = '5d000000-0000-0000-0000-000000000001'$$),
  0, 'parent cannot edit even their own child''s student record');

select tests.throws(
  $$insert into public.students (admission_number, full_name) values ('X-1', 'Fake child')$$,
  'parent cannot create students', '42501');

select tests.throws(
  $$delete from public.students where id = '5d000000-0000-0000-0000-000000000001'$$,
  'nobody (via API role) can hard-delete students', '42501');

select tests.ok(
  not private.can_view_student('5d000000-0000-0000-0000-000000000002'),
  'helper can_view_student() is false for another family''s child');

select tests.logout();

-- ---- and the mirror image -------------------------------------------------
select tests.login_as('9a000000-0000-0000-0000-00000000000b');  -- Parent B
select tests.eq(
  (select array_agg(admission_number) from public.students),
  array['TEST-002'], 'Parent B sees only their own child');
select tests.logout();

-- ---- a parent login with no linked child sees nothing ----------------------
select tests.login_as('e0000000-0000-0000-0000-000000000001');
select tests.eq((select count(*)::int from public.students), 0, 'unlinked parent account sees no students');
select tests.eq((select count(*)::int from public.parents),  0, 'unlinked parent account sees no parent records');
select tests.logout();
