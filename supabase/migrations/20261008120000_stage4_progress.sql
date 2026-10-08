-- =============================================================================
-- STAGE 4 — Progress tracking
--
-- progress_updates: a dated assessment of one development area for one child.
-- The full list over time IS the child's progress history (never deleted).
--
-- Visibility:
--   admin, actively assigned staff : every update
--   parents of the child           : only updates with shared_with_parent = true
-- =============================================================================

create table public.progress_updates (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references public.students (id) on delete restrict,
  record_date         date not null default current_date,
  area                text not null check (char_length(btrim(area)) between 1 and 60),
  level               smallint check (level is null or level between 1 and 5),
  trend               text not null default 'steady' check (trend in ('improving', 'steady', 'needs_attention')),
  observations        text not null check (char_length(btrim(observations)) between 1 and 4000),
  improvements        text check (improvements is null or char_length(improvements) <= 4000),
  attention_areas     text check (attention_areas is null or char_length(attention_areas) <= 4000),
  recommendations     text check (recommendations is null or char_length(recommendations) <= 4000),
  shared_with_parent  boolean not null default true,
  created_by          uuid references public.profiles (id) on delete set null,
  updated_by          uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint progress_not_in_future check (record_date <= current_date + 1)
);

comment on column public.progress_updates.level is '1 = emerging / needs full support ... 5 = mastered / independent.';
comment on column public.progress_updates.attention_areas is 'Areas requiring attention.';

create index progress_student_date_idx on public.progress_updates (student_id, record_date desc);
create index progress_trend_idx on public.progress_updates (trend, record_date desc);

create trigger progress_set_updated_at before update on public.progress_updates
  for each row execute function private.set_updated_at();
create trigger progress_stamp_actor before insert or update on public.progress_updates
  for each row execute function private.stamp_actor();
create trigger progress_no_move before update on public.progress_updates
  for each row execute function private.prevent_student_change();
create trigger audit_progress_updates after insert or update or delete on public.progress_updates
  for each row execute function private.audit_row_change();

alter table public.progress_updates enable row level security;
revoke all on public.progress_updates from anon, authenticated;
grant select, insert, update on public.progress_updates to authenticated;

create policy progress_select on public.progress_updates for select to authenticated
  using (
    private.can_manage_student(student_id)
    or (shared_with_parent and private.is_parent_of(student_id))
  );
create policy progress_insert on public.progress_updates for insert to authenticated
  with check (private.can_manage_student(student_id));
create policy progress_update on public.progress_updates for update to authenticated
  using (private.can_manage_student(student_id)) with check (private.can_manage_student(student_id));
