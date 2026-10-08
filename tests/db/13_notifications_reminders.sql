-- =============================================================================
-- Stages 8-9: notifications and payment reminders.
-- Earlier test files already created events (activities, attendance, progress,
-- home tasks, fees, payments) for Student 1 (Parent A) and Student 2 (Parent B).
-- =============================================================================
select tests.logout();

-- Fresh events, as staff s1 for Student 1.
select tests.login_as('51000000-0000-0000-0000-000000000001');
insert into public.student_activities (student_id, title, scheduled_date)
  select '5d000000-0000-0000-0000-000000000001', 'Repeat ' || g, current_date + g from generate_series(1, 5) g;
select tests.logout();

select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select tests.eq((select count(*)::int from public.notifications where title like '5 activities scheduled%'), 1,
  'a batch of 5 scheduled activities produces ONE notification for the parent');
select tests.ok((select count(*) from public.notifications where type = 'attendance') >= 1, 'parent was notified about attendance');
select tests.ok((select count(*) from public.notifications where type = 'progress') >= 1, 'parent was notified about shared progress');
select tests.eq((select count(*)::int from public.notifications where body = 'Internal draft note'), 0,
  'internal (unshared) progress does not notify parents');
select tests.ok((select count(*) from public.notifications where type = 'payment') >= 1, 'parent was notified about fees/payments');
select tests.ok((select bool_and(link like '/parent/children/5d000000-0000-0000-0000-000000000001%') from public.notifications),
  'parent notification links point into their own child''s pages');

-- Recipient can mark read, but cannot change anything else or create notifications.
select tests.eq(tests.rows_affected($$ update public.notifications set read_at = now() $$) > 0, true, 'parent can mark notifications as read');
select tests.throws($$ update public.notifications set title = 'hacked' $$, 'parent cannot edit notification text', '42501');
select tests.throws($$ insert into public.notifications (recipient_id, type, title) values
  ('a1000000-0000-0000-0000-000000000001', 'general', 'fake alert') $$, 'nobody can create notifications directly', '42501');
select tests.throws($$ delete from public.notifications $$, 'notifications cannot be deleted by users', '42501');
select tests.logout();

select tests.login_as('9a000000-0000-0000-0000-00000000000b');
select tests.eq((select count(*)::int from public.notifications where student_id = '5d000000-0000-0000-0000-000000000001'), 0,
  'other family receives nothing about Student 1');
select tests.logout();

-- Parent completes a task -> assigned staff are told; the parent is not notified of their own action.
select tests.login_as('51000000-0000-0000-0000-000000000001');
insert into public.home_assignments (id, student_id, title) values
  ('ce000000-0000-0000-0000-0000000000a1', '5d000000-0000-0000-0000-000000000001', 'Stack 5 blocks');
select tests.logout();
select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select null from public.complete_home_assignment('ce000000-0000-0000-0000-0000000000a1', 'Did it!');
select tests.eq((select count(*)::int from public.notifications where title like 'Home task done%'), 0,
  'the parent is not notified about their own action');
select tests.logout();
select tests.login_as('51000000-0000-0000-0000-000000000001');
select tests.eq((select count(*)::int from public.notifications where title = 'Home task done: Stack 5 blocks (Student)'), 1,
  'assigned therapist is notified when the parent marks a task done');
select tests.eq((select count(*)::int from public.notifications where title like 'Parent comment on Stack 5 blocks'), 1,
  'therapist is notified about the parent comment');
-- Staff may not run reminders.
select tests.throws($$ select public.run_payment_reminders() $$, 'staff cannot run payment reminders', '42501');
select tests.logout();

-- ---------------------------------------------------------------------------
-- Reminders (as the scheduler: no user).
-- ---------------------------------------------------------------------------
select tests.logout();
update public.app_settings set reminder_days_before = 3, overdue_repeat_days = 7, reminders_enabled = true;
insert into public.fees (id, student_id, title, amount, due_date) values
  ('fe000000-0000-0000-0000-0000000000e1', '5d000000-0000-0000-0000-000000000001', 'Reminder test', 1000, date '2030-01-10');

select null from public.run_payment_reminders(date '2030-01-05');
select tests.eq((select count(*)::int from public.payment_reminders where fee_id = 'fe000000-0000-0000-0000-0000000000e1'), 0,
  'no reminder more than 3 days before the due date');
select null from public.run_payment_reminders(date '2030-01-07');
select null from public.run_payment_reminders(date '2030-01-08');
select tests.eq((select count(*)::int from public.payment_reminders where fee_id = 'fe000000-0000-0000-0000-0000000000e1' and kind = 'before_due'), 1,
  'one "before due" reminder, not repeated on following days');
select null from public.run_payment_reminders(date '2030-01-10');
select null from public.run_payment_reminders(date '2030-01-10');
select tests.eq((select count(*)::int from public.payment_reminders where fee_id = 'fe000000-0000-0000-0000-0000000000e1' and kind = 'due_today'), 1,
  'one "due today" reminder even if the job runs twice');
select null from public.run_payment_reminders(date '2030-01-11');
select null from public.run_payment_reminders(date '2030-01-14');
select null from public.run_payment_reminders(date '2030-01-18');
select tests.eq((select count(*)::int from public.payment_reminders where fee_id = 'fe000000-0000-0000-0000-0000000000e1' and kind = 'overdue'), 2,
  'overdue reminders repeat every 7 days (11th and 18th, not 14th)');
select tests.ok((select bool_and(recipients = 1) from public.payment_reminders where fee_id = 'fe000000-0000-0000-0000-0000000000e1'),
  'each reminder reached the one parent with a login');
select tests.eq((select count(*)::int from public.notifications where type = 'reminder' and title like 'Payment overdue: Reminder test'
  and recipient_id = '9a000000-0000-0000-0000-00000000000a'), 2, 'parent A received the overdue reminders');

-- Paying stops reminders.
insert into public.payments (fee_id, student_id, amount, method) values
  ('fe000000-0000-0000-0000-0000000000e1', '5d000000-0000-0000-0000-000000000001', 1000, 'cash');
select null from public.run_payment_reminders(date '2030-01-30');
select tests.eq((select count(*)::int from public.payment_reminders where fee_id = 'fe000000-0000-0000-0000-0000000000e1' and kind = 'overdue'), 2,
  'no more reminders once the fee is paid');

-- Turning reminders off stops them.
update public.app_settings set reminders_enabled = false;
insert into public.fees (id, student_id, title, amount, due_date) values
  ('fe000000-0000-0000-0000-0000000000e2', '5d000000-0000-0000-0000-000000000001', 'Off test', 500, date '2030-02-01');
select tests.eq(public.run_payment_reminders(date '2030-02-01'), 0, 'disabled reminders send nothing');
update public.app_settings set reminders_enabled = true;

-- Parents can see reminder history for their own child only; settings are admin-only.
select tests.login_as('9a000000-0000-0000-0000-00000000000b');
select tests.eq((select count(*)::int from public.payment_reminders where student_id = '5d000000-0000-0000-0000-000000000001'), 0,
  'other family cannot see reminders');
select tests.eq((select count(*)::int from public.app_settings), 0, 'parents cannot read settings');
select tests.logout();
