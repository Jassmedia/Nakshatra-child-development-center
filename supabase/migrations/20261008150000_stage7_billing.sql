-- =============================================================================
-- STAGE 7 — Billing: fees and payments
--
--   fees      what a family owes for a child (amount, discount, due date)
--   payments  money received against a fee (can be voided, never deleted)
--
-- Money is numeric(12,2) — never floating point.
-- fees.amount_paid and fees.status are COMPUTED by the database from the
-- non-voided payments, so they can never disagree with the money:
--   pending          nothing paid yet
--   partially_paid   something paid, balance > 0
--   paid             balance = 0
--   cancelled        set by admin (waived / raised by mistake)
-- "Overdue" is not stored: it is pending/partially_paid with due_date < today.
--
-- Access: admin full; parents read their own child's fees and payments;
-- staff have no billing access. No deletes.
-- =============================================================================

create sequence public.fee_number_seq;
create sequence public.receipt_number_seq;
revoke all on sequence public.fee_number_seq, public.receipt_number_seq from anon, authenticated;

create table public.fees (
  id                uuid primary key default gen_random_uuid(),
  fee_number        text not null unique default '',  -- set by trigger
  student_id        uuid not null references public.students (id) on delete restrict,
  title             text not null check (char_length(btrim(title)) between 1 and 150),
  period_start      date,
  period_end        date,
  amount            numeric(12,2) not null check (amount > 0),
  discount          numeric(12,2) not null default 0 check (discount >= 0),
  amount_paid       numeric(12,2) not null default 0,
  balance           numeric(12,2) generated always as (amount - discount - amount_paid) stored,
  due_date          date not null,
  status            text not null default 'pending' check (status in ('pending', 'partially_paid', 'paid', 'cancelled')),
  remarks           text check (remarks is null or char_length(remarks) <= 1000),
  cancelled_reason  text check (cancelled_reason is null or char_length(cancelled_reason) <= 500),
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint fees_discount_not_above_amount check (discount <= amount),
  constraint fees_period_valid check (period_end is null or period_start is null or period_end >= period_start),
  constraint fees_cancel_reason check (status <> 'cancelled' or cancelled_reason is not null)
);
create index fees_student_idx on public.fees (student_id, due_date desc);
create index fees_status_due_idx on public.fees (status, due_date);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  receipt_number  text not null unique default '',  -- set by trigger
  fee_id          uuid not null references public.fees (id) on delete restrict,
  student_id      uuid not null references public.students (id) on delete restrict,
  amount          numeric(12,2) not null check (amount > 0),
  payment_date    date not null default current_date,
  method          text not null check (method in ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'other')),
  reference       text check (reference is null or char_length(reference) <= 120),
  remarks         text check (remarks is null or char_length(remarks) <= 1000),
  voided          boolean not null default false,
  void_reason     text check (void_reason is null or char_length(void_reason) <= 500),
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint payments_void_reason check (not voided or void_reason is not null),
  constraint payments_not_future check (payment_date <= current_date + 1)
);
create index payments_fee_idx on public.payments (fee_id);
create index payments_student_date_idx on public.payments (student_id, payment_date desc);
create index payments_date_idx on public.payments (payment_date desc) where not voided;

-- -----------------------------------------------------------------------------
-- Fee: numbering, computed amount_paid / status, guard rails.
-- -----------------------------------------------------------------------------
create function private.fees_compute()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_paid numeric(12,2);
  v_net  numeric(12,2);
