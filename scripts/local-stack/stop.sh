#!/usr/bin/env bash
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
WORK="${STACK_DIR:-$REPO/.local-stack}"
PGBIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -n1)}"
pkill -f "$WORK/bin/postgrest" 2>/dev/null
pkill -f "$WORK/bin/auth" 2>/dev/null
pkill -f "$HERE/gateway.mjs" 2>/dev/null
if [[ -d "$WORK/pgdata" ]]; then
  if [[ "$(id -u)" == "0" ]]; then runuser -u postgres -- "$PGBIN/pg_ctl" -D "$WORK/pgdata" -m fast stop; else "$PGBIN/pg_ctl" -D "$WORK/pgdata" -m fast stop; fi
fi
exit 0
