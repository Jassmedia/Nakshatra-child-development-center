-- =============================================================================
-- Stage 5: names-only staff information for parents.
-- =============================================================================
select tests.logout();

select tests.login_as('9a000000-0000-0000-0000-00000000000a');
select tests.eq((select count(*)::int from public.profiles where role = 'staff'), 0,
  'parents still cannot read staff profiles (phone/email stay private)');
select tests.ok((select count(*) from public.get_staff_names()) > 0, 'parents can read staff names');
select tests.eq(
  (select count(*)::int from public.get_student_therapists('5d000000-0000-0000-0000-000000000001')), 1,
  'parent sees the active therapist of their own child (deactivated staff excluded)');
select tests.eq(
  (select count(*)::int from public.get_student_therapists('5d000000-0000-0000-0000-000000000002')), 0,
  'parent gets nothing for another family''s child');
select tests.logout();

select tests.login_as_anon();
select tests.throws($$ select * from public.get_staff_names() $$, 'anonymous cannot list staff names', '42501');
select tests.logout();

-- A deactivated user gets no names even with a valid token.
select tests.login_as('51000000-0000-0000-0000-000000000003');
select tests.eq((select count(*)::int from public.get_staff_names()), 0, 'deactivated users get no staff names');
select tests.logout();
