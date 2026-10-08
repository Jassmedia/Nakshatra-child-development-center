-- =============================================================================
-- Stage 1: role follows app_metadata even when Supabase Auth sets it AFTER insert.
-- =============================================================================
select tests.logout();

-- Supabase Auth's real sequence: insert without role, then update app_metadata.
insert into auth.users (id, email) values ('e0000000-0000-0000-0000-0000000000a1', 'twostep@test.local');
select tests.eq((select role::text from public.profiles where id = 'e0000000-0000-0000-0000-0000000000a1'),
  'parent', 'new user without role starts as parent');

update auth.users set raw_app_meta_data = '{"provider":"email","role":"staff"}'
  where id = 'e0000000-0000-0000-0000-0000000000a1';
select tests.eq((select role::text from public.profiles where id = 'e0000000-0000-0000-0000-0000000000a1'),
  'staff', 'role set later in app_metadata is copied to the profile');

-- user_metadata is user-editable and must never change the role.
update auth.users set raw_user_meta_data = '{"role":"admin"}'
  where id = 'e0000000-0000-0000-0000-0000000000a1';
select tests.eq((select role::text from public.profiles where id = 'e0000000-0000-0000-0000-0000000000a1'),
  'staff', 'user_metadata cannot change the role');

-- A garbage role is ignored (keeps the current role).
update auth.users set raw_app_meta_data = '{"role":"superuser"}'
  where id = 'e0000000-0000-0000-0000-0000000000a1';
select tests.eq((select role::text from public.profiles where id = 'e0000000-0000-0000-0000-0000000000a1'),
  'staff', 'invalid app_metadata role is ignored');
