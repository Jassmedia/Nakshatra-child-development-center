-- =============================================================================
-- Stage 4: progress updates.
-- =============================================================================
select tests.logout();

select tests.login_as('51000000-0000-0000-0000-000000000001');
insert into public.progress_updates (id, student_id, area, level, trend, observations, shared_with_parent) values
  ('bb000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 'Speech & language', 3, 'improving', 'Uses 3-word phrases', true),
  ('bb000000-0000-0000-0000-000000000002', '5d000000-0000-0000-0000-000000000001', 'Behaviour', 2, 'needs_attention', 'Internal draft note', false);
select tests.throws($$ insert into public.progress_updates (student_id, area, observations)
  values ('5d000000-0000-0000-0000-000000000002', 'Speech & language', 'not mine') $$,
  'staff cannot record progress for an unassigned child', '42501');
select tests.throws($$ insert into public.progress_updates (student_id, area, observations)
  values ('5d000000-0000-0000-0000-000000000001', 'Speech & language', '   ') $$,
  'observations are required', '23514');
select tests.throws($$ insert into public.progress_updates (student_id, area, level, observations)
  values ('5d000000-0000-0000-0000-000000000001', 'Motor', 7, 'x') $$,
  'level must be 1 to 5', '23514');
select tests.throws($$ insert into public.progress_updates (student_id, area, observations, record_date)
  values ('5d000000-0000-0000-0000-000000000001', 'Motor', 'x', current_date + 30) $$,
  'progress cannot be dated in the future', '23514');
select tests.throws($$ delete from public.progress_updates where id = 'bb000000-0000-0000-0000-000000000001' $$,
  'progress history cannot be deleted', '42501');
select tests.eq((select count(*)::int from public.progress_updates), 2, 'assigned staff see shared and internal updates');
select tests.logout();

select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select tests.eq((select count(*)::int from public.progress_updates), 1, 'parent sees only updates shared with parents');
select tests.eq((select area from public.progress_updates limit 1), 'Speech & language', 'the shared update is the one visible');
select tests.eq(tests.rows_affected($$ update public.progress_updates set observations = 'edited by parent' $$), 0,
  'parent cannot edit progress');
select tests.logout();

select tests.login_as('9a000000-0000-0000-0000-00000000000b');
select tests.eq((select count(*)::int from public.progress_updates), 0, 'other family sees no progress');
select tests.logout();

-- Ended assignment (s1 on Student 3) and other staff (s2) see nothing of Student 1.
select tests.login_as('51000000-0000-0000-0000-000000000004');
select tests.eq((select count(*)::int from public.progress_updates), 0, 'unassigned staff see no progress');
select tests.logout();
