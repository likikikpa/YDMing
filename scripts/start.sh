#!/bin/sh
set -eu

# Works from any directory, including paths containing spaces. Invoke with sh
# so extracted ZIPs do not need to preserve executable permission bits.
project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$project_dir"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf '%s\n' 'Install Node.js 24 LTS and npm, then run this launcher again.' >&2
  exit 1
fi
node scripts/check-runtime.mjs
if [ ! -d node_modules ]; then
  npm ci
fi
npm run build
exec node server.mjs