begin
  if tg_op = 'INSERT' then
    new.fee_number := 'FEE-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.fee_number_seq')::text, 5, '0');
    new.amount_paid := 0;
  else
    new.fee_number := old.fee_number;
    if new.student_id is distinct from old.student_id then
      raise exception 'A fee cannot be moved to another student' using errcode = '42501';
    end if;
    if old.status = 'cancelled' and new.status <> 'cancelled' then
      raise exception 'A cancelled fee cannot be reopened. Create a new fee instead.' using errcode = 'P0001';
    end if;
    select coalesce(sum(p.amount), 0) into v_paid
      from public.payments p where p.fee_id = new.id and not p.voided;
    new.amount_paid := v_paid;
  end if;

  v_net := new.amount - new.discount;
  if new.amount_paid > v_net then
    raise exception 'The amount after discount (%) cannot be less than what is already paid (%)', v_net, new.amount_paid
      using errcode = 'P0001';
  end if;

  if new.status = 'cancelled' then
    if new.amount_paid > 0 then
      raise exception 'Void the payments on this fee before cancelling it' using errcode = 'P0001';
    end if;
  elsif new.amount_paid >= v_net then
    new.status := 'paid';
  elsif new.amount_paid > 0 then
    new.status := 'partially_paid';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger fees_compute before insert or update on public.fees
  for each row execute function private.fees_compute();
create trigger fees_set_updated_at before update on public.fees
  for each row execute function private.set_updated_at();
create trigger fees_stamp_actor before insert or update on public.fees
  for each row execute function private.stamp_actor();
create trigger audit_fees after insert or update or delete on public.fees
  for each row execute function private.audit_row_change();

-- -----------------------------------------------------------------------------
-- Payment: numbering, student copied from the fee, no overpayment, then
-- recompute the fee.
-- -----------------------------------------------------------------------------
create function private.payments_before()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fee public.fees%rowtype;
  v_other numeric(12,2);
begin
  select * into v_fee from public.fees where id = new.fee_id;
  if v_fee.id is null then
    raise exception 'Fee not found' using errcode = '23503';
  end if;

  if tg_op = 'INSERT' then
    new.receipt_number := 'RCPT-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.receipt_number_seq')::text, 5, '0');
    new.voided := false;
    new.void_reason := null;
    if v_fee.status = 'cancelled' then
      raise exception 'This fee is cancelled; payments cannot be recorded against it' using errcode = 'P0001';
    end if;
  else
    new.receipt_number := old.receipt_number;
    if new.fee_id is distinct from old.fee_id then
      raise exception 'A payment cannot be moved to another fee' using errcode = '42501';
    end if;
    if old.voided and not new.voided then
      raise exception 'A voided payment cannot be restored. Record a new payment instead.' using errcode = 'P0001';
    end if;
    if old.voided then
      raise exception 'A voided payment cannot be changed' using errcode = 'P0001';
    end if;
  end if;
  new.student_id := v_fee.student_id;

  if not new.voided then
    select coalesce(sum(p.amount), 0) into v_other
      from public.payments p
     where p.fee_id = new.fee_id and not p.voided and p.id <> new.id;
    if v_other + new.amount > v_fee.amount - v_fee.discount then
      raise exception 'Payment is more than the balance due (% remaining)', (v_fee.amount - v_fee.discount - v_other)
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create function private.payments_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Touching the fee re-runs fees_compute, which recalculates amount_paid and status.
  update public.fees set updated_at = now() where id = new.fee_id;
  return null;
end;
$$;

create trigger payments_before before insert or update on public.payments
  for each row execute function private.payments_before();
create trigger payments_after after insert or update on public.payments
  for each row execute function private.payments_after();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function private.set_updated_at();
create trigger payments_stamp_actor before insert or update on public.payments
  for each row execute function private.stamp_actor();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function private.audit_row_change();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.fees     enable row level security;
alter table public.payments enable row level security;

revoke all on public.fees, public.payments from anon, authenticated;
grant select, insert, update on public.fees     to authenticated;
grant select, insert, update on public.payments to authenticated;

create policy fees_select on public.fees for select to authenticated
  using ((select private.is_admin()) or private.is_parent_of(student_id));
create policy fees_admin_insert on public.fees for insert to authenticated
  with check ((select private.is_admin()));
create policy fees_admin_update on public.fees for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy payments_select on public.payments for select to authenticated
  using ((select private.is_admin()) or private.is_parent_of(student_id));
create policy payments_admin_insert on public.payments for insert to authenticated
  with check ((select private.is_admin()));
create policy payments_admin_update on public.payments for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
