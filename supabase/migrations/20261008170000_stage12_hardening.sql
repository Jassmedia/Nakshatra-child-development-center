-- =============================================================================
-- STAGE 12 — Hardening (found by tests/db/14_security_audit.sql)
-- =============================================================================

-- Supabase's default privileges grant USAGE on new sequences to the API roles.
-- No client needs to touch a sequence directly (inserts use column defaults),
-- so remove it everywhere in public.
revoke all on all sequences in schema public from anon, authenticated;

-- Indexes for foreign keys that are used for lookups (the remaining unindexed
-- FKs are "who did it" columns shown for display only).
create index student_activities_activity_idx on public.student_activities (activity_id);
create index payment_reminders_student_idx on public.payment_reminders (student_id);
create index hac_student_idx on public.home_assignment_comments (student_id);
