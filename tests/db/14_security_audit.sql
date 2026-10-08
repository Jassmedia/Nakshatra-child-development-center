-- =============================================================================
-- Stage 12: schema-wide security audit. These checks scan EVERYTHING, so a
-- future table/function that forgets RLS, grants or search_path fails here.
-- =============================================================================
select tests.logout();

select tests.eq(
  (select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity),
  null, 'every table in public has Row Level Security enabled');

select tests.eq(
  (select string_agg(distinct table_name || ':' || privilege_type, ', ') from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'anon'),
  null, 'anonymous visitors have no privileges on any table');

select tests.eq(
  (select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  null, 'anonymous visitors cannot execute any public function');

select tests.eq(
  (select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'S'
     and (has_sequence_privilege('anon', c.oid, 'usage') or has_sequence_privilege('authenticated', c.oid, 'usage'))),
  null, 'numbering sequences cannot be used directly by clients');

select tests.eq(
  (select string_agg(table_name, ', ' order by table_name) from information_schema.role_table_grants
   where table_schema = 'public' and grantee = 'authenticated' and privilege_type = 'DELETE'),
  'parents, staff_details, student_parents',
  'logged-in users can delete only from parents / staff_details / student_parents (admin-only policies); all history tables are delete-proof');

select tests.eq(
  (select string_agg(n.nspname || '.' || p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
  null, 'every SECURITY DEFINER function pins search_path (no hijacking)');

select tests.eq(
  (select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'p')
     and not exists (select 1 from pg_policy pol where pol.polrelid = c.oid)),
  null, 'every table has at least one policy (RLS on with no policy would hide data silently)');

select tests.ok(not has_schema_privilege('anon', 'private', 'usage'), 'anonymous cannot even see the private schema');

-- Every child-related table (has student_id) has a SELECT policy that checks access per child.
select tests.eq(
  (select string_agg(c.relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
     and exists (select 1 from pg_attribute a where a.attrelid = c.oid and a.attname = 'student_id' and not a.attisdropped)
     and not exists (
       select 1 from pg_policy pol where pol.polrelid = c.oid and pol.polcmd in ('r', '*')
         and pg_get_expr(pol.polqual, pol.polrelid) ~ '(can_view_student|can_manage_student|is_parent_of|is_admin|recipient_id = )'
     )),
  null, 'every child-related table restricts reads per child (or to the recipient only)');
