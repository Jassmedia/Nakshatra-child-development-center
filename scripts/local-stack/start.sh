#!/usr/bin/env bash
# =============================================================================
# Docker-free "mini Supabase" for Linux (CI and quick local testing):
#   PostgreSQL 16  +  Supabase Auth (GoTrue)  +  PostgREST  +  a tiny gateway on :54321
# It behaves like the real thing for this app (same Auth server, same REST API,
# same 1000-row cap). For day-to-day development on Windows/macOS prefer
# `npx supabase start` (Docker Desktop).
#
#   scripts/local-stack/start.sh [--reset]     # --reset = fresh database
#   scripts/local-stack/stop.sh
#
# Writes .env.local for the app if it does not exist.
# =============================================================================
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
WORK="${STACK_DIR:-$REPO/.local-stack}"
PGBIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1)}"
AUTH_VERSION="${AUTH_VERSION:-v2.180.0}"
PGRST_VERSION="${PGRST_VERSION:-v12.2.3}"
PORT=54322
JWT_SECRET="${LOCAL_JWT_SECRET:-local-only-jwt-secret-at-least-32-characters-long}"
export PGHOST=/tmp PGPORT=$PORT PGUSER=postgres
mkdir -p "$WORK/bin"

# Run postgres tools as the postgres user when we are root (containers), else as ourselves.
AS_PG=()
if [[ "$(id -u)" == "0" ]]; then AS_PG=(runuser -u postgres --); chown postgres "$WORK" 2>/dev/null || true; fi

# --- binaries ---------------------------------------------------------------------
if [[ ! -x "$WORK/bin/auth" ]]; then
  echo "downloading Supabase Auth $AUTH_VERSION"
  curl -fsSL "https://github.com/supabase/auth/releases/download/$AUTH_VERSION/auth-$AUTH_VERSION-x86.tar.gz" | tar xz -C "$WORK/bin"
fi
if [[ ! -x "$WORK/bin/postgrest" ]]; then
  echo "downloading PostgREST $PGRST_VERSION"
  curl -fsSL "https://github.com/PostgREST/postgrest/releases/download/$PGRST_VERSION/postgrest-$PGRST_VERSION-linux-static-x64.tar.xz" | tar xJ -C "$WORK/bin"
fi

"$HERE/stop.sh" >/dev/null 2>&1 || true
[[ "${1:-}" == "--reset" ]] && rm -rf "$WORK/pgdata"

FRESH=0
if [[ ! -d "$WORK/pgdata" ]]; then
  mkdir -p "$WORK/pgdata"
  [[ ${#AS_PG[@]} -gt 0 ]] && chown postgres "$WORK/pgdata"
  "${AS_PG[@]}" "$PGBIN/initdb" -D "$WORK/pgdata" -U postgres --auth=trust >/dev/null
  FRESH=1
fi
"${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$WORK/pgdata" -l "$WORK/pgdata/server.log" \
  -o "-p $PORT -k /tmp -c listen_addresses=127.0.0.1" -w start >/dev/null

if [[ $FRESH == 1 ]]; then
  psql -X -q -v ON_ERROR_STOP=1 <<'SQL'
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit password 'postgres';
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login createrole noinherit password 'postgres';
create schema auth authorization supabase_auth_admin;
alter role supabase_auth_admin set search_path = auth;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
SQL
fi

# --- Supabase Auth ------------------------------------------------------------------
API_EXTERNAL_URL=http://127.0.0.1:54321/auth/v1 GOTRUE_API_HOST=127.0.0.1 GOTRUE_API_PORT=9999 \
GOTRUE_DB_DRIVER=postgres GOTRUE_DB_NAMESPACE=auth \
DATABASE_URL="postgres://supabase_auth_admin:postgres@127.0.0.1:$PORT/postgres?sslmode=disable&search_path=auth" \
GOTRUE_SITE_URL=http://localhost:3000 GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://localhost:3100/**" \
GOTRUE_DISABLE_SIGNUP=true GOTRUE_JWT_SECRET="$JWT_SECRET" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated \
GOTRUE_JWT_ADMIN_ROLES=service_role GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=true \
GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=2500 GOTRUE_SMTP_ADMIN_EMAIL=noreply@nakshatra.local GOTRUE_SMTP_USER=x GOTRUE_SMTP_PASS=x \
GOTRUE_RATE_LIMIT_EMAIL_SENT=1000 GOTRUE_PASSWORD_MIN_LENGTH=8 GOTRUE_LOG_LEVEL=warn \
nohup "$WORK/bin/auth" > "$WORK/auth.log" 2>&1 &
for _ in $(seq 1 60); do curl -fs http://127.0.0.1:9999/health >/dev/null && break; sleep 0.5; done

if [[ $FRESH == 1 ]]; then
  psql -X -q -v ON_ERROR_STOP=1 -c "grant usage on schema auth to anon, authenticated, service_role; grant execute on all functions in schema auth to anon, authenticated, service_role;"
  for m in "$REPO"/supabase/migrations/*.sql; do
    echo "migrate $(basename "$m")"
    psql -X -q -v ON_ERROR_STOP=1 -f "$m" 2>&1 | grep -v NOTICE || true
  done
fi

# --- PostgREST (same 1000-row cap as Supabase) --------------------------------------
PGRST_DB_URI="postgres://authenticator:postgres@127.0.0.1:$PORT/postgres" PGRST_DB_SCHEMAS=public \
PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$JWT_SECRET" PGRST_SERVER_PORT=3001 PGRST_DB_MAX_ROWS=1000 \
nohup "$WORK/bin/postgrest" > "$WORK/postgrest.log" 2>&1 &

MAIL_LOG="$WORK/mail.log" nohup node "$HERE/gateway.mjs" > "$WORK/gateway.log" 2>&1 &
for _ in $(seq 1 40); do curl -fs http://127.0.0.1:54321/rest/v1/ >/dev/null 2>&1 && break; sleep 0.5; done

if [[ ! -f "$REPO/.env.local" ]]; then
  LOCAL_JWT_SECRET="$JWT_SECRET" node "$HERE/mkkeys.mjs" > "$REPO/.env.local"
  echo "wrote .env.local"
fi
echo "local stack ready: http://127.0.0.1:54321"
