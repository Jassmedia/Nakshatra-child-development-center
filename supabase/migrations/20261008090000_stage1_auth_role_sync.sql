-- =============================================================================
-- STAGE 1 FIX — keep profiles.role in sync with auth app_metadata.role
--
-- Found while testing against the real Supabase Auth server: when an admin creates
-- a user, Supabase Auth INSERTs the auth.users row first and writes
-- raw_app_meta_data (incl. our "role") in a separate UPDATE. The insert-only
-- trigger from Step 1 therefore always saw "no role" and created a `parent`.
--
-- app_metadata can only be written with the secret key (server-side, after an
-- admin check), so following it is as safe as reading it on insert.
-- user_metadata (user-editable) is still ignored for roles.
-- =============================================================================

create function private.handle_auth_user_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  begin
    v_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
  exception when invalid_text_representation then
    return new;  -- garbage role: ignore, keep the current one
  end;

  if v_role is not null then
    update public.profiles set role = v_role where id = new.id and role is distinct from v_role;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_role_changed
  after update of raw_app_meta_data on auth.users
  for each row
  when (old.raw_app_meta_data ->> 'role' is distinct from new.raw_app_meta_data ->> 'role')
  execute function private.handle_auth_user_role_change();
