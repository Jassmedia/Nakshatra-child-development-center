-- =============================================================================
-- Stage 6: home assignments.
-- =============================================================================
select tests.logout();

select tests.login_as('51000000-0000-0000-0000-000000000001');
insert into public.home_assignments (id, student_id, title, instructions, due_date) values
  ('ce000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 'Name 5 fruits', 'Use real fruits at breakfast', current_date + 3);
select tests.throws($$ insert into public.home_assignments (student_id, title)
  values ('5d000000-0000-0000-0000-000000000002', 'Not mine') $$, 'staff cannot assign homework to an unassigned child', '42501');
select tests.throws($$ insert into public.home_assignments (student_id, title, due_date, assigned_on)
  values ('5d000000-0000-0000-0000-000000000001', 'Bad dates', current_date - 5, current_date) $$,
  'due date cannot be before the assigned date', '23514');
select tests.logout();

-- Parent A: sees it, can't edit directly, completes via RPC with a comment.
select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select tests.eq((select count(*)::int from public.home_assignments), 1, 'parent sees their child''s assignment');
select tests.eq(tests.rows_affected($$ update public.home_assignments set status = 'reviewed' $$), 0,
  'parent cannot change assignments directly');
select public.complete_home_assignment('ce000000-0000-0000-0000-000000000001', 'Done! He named 4 of 5.');
select tests.eq((select status from public.home_assignments where id = 'ce000000-0000-0000-0000-000000000001'),
  'completed', 'parent marks the assignment as done');
select tests.eq((select completed_by from public.home_assignments where id = 'ce000000-0000-0000-0000-000000000001'),
  '9a000000-0000-0000-0000-00000000000a'::uuid, 'completion records which parent did it');
select tests.eq((select count(*)::int from public.home_assignment_comments), 1, 'the completion comment is in the thread');
select tests.throws($$ select public.complete_home_assignment('ce000000-0000-0000-0000-000000000001', null) $$,
  'cannot complete twice', 'P0001');
-- Comments: author cannot be faked; student is taken from the assignment.
insert into public.home_assignment_comments (assignment_id, student_id, author_id, body)
  values ('ce000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000002',
          'a1000000-0000-0000-0000-000000000001', 'Thank you');
select tests.eq((select author_id from public.home_assignment_comments where body = 'Thank you'),
  '9a000000-0000-0000-0000-00000000000a'::uuid, 'comment author is the logged-in user');
select tests.eq((select student_id from public.home_assignment_comments where body = 'Thank you'),
  '5d000000-0000-0000-0000-000000000001'::uuid, 'comment student comes from the assignment');
select tests.throws($$ update public.home_assignment_comments set body = 'changed' $$,
  'comments cannot be edited', '42501');
select tests.throws($$ delete from public.home_assignment_comments $$, 'comments cannot be deleted', '42501');
select tests.logout();

-- Parent B: nothing, and cannot complete or comment on another family's task.
select tests.login_as('9a000000-0000-0000-0000-00000000000b');
select tests.eq((select count(*)::int from public.home_assignments), 0, 'other family cannot see the assignment');
select tests.throws($$ select public.complete_home_assignment('ce000000-0000-0000-0000-000000000001', 'x') $$,
  'other family cannot complete it', '42501');
select tests.throws($$ insert into public.home_assignment_comments (assignment_id, student_id, body)
  values ('ce000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000002', 'spam') $$,
  'other family cannot comment on it', '42501');
select tests.logout();

-- Staff reviews: stamps are set automatically.
select tests.login_as('51000000-0000-0000-0000-000000000001');
update public.home_assignments set status = 'reviewed', staff_feedback = 'Great work at home'
  where id = 'ce000000-0000-0000-0000-000000000001';
select tests.eq((select reviewed_by from public.home_assignments where id = 'ce000000-0000-0000-0000-000000000001'),
  '51000000-0000-0000-0000-000000000001'::uuid, 'review records the reviewing therapist');
-- Sending back clears completion.
update public.home_assignments set status = 'pending' where id = 'ce000000-0000-0000-0000-000000000001';
select tests.ok((select completed_at is null and reviewed_at is null from public.home_assignments
  where id = 'ce000000-0000-0000-0000-000000000001'), 'sending back to pending clears completion and review');
select tests.logout();

select tests.login_as_anon();
select tests.throws($$ select public.complete_home_assignment('ce000000-0000-0000-0000-000000000001', 'x') $$,
  'anonymous cannot call the completion function', '42501');
select tests.logout();
