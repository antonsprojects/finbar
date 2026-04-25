#!/usr/bin/env bash
# Schrijft /opt/finbar/.env op de server (aangeroepen na git pull in CI).
# Niet in de GitHub inline SSH-heredoc: appleboy/drone-ssh split daar regels, waardoor
# "python3 <<'PY'"+ vervolgregels in Python-stdin of de shell per ongeluk eindigen.
set -euo pipefail
: "${FINBAR_POSTGRES_PASSWORD:?FINBAR_POSTGRES_PASSWORD is unset}"
: "${FINBAR_JWT_SECRET:?FINBAR_JWT_SECRET is unset}"
: "${FINBAR_IMAGE:?FINBAR_IMAGE is unset}"
export PUBURL="${FINBAR_PUBLIC_APP_URL:-https://finbar.diversepersonality.com}"

python3 <<'PY'
import os, urllib.parse, pathlib

pw = os.environ["FINBAR_POSTGRES_PASSWORD"]
enc = urllib.parse.quote(pw, safe="")
dbu = f"postgresql://finbar:{enc}@postgres:5432/finbar"
lines = [
    "NODE_ENV=production",
    "HOST=0.0.0.0",
    "PORT=3001",
    "STATIC_DIR=/app/static",
    "POSTGRES_USER=finbar",
    f"POSTGRES_PASSWORD={pw}",
    "POSTGRES_DB=finbar",
    f"DATABASE_URL={dbu}",
    f"JWT_SECRET={os.environ['FINBAR_JWT_SECRET']}",
    f"PUBLIC_APP_URL={os.environ.get('PUBURL', 'https://finbar.diversepersonality.com')}",
    f"FINBAR_IMAGE={os.environ['FINBAR_IMAGE']}",
]
for k, label in (("FINBAR_RESEND_API_KEY", "RESEND_API_KEY"), ("FINBAR_RESEND_FROM", "RESEND_FROM")):
    v = os.environ.get(k) or ""
    if v.strip():
        lines.append(f"{label}={v}")
p = pathlib.Path(".env")
p.write_text("\n".join(lines) + "\n", encoding="utf-8")
p.chmod(0o600)
PY
