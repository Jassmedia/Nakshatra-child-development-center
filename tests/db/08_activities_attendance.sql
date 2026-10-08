-- =============================================================================
-- Stage 3: activities & attendance permissions and integrity.
--   s1 is actively assigned to Student 1 (child of Parent A), ended on Student 3.
--   Student 2 belongs to Parent B and is assigned to s2/s4 only.
-- =============================================================================
select tests.logout();

-- Catalogue: admin writes, staff read, parents nothing.
select tests.login_as('a1000000-0000-0000-0000-000000000001');
insert into public.activities (id, name, kind, category) values
  ('ac000000-0000-0000-0000-000000000001', 'Picture naming', 'activity', 'Speech');
select tests.logout();

select tests.login_as('51000000-0000-0000-0000-000000000001');
select tests.eq((select count(*)::int from public.activities), 1, 'staff can read the activity catalogue');
select tests.throws($$ insert into public.activities (name) values ('Staff made') $$, 'staff cannot add catalogue items', '42501');

-- Staff logs work for an assigned child; created_by cannot be faked.
insert into public.student_activities (id, student_id, activity_id, title, scheduled_date, created_by)
  values ('ad000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001',
          'ac000000-0000-0000-0000-000000000001', 'Picture naming', current_date,
          'a1000000-0000-0000-0000-000000000001');
select tests.eq((select created_by from public.student_activities where id = 'ad000000-0000-0000-0000-000000000001'),
  '51000000-0000-0000-0000-000000000001'::uuid, 'created_by is stamped from the login, not the request');

select tests.throws($$ insert into public.student_activities (student_id, title, scheduled_date)
  values ('5d000000-0000-0000-0000-000000000002', 'Not mine', current_date) $$,
  'staff cannot add activities for an unassigned child', '42501');
select tests.throws($$ insert into public.student_activities (student_id, title, scheduled_date)
  values ('5d000000-0000-0000-0000-000000000003', 'Ended assignment', current_date) $$,
  'staff cannot add activities after the assignment ended', '42501');

update public.student_activities set status = 'completed', performance_rating = 4, staff_remarks = 'Named 8 of 10 pictures'
  where id = 'ad000000-0000-0000-0000-000000000001';
select tests.ok((select completed_at is not null from public.student_activities where id = 'ad000000-0000-0000-0000-000000000001'),
  'completing an activity records the time');
select tests.throws($$ update public.student_activities set student_id = '5d000000-0000-0000-0000-000000000003'
  where id = 'ad000000-0000-0000-0000-000000000001' $$, 'an activity cannot be moved to another child');
select tests.throws($$ update public.student_activities set performance_rating = 9 where id = 'ad000000-0000-0000-0000-000000000001' $$,
  'rating must be 1 to 5', '23514');
select tests.throws($$ delete from public.student_activities where id = 'ad000000-0000-0000-0000-000000000001' $$,
  'activities cannot be deleted (history)', '42501');

-- Attendance.
insert into public.attendance (student_id, attendance_date, status, check_in)
  values ('5d000000-0000-0000-0000-000000000001', current_date, 'present', '09:30');
select tests.throws($$ insert into public.attendance (student_id, attendance_date, status)
  values ('5d000000-0000-0000-0000-000000000001', current_date, 'absent') $$,
  'only one attendance row per child per day', '23505');
select tests.throws($$ insert into public.attendance (student_id, attendance_date, status)
  values ('5d000000-0000-0000-0000-000000000002', current_date, 'present') $$,
  'staff cannot mark attendance for an unassigned child', '42501');
select tests.throws($$ insert into public.attendance (student_id, attendance_date, status, check_in)
  values ('5d000000-0000-0000-0000-000000000001', current_date - 1, 'absent', '09:00') $$,
  'absent rows cannot carry check-in times', '23514');
select tests.throws($$ insert into public.attendance (student_id, attendance_date, status, check_in, check_out)
  values ('5d000000-0000-0000-0000-000000000001', current_date - 2, 'present', '11:00', '10:00') $$,
  'check-out cannot be before check-in', '23514');
select tests.logout();

-- Parents: own child only, read-only.
select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select tests.eq((select count(*)::int from public.student_activities), 1, 'parent A sees their child''s activity');
select tests.eq((select count(*)::int from public.attendance), 1, 'parent A sees their child''s attendance');
select tests.eq((select count(*)::int from public.activities), 0, 'parents do not read the internal catalogue');
select tests.eq(tests.rows_affected($$ update public.student_activities set staff_remarks = 'parent edit' $$), 0,
  'parent cannot edit activity remarks');
select tests.throws($$ insert into public.attendance (student_id, attendance_date, status)
  values ('5d000000-0000-0000-0000-000000000001', current_date - 3, 'present') $$,
  'parent cannot mark attendance', '42501');
select tests.logout();

select tests.login_as('9a000000-0000-0000-0000-00000000000b');
select tests.eq((select count(*)::int from public.student_activities), 0, 'parent B cannot see another family''s activities');
select tests.eq((select count(*)::int from public.attendance), 0, 'parent B cannot see another family''s attendance');
select tests.logout();

select tests.login_as_anon();
select tests.throws($$ select count(*) from public.student_activities $$, 'anonymous cannot read activities', '42501');
select tests.logout();
