#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_HOME="$(mktemp -d)"
FAKEBIN="$(mktemp -d)"
LOG_FILE="$(mktemp)"
PORT="${PORT:-5050}"

cleanup() {
  if [[ -n "${PID:-}" ]] && kill -0 "$PID" 2>/dev/null; then
    kill "$PID" || true
    wait "$PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_HOME" "$FAKEBIN"
  rm -f "$LOG_FILE"
}
trap cleanup EXIT

cat > "$FAKEBIN/gh" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-} ${2:-}" == "auth status" ]]; then
  echo "Logged in to github.com as test"
  exit 0
fi
exit 0
EOF
chmod +x "$FAKEBIN/gh"

cat > "$FAKEBIN/claude" <<'EOF'
#!/usr/bin/env bash
if [[ "${1:-}" == "--version" ]]; then
  echo "claude 1.0.0"
  exit 0
fi
exit 0
EOF
chmod +x "$FAKEBIN/claude"

cd "$ROOT_DIR"
HOME="$TMP_HOME" PATH="$FAKEBIN:$PATH" NODE_ENV=production node bin/lgtmai.js >"$LOG_FILE" 2>&1 &
PID=$!

HEALTH_READY=0
for _ in {1..120}; do
  if curl -sSf "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    HEALTH_READY=1
    break
  fi
  sleep 0.25
done

if [[ "$HEALTH_READY" -ne 1 ]]; then
  echo "backend did not become healthy on port ${PORT}"
  echo "=== recent logs ==="
  sed -n '1,200p' "$LOG_FILE"
  exit 1
fi

echo "=== health ==="
curl -sS "http://127.0.0.1:${PORT}/health"
echo

echo "=== projects ==="
PROJECTS_RESPONSE="$(curl -sS -w $'\n%{http_code}' "http://127.0.0.1:${PORT}/api/projects")"
PROJECTS_BODY="$(echo "$PROJECTS_RESPONSE" | sed '$d')"
PROJECTS_CODE="$(echo "$PROJECTS_RESPONSE" | tail -n 1)"
echo "status: $PROJECTS_CODE"
echo "body: $PROJECTS_BODY"
echo

echo "=== key logs ==="
grep -E "Prerequisite tool checks passed|All checks passed|Backend server running|Failed to apply startup database migrations|DriverAdapterError|no such table" "$LOG_FILE" || true
if grep -E "Prerequisite tool checks passed|All checks passed" "$LOG_FILE" >/dev/null; then
  echo "note: prerequisite checks only validate gh/claude CLI availability, not DB readiness"
fi

if [[ "$PROJECTS_CODE" != "200" ]]; then
  echo
  echo "fresh-run verification failed: /api/projects returned $PROJECTS_CODE"
  exit 1
fi

if grep -E "DriverAdapterError|no such table|Failed to apply startup database migrations" "$LOG_FILE" >/dev/null; then
  echo
  echo "fresh-run verification failed: migration-related errors found in logs"
  exit 1
fi

echo
echo "fresh-run verification passed"
