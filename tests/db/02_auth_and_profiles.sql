-- =============================================================================
-- Auth integration + profile protection
-- =============================================================================

select tests.logout();

select tests.eq(
  (select role::text from public.profiles where id = 'a1000000-0000-0000-0000-000000000001'),
  'admin', 'auth trigger creates profile with role from app_metadata');

select tests.eq(
  (select full_name from public.profiles where id = '51000000-0000-0000-0000-000000000001'),
  'Staff One', 'auth trigger copies full_name from user_metadata');

select tests.eq(
  (select role::text from public.profiles where id = 'e0000000-0000-0000-0000-000000000001'),
  'parent', 'role in user-editable user_metadata is IGNORED (no privilege escalation)');

select tests.eq(
  (select role::text from public.profiles where id = 'e0000000-0000-0000-0000-000000000002'),
  'parent', 'invalid role in app_metadata falls back to parent');

update auth.users set email = 'parentA.new@test.local' where id = '9a000000-0000-0000-0000-00000000000a';
select tests.eq(
  (select email from public.profiles where id = '9a000000-0000-0000-0000-00000000000a'),
  'parentA.new@test.local', 'email change in auth.users syncs to profiles');

-- ---- anonymous visitors see nothing ----------------------------------------
select tests.login_as_anon();
select tests.throws('select * from public.students',        'anon cannot read students',        '42501');
select tests.throws('select * from public.profiles',        'anon cannot read profiles',        '42501');
select tests.throws('select * from public.parents',         'anon cannot read parents',         '42501');
select tests.throws('select private.is_admin()',            'anon cannot call security helpers', '42501');
select tests.logout();

-- ---- a user can edit their own name, but not their role -------------------
select tests.login_as('9a000000-0000-0000-0000-00000000000a');

select tests.eq(
  tests.rows_affected($$update public.profiles set full_name = 'Parent A (edited)' where id = '9a000000-0000-0000-0000-00000000000a'$$),
  1, 'parent can update own full_name');

select tests.throws(
  $$update public.profiles set role = 'admin' where id = '9a000000-0000-0000-0000-00000000000a'$$,
  'parent CANNOT promote themselves to admin', '42501');

select tests.throws(
  $$update public.profiles set is_active = false where id = '9a000000-0000-0000-0000-00000000000a'$$,
  'parent cannot change own active flag', '42501');

select tests.eq(
  tests.rows_affected($$update public.profiles set full_name = 'hacked' where id = '9a000000-0000-0000-0000-00000000000b'$$),
  0, 'parent cannot update another user''s profile');

select tests.throws(
  $$insert into public.profiles (id, role) values (gen_random_uuid(), 'admin')$$,
  'nobody can insert profiles directly', '42501');

select tests.eq((select count(*)::int from public.profiles), 1, 'parent sees only their own profile');
select tests.eq((select count(*)::int from public.audit_log), 0, 'parent cannot read the audit log');
select tests.logout();

-- ---- deactivated users lose access immediately ----------------------------
select tests.login_as('51000000-0000-0000-0000-000000000003');
select tests.eq((select count(*)::int from public.students), 0,
  'deactivated staff sees no students even with an active assignment');
select tests.logout();

-- ---- the last admin cannot be removed --------------------------------------
select tests.login_as('a1000000-0000-0000-0000-000000000001');
select tests.throws(
  $$update public.profiles set role = 'staff' where id = 'a1000000-0000-0000-0000-000000000001'$$,
  'last active admin cannot demote themselves', '42501');
select tests.throws(
  $$update public.profiles set is_active = false where id = 'a1000000-0000-0000-0000-000000000001'$$,
  'last active admin cannot deactivate themselves', '42501');
select tests.logout();
