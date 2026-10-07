-- =============================================================================
-- Admin capabilities, data integrity and history.
-- =============================================================================

select tests.login_as('a1000000-0000-0000-0000-000000000001');  -- Admin

select tests.eq((select count(*)::int from public.students), 3, 'admin sees all students');
select tests.eq((select count(*)::int from public.parents),  3, 'admin sees all parent records (incl. no-login contacts)');

insert into public.students (id, admission_number, full_name)
values ('5d000000-0000-0000-0000-000000000009', 'TEST-009', 'New Student');
select tests.ok(true, 'admin can create a student');

select tests.eq(
  tests.rows_affected($$update public.students set status = 'discharged', discharged_on = current_date
                        where id = '5d000000-0000-0000-0000-000000000009'$$),
  1, 'admin can discharge a student');

select tests.throws(
  $$update public.students set status = 'discharged' where id = '5d000000-0000-0000-0000-000000000001'$$,
  'discharged status requires a discharge date', '23514');

select tests.throws(
  $$insert into public.student_staff_assignments (student_id, staff_id)
    values ('5d000000-0000-0000-0000-000000000001', '9a000000-0000-0000-0000-00000000000a')$$,
  'a PARENT profile cannot be assigned as a therapist', '23514');

select tests.throws(
  $$insert into public.parents (profile_id, full_name, phone)
    values ('51000000-0000-0000-0000-000000000002', 'Wrong', '+91 90000 00009')$$,
  'a STAFF profile cannot be linked as a parent record', '23514');

select tests.throws(
  $$insert into public.student_staff_assignments (student_id, staff_id)
    values ('5d000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001')$$,
  'duplicate open assignment (same student + therapist) is rejected', '23505');

select tests.throws(
  $$insert into public.parents (full_name) values ('No Contact')$$,
  'parent record requires a phone or email', '23514');

select tests.throws(
  $$insert into public.student_parents (student_id, parent_id, relationship, is_primary_contact)
    values ('5d000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-00000000000a', 'other', true)$$,
  'only one primary contact per child', '23505');

select tests.throws(
  $$delete from public.parents where id = 'fa000000-0000-0000-0000-00000000000b'$$,
  'cannot delete a parent who is still linked to a child', '23503');

-- Promote a second admin, after which demoting the first one is allowed.
select tests.eq(
  tests.rows_affected($$update public.profiles set role = 'admin' where id = '51000000-0000-0000-0000-000000000002'$$),
  1, 'admin can change another user''s role');

-- History: every change is recorded with WHO made it.
select tests.ok(
  exists (select 1 from public.audit_log
          where table_name = 'students'
            and record_id = '5d000000-0000-0000-0000-000000000009'
            and action = 'UPDATE'
            and changed_by = 'a1000000-0000-0000-0000-000000000001'
            and old_data ->> 'status' = 'active'
            and new_data ->> 'status' = 'discharged'),
  'audit_log records the discharge with actor, old and new values');

select tests.throws(
  $$insert into public.audit_log (table_name, action) values ('students', 'DELETE')$$,
  'even admin cannot write to the audit log directly', '42501');

select tests.throws(
  $$delete from public.audit_log$$,
  'even admin cannot erase the audit log', '42501');

select tests.logout();
