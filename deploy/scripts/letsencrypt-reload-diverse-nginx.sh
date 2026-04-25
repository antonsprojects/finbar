#!/usr/bin/env bash
# After a successful certbot renew, reload Nginx in Docker so it picks up new certs.
#
# Install on the VPS (once, as root):
#   sudo install -m 755 deploy/scripts/letsencrypt-reload-diverse-nginx.sh \
#     /etc/letsencrypt/renewal-hooks/deploy/50-reload-diverse-nginx.sh
# Or symlink from the Diverse repo after git pull.
#
# Set if your Diverse app is not at the default path:
#   export DIVERSE_ROOT=/home/deployment_user/apps/diverse
#
# Certbot already schedules renewals on many systems (e.g. certbot.timer on Ubuntu).
# This hook only runs after a cert actually renews. If you use plain cron instead:
#   12 2,14 * * * certbot renew -q
# (Hooks still run; no need to reload nginx in the cron line itself.)

set -euo pipefail
DIVERSE_ROOT="${DIVERSE_ROOT:-$HOME/apps/diverse}"
if [[ ! -f "$DIVERSE_ROOT/docker-compose.yml" ]]; then
  echo "letsencrypt deploy hook: missing $DIVERSE_ROOT/docker-compose.yml" >&2
  exit 1
fi
cd "$DIVERSE_ROOT"
if docker compose exec -T nginx nginx -s reload 2>/dev/null; then
  exit 0
fi
docker compose restart nginx
