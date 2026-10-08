-- =============================================================================
-- Stage 7: billing correctness and access.
-- =============================================================================
select tests.logout();

select tests.login_as('a1000000-0000-0000-0000-000000000001');
insert into public.fees (id, fee_number, student_id, title, amount, discount, due_date, amount_paid, status) values
  ('fe000000-0000-0000-0000-000000000001', 'IGNORED', '5d000000-0000-0000-0000-000000000001', 'October therapy', 5000, 500, current_date + 5, 999, 'paid');
select tests.ok((select fee_number from public.fees where id = 'fe000000-0000-0000-0000-000000000001') ~ '^FEE-[0-9]{4}-[0-9]{5}$',
  'fee numbers are generated');
select tests.eq((select status from public.fees where id = 'fe000000-0000-0000-0000-000000000001'), 'pending',
  'a client cannot set status or amount_paid on a new fee');
select tests.eq((select balance from public.fees where id = 'fe000000-0000-0000-0000-000000000001'), 4500.00::numeric,
  'balance = amount - discount - paid');

insert into public.payments (id, receipt_number, fee_id, student_id, amount, method) values
  ('fa100000-0000-0000-0000-000000000001', 'X', 'fe000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000002', 2000.50, 'upi');
select tests.eq((select student_id from public.payments where id = 'fa100000-0000-0000-0000-000000000001'),
  '5d000000-0000-0000-0000-000000000001'::uuid, 'payment student is copied from the fee, not the request');
select tests.eq((select status from public.fees where id = 'fe000000-0000-0000-0000-000000000001'), 'partially_paid',
  'a part payment makes the fee partially paid');
select tests.eq((select balance from public.fees where id = 'fe000000-0000-0000-0000-000000000001'), 2499.50::numeric,
  'paise are exact (no floating point)');
select tests.throws($$ insert into public.payments (fee_id, student_id, amount, method, receipt_number)
  values ('fe000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 2500, 'cash', 'x') $$,
  'overpayment is rejected', 'P0001');
insert into public.payments (fee_id, student_id, amount, method, receipt_number)
  values ('fe000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 2499.50, 'cash', 'x');
select tests.eq((select status from public.fees where id = 'fe000000-0000-0000-0000-000000000001'), 'paid',
  'paying the balance makes the fee paid');
select tests.throws($$ update public.fees set discount = 0, amount = 3000 where id = 'fe000000-0000-0000-0000-000000000001' $$,
  'cannot reduce a fee below what was already paid', 'P0001');
with u as (update public.fees set amount_paid = 0 where id = 'fe000000-0000-0000-0000-000000000001' returning amount_paid)
select tests.eq((select amount_paid from u), 4500.00::numeric,
  'amount_paid cannot be overwritten by a client (recomputed from payments)');

-- Voiding a payment recalculates; voided payments cannot be restored or edited.
update public.payments set voided = true, void_reason = 'Entered twice'
  where id = 'fa100000-0000-0000-0000-000000000001';
select tests.eq((select status from public.fees where id = 'fe000000-0000-0000-0000-000000000001'), 'partially_paid',
  'voiding a payment reopens the balance');
select tests.throws($$ update public.payments set voided = false where id = 'fa100000-0000-0000-0000-000000000001' $$,
  'a voided payment cannot be restored', 'P0001');
select tests.throws($$ update public.payments set voided = true where id <> 'fa100000-0000-0000-0000-000000000001' $$,
  'voiding needs a reason', '23514');
select tests.throws($$ delete from public.payments $$, 'payments cannot be deleted', '42501');
select tests.throws($$ delete from public.fees $$, 'fees cannot be deleted', '42501');

-- Cancelling.
insert into public.fees (id, fee_number, student_id, title, amount, due_date) values
  ('fe000000-0000-0000-0000-000000000002', '', '5d000000-0000-0000-0000-000000000002', 'Assessment fee', 1500, current_date - 3);
select tests.throws($$ update public.fees set status = 'cancelled' where id = 'fe000000-0000-0000-0000-000000000002' $$,
  'cancelling needs a reason', '23514');
update public.fees set status = 'cancelled', cancelled_reason = 'Waived' where id = 'fe000000-0000-0000-0000-000000000002';
select tests.throws($$ insert into public.payments (fee_id, student_id, amount, method, receipt_number)
  values ('fe000000-0000-0000-0000-000000000002', '5d000000-0000-0000-0000-000000000002', 100, 'cash', 'x') $$,
  'no payments against a cancelled fee', 'P0001');
select tests.throws($$ update public.fees set status = 'pending' where id = 'fe000000-0000-0000-0000-000000000002' $$,
  'a cancelled fee cannot be reopened', 'P0001');
select tests.throws($$ update public.fees set status = 'cancelled', cancelled_reason = 'x' where id = 'fe000000-0000-0000-0000-000000000001' $$,
  'a fee with payments cannot be cancelled', 'P0001');
select tests.logout();

-- Parents: own child only, read-only.
select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select tests.eq((select count(*)::int from public.fees), 1, 'parent A sees only their child''s fee');
select tests.eq((select count(*)::int from public.payments), 2, 'parent A sees the payments (incl. voided, for transparency)');
select tests.throws($$ insert into public.payments (fee_id, student_id, amount, method, receipt_number)
  values ('fe000000-0000-0000-0000-000000000001', '5d000000-0000-0000-0000-000000000001', 1, 'upi', 'x') $$,
  'parent cannot record a payment', '42501');
select tests.eq(tests.rows_affected($$ update public.fees set discount = 4500 $$), 0, 'parent cannot change a fee');
select tests.logout();

select tests.login_as('9a000000-0000-0000-0000-00000000000b');
select tests.eq((select count(*)::int from public.fees), 1, 'parent B sees only their own child''s fee');
select tests.eq((select count(*)::int from public.payments), 0, 'parent B sees no payments of another family');
select tests.logout();

-- Staff: no billing access at all, even for assigned students.
select tests.login_as('51000000-0000-0000-0000-000000000001');
select tests.eq((select count(*)::int from public.fees), 0, 'staff cannot see fees');
select tests.eq((select count(*)::int from public.payments), 0, 'staff cannot see payments');
select tests.logout();
