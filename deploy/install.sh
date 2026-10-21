#!/bin/sh
# One-shot installer for a fresh Debian/Ubuntu VPS. Safe to run again to update.
#
#   sh deploy/install.sh                      # serve on http://<server-ip>
#   sh deploy/install.sh maps.example.com     # serve on https://maps.example.com
set -eu

domain="${1:-}"
cd "$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    exec sudo -E sh "$0" "$@"
  fi
  echo "Run this script as root (or install sudo)." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose plugin is missing. Install 'docker-compose-plugin' and run again." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi
if [ -n "$domain" ]; then
  # Keep other settings in .env; only replace the address.
  grep -v '^SITE_ADDRESS=' .env > .env.tmp || true
  { echo "SITE_ADDRESS=$domain"; cat .env.tmp; } > .env
  rm -f .env.tmp
fi

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
fi

if [ -d .git ] && command -v git >/dev/null 2>&1; then
  git pull --ff-only || echo "Could not update the source; building what is here."
fi

docker compose up -d --build

echo "Waiting for YDMing to start..."
for _ in $(seq 1 60); do
  if docker compose exec -T ydming node -e "fetch('http://127.0.0.1:5173/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    address=$(grep '^SITE_ADDRESS=' .env | cut -d= -f2-)
    case "$address" in
      :*|"") echo "YDMing is running: http://$(curl -fsS https://api.ipify.org 2>/dev/null || echo '<your-server-ip>')" ;;
      *) echo "YDMing is running: https://$address (the certificate can take a minute to appear)" ;;
    esac
    exit 0
  fi
  sleep 2
done
echo "YDMing did not become healthy. Check: docker compose logs" >&2
exit 1
