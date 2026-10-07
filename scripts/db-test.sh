#!/usr/bin/env bash
# =============================================================================
# Database security test runner.
#
# Mode 1 (default): spins up a THROWAWAY PostgreSQL cluster in a temp directory,
#   applies a tiny Supabase stub + all migrations, runs tests/db/*.sql, then
#   deletes the cluster. Needs PostgreSQL server binaries (initdb, pg_ctl) and psql.
#
# Mode 2: TEST_DATABASE_URL=postgresql://... npm run test:db
#   Runs the tests against an existing database that ALREADY has the migrations
#   (e.g. local `supabase start` on port 54322). Everything runs inside ONE
#   transaction that is ROLLED BACK, so no test data is left behind.
#   Refuses to run against hosted Supabase (*.supabase.co / *.supabase.com).
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"
TESTS_DIR="$ROOT/tests/db"

# Builds one SQL script: begin; helpers; fixtures + tests; rollback.
build_test_script() {
  local out="$1"
  {
    echo '\set ON_ERROR_STOP on'
    echo '\pset tuples_only on'
    echo '\pset format unaligned'
    echo 'set client_min_messages = notice;'
    echo 'begin;'
    echo "\\i '$TESTS_DIR/setup/helpers.sql'"
    for f in "$TESTS_DIR"/[0-9]*.sql; do
      echo "\\echo '--- $(basename "$f")'"
      echo "\\i '$f'"
    done
    echo 'rollback;'
    echo "\\echo 'ALL DATABASE TESTS PASSED'"
  } >"$out"
}

run_tests() {
  local url="$1" script
  script="$(mktemp)"
  build_test_script "$script"
  # NOTICE lines starting with "ok -" are the individual passing assertions.
  psql "$url" -X -q -f "$script" 2>&1 | sed -e 's/^psql:[^ ]* NOTICE:  /  /' -e 's/^NOTICE:  /  /' -e '/^$/d'
  local status=${PIPESTATUS[0]}
  rm -f "$script"
  return "$status"
}

if [[ -n "${TEST_DATABASE_URL:-}" ]]; then
  if [[ "$TEST_DATABASE_URL" == *supabase.co* || "$TEST_DATABASE_URL" == *supabase.com* ]]; then
    echo "Refusing to run tests against a hosted Supabase database." >&2
    exit 1
  fi
  run_tests "$TEST_DATABASE_URL"
  exit $?
fi

# ---- Mode 1: throwaway cluster ------------------------------------------------
PG_BIN="${PG_BIN:-}"
if [[ -z "$PG_BIN" ]]; then
  if command -v pg_config >/dev/null 2>&1 && [[ -x "$(pg_config --bindir)/initdb" ]]; then
    PG_BIN="$(pg_config --bindir)"
  else
    PG_BIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1 || true)"
  fi
fi
if [[ -z "$PG_BIN" || ! -x "$PG_BIN/initdb" ]]; then
  echo "PostgreSQL server binaries not found. Install PostgreSQL, set PG_BIN, or use TEST_DATABASE_URL." >&2
  exit 1
fi

WORK_DIR="$(mktemp -d)"
PORT="${TEST_DB_PORT:-55432}"
AS_USER=()
# initdb refuses to run as root (e.g. inside containers): run the cluster as `postgres`.
if [[ "$(id -u)" == "0" ]]; then
  chown postgres "$WORK_DIR"
  AS_USER=(runuser -u postgres --)
fi

cleanup() {
  "${AS_USER[@]}" "$PG_BIN/pg_ctl" -D "$WORK_DIR/data" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

"${AS_USER[@]}" "$PG_BIN/initdb" -D "$WORK_DIR/data" -U postgres --auth=trust >/dev/null
"${AS_USER[@]}" "$PG_BIN/pg_ctl" -D "$WORK_DIR/data" -l "$WORK_DIR/pg.log" \
  -o "-p $PORT -k $WORK_DIR -c listen_addresses=''" -w start >/dev/null

URL="postgresql://postgres@/postgres?host=$WORK_DIR&port=$PORT"

echo "== Applying Supabase stub (local test cluster only)"
psql "$URL" -X -q -v ON_ERROR_STOP=1 -f "$TESTS_DIR/setup/supabase_stub.sql"

echo "== Applying migrations"
for m in "$MIGRATIONS_DIR"/*.sql; do
  echo "   $(basename "$m")"
  psql "$URL" -X -q -v ON_ERROR_STOP=1 -f "$m"
done

echo "== Running tests"
run_tests "$URL"
