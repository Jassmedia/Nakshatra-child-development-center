-- =============================================================================
-- Test fixtures — a small, fake world. TEST DATA ONLY (rolled back after tests).
--
--   Admin      a1  (admin)
--   Staff      s1  assigned (active)  to Student 1
--                  assigned (ENDED)  to Student 3
--              s2  assigned (active)  to Student 2
--              s3  DEACTIVATED, assigned (active) to Student 1
--              s4  assigned in the FUTURE to Student 2
--   Parent A   pa  parent of Student 1 and Student 3 (siblings)
--   Parent B   pb  parent of Student 2
--   Contact C  (no login) second guardian of Student 2
-- =============================================================================

select tests.logout();

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a1000000-0000-0000-0000-000000000001', 'admin@test.local',   '{"role":"admin"}',  '{"full_name":"Admin One"}'),
  ('51000000-0000-0000-0000-000000000001', 'staff1@test.local',  '{"role":"staff"}',  '{"full_name":"Staff One"}'),
  ('51000000-0000-0000-0000-000000000002', 'staff2@test.local',  '{"role":"staff"}',  '{"full_name":"Staff Two"}'),
  ('51000000-0000-0000-0000-000000000003', 'staff3@test.local',  '{"role":"staff"}',  '{"full_name":"Staff Three"}'),
  ('51000000-0000-0000-0000-000000000004', 'staff4@test.local',  '{"role":"staff"}',  '{"full_name":"Staff Four"}'),
  ('9a000000-0000-0000-0000-00000000000a', 'parentA@test.local', '{"role":"parent"}', '{"full_name":"Parent A"}'),
  ('9a000000-0000-0000-0000-00000000000b', 'parentB@test.local', '{"role":"parent"}', '{"full_name":"Parent B"}'),
  -- Attack attempt: user-editable metadata claims admin, app metadata says nothing.
  ('e0000000-0000-0000-0000-000000000001', 'sneaky@test.local',  '{}',                '{"full_name":"Sneaky","role":"admin"}'),
  -- Garbage role in app metadata.
  ('e0000000-0000-0000-0000-000000000002', 'bogus@test.local',   '{"role":"superuser"}', '{}');

update public.profiles set is_active = false where id = '51000000-0000-0000-0000-000000000003';

insert into public.staff_details (profile_id, designation) values
  ('51000000-0000-0000-0000-000000000001', 'Speech Therapist'),
  ('51000000-0000-0000-0000-000000000002', 'Occupational Therapist');

insert into public.students (id, admission_number, full_name, date_of_birth) values
  ('5d000000-0000-0000-0000-000000000001', 'TEST-001', 'Student One',   '2020-01-01'),
  ('5d000000-0000-0000-0000-000000000002', 'TEST-002', 'Student Two',   '2019-06-15'),
  ('5d000000-0000-0000-0000-000000000003', 'TEST-003', 'Student Three', '2021-03-10');

insert into public.parents (id, profile_id, full_name, phone, email) values
  ('fa000000-0000-0000-0000-00000000000a', '9a000000-0000-0000-0000-00000000000a', 'Parent A',  '+91 90000 00001', 'parentA@test.local'),
  ('fa000000-0000-0000-0000-00000000000b', '9a000000-0000-0000-0000-00000000000b', 'Parent B',  '+91 90000 00002', 'parentB@test.local'),
  ('fa000000-0000-0000-0000-00000000000c', null,                                   'Contact C', '+91 90000 00003', null);

insert into public.student_parents (student_id, parent_id, relationship, is_primary_contact) values
  ('5d000000-0000-0000-0000-000000000001', 'fa000000-0000-0000-0000-00000000000a', 'mother',   true),
  ('5d000000-0000-0000-0000-000000000003', 'fa000000-0000-0000-0000-00000000000a', 'mother',   true),
  ('5d000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-00000000000b', 'father',   true),
  ('5d000000-0000-0000-0000-000000000002', 'fa000000-0000-0000-0000-00000000000c', 'guardian', false);

insert into public.student_staff_assignments (student_id, staff_id, starts_on, ends_on) values
  ('5d000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', current_date - 30, null),
  ('5d000000-0000-0000-0000-000000000003', '51000000-0000-0000-0000-000000000001', current_date - 60, current_date - 1),
  ('5d000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000002', current_date - 30, null),
  ('5d000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000003', current_date - 30, null),
  ('5d000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000004', current_date + 7,  null);
