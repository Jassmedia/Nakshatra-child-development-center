-- =============================================================================
-- Tiny test toolkit (plain SQL, no pgTAP needed).
-- Runs inside the runner's transaction, which is ROLLED BACK at the end,
-- so nothing here is left behind in the database.
-- =============================================================================

create schema tests;
grant usage on schema tests to public;

-- Pretend to be a logged-in Supabase user (what PostgREST does for each API request).
create function tests.login_as(p_user_id uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end;
$$;

-- Pretend to be an anonymous visitor (no login).
create function tests.login_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end;
$$;

-- Back to the superuser used for fixtures (no JWT => auth.uid() is NULL).
create function tests.logout() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create function tests.ok(p_condition boolean, p_message text) returns void language plpgsql as $$
begin
  if p_condition is not true then
    raise exception 'FAIL: %', p_message;
  end if;
  raise notice 'ok - %', p_message;
end;
$$;

create function tests.eq(p_actual anyelement, p_expected anyelement, p_message text) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % (expected %, got %)', p_message, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_message;
end;
$$;

-- Asserts that running p_sql raises an error (optionally with a specific SQLSTATE).
create function tests.throws(p_sql text, p_message text, p_sqlstate text default null) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_sqlstate is not null and sqlstate <> p_sqlstate then
      raise exception 'FAIL: % (expected SQLSTATE %, got %: %)', p_message, p_sqlstate, sqlstate, sqlerrm;
    end if;
    raise notice 'ok - % [%]', p_message, sqlerrm;
    return;
  end;
  raise exception 'FAIL: % (statement did not raise an error)', p_message;
end;
$$;

-- Number of rows a write statement actually affected (RLS silently filters UPDATE/DELETE).
create function tests.rows_affected(p_sql text) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on all functions in schema tests to public;
