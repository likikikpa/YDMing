#!/bin/sh
set -eu

# Linux/macOS launcher: installs dependencies if missing, builds YDMing,
# serves it on http://127.0.0.1:${PORT:-5173} and opens it in the browser.
# Run with: sh start.sh   (set PORT=5174 to use another port)
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$project_dir"

port=${PORT:-5173}
url="http://127.0.0.1:$port"

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    open "$url"
  else
    printf 'Open %s in your browser.\n' "$url"
  fi
}

is_running() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS --max-time 2 "$url" 2>/dev/null | grep -q '<title>YDMing'
  else
    node -e "fetch(process.argv[1]).then(r=>r.text()).then(t=>process.exit(/<title>\s*YDMing/.test(t)?0:1),()=>process.exit(1))" "$url"
  fi
}

if is_running; then
  printf 'YDMing is already running at %s\n' "$url"
  open_browser
  exit 0
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' 'Install Node.js 24 LTS and npm, then run this launcher again.' >&2
  exit 1
fi
node scripts/check-runtime.mjs
if [ ! -d node_modules ]; then
  printf '%s\n' 'Installing dependencies (internet required on first launch)...'
  npm ci
fi
printf '%s\n' 'Building YDMing...'
npm run build

HOST=127.0.0.1 PORT=$port node server.mjs &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' INT TERM EXIT

tries=0
until is_running; do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    printf '%s\n' 'YDMing did not start.' >&2
    exit 1
  fi
  tries=$((tries + 1))
  if [ "$tries" -ge 100 ]; then
    printf '%s\n' 'YDMing did not respond in time.' >&2
    exit 1
  fi
  sleep 0.2
done

printf 'YDMing is ready: %s\nPress Ctrl+C to stop it.\n' "$url"
open_browser
wait "$server_pid"
