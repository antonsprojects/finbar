# Finbar op een VPS (Docker + GitHub Actions)

Korte route voor o.a. `finbar.diversepersonality.com` op je eigen server met **Docker**, **Postgres in Compose**, en **CI/CD** via **GitHub Container Registry (ghcr.io)** en **SSH-deploy**.

## 1. Eenmalig op de VPS

- **DNS:** A-record (of AAAA) voor `finbar.diversepersonality.com` → IP van de VPS.
- **Docker** + **Docker Compose plugin** geïnstalleerd.
- **Reverse proxy (TLS):** Caddy of Nginx vóór de app. Zie `deploy/Caddyfile.example`: proxy naar `127.0.0.1:8080` (of de poort in `FINBAR_PUBLISH_PORT`).

Repository op de server (bijv.):

```bash
sudo mkdir -p /opt/finbar && sudo chown "$USER:$USER" /opt/finbar
cd /opt/finbar
git clone <jouw-repo-url> .
cp deploy/.env.production.example .env
nano .env   # wachtwoorden, JWT_SECRET (≥32 tekens), PUBLIC_APP_URL, DATABASE_URL, FINBAR_IMAGE, …
```

Zet in `.env` o.a.:

- `FINBAR_IMAGE` = exact het image dat CI pusht, bijv. `ghcr.io/jouwhandle/finbar:latest` (GitHub-naam in **kleine letters**).
- `DATABASE_URL` = `postgresql://finbar:HETZELFDE_WACHTWOORD@postgres:5432/finbar` (hostnaam `postgres` = servicenaam in Compose).
- `POSTGRES_PASSWORD` = hetzelfde wachtwoord als in `DATABASE_URL`.
- `JWT_SECRET` = minstens 32 willekeurige tekens in productie.
- `PUBLIC_APP_URL` = `https://finbar.diversepersonality.com` (zonder trailing slash).

Eerste start:

```bash
cd /opt/finbar
export FINBAR_IMAGE=ghcr.io/jouwhandle/finbar:latest
FINBAR_IMAGE="$FINBAR_IMAGE" docker compose -f deploy/compose.production.yaml up -d
```

*(Of log in op ghcr om een privé-image te pullen, zie §3.)*

## 2. GitHub Actions: image bouwen

De workflow **Build & deploy** (`.github/workflows/deploy.yml`):

- Bouwt de image en pusht naar `ghcr.io/<jouw-github-org-of-user>/<reponaam-kleine-letters>:latest` bij elke push naar `main`.
- Deploy naar de VPS draait **alleen** als:
  - je **handmatig** “Run workflow” kiest, **of**
  - je in GitHub **Settings → Secrets and variables → Actions → Variables** de variabele `ENABLE_VPS_DEPLOY` op `true` zet (dan ook bij elke push naar `main`).

Zorg dat onder **Settings → Actions → General** de workflow-machtiging “Read and write” voor **packages** aan staat (voor push naar ghcr.io).

## 3. GitHub: secrets voor SSH-deploy

| Secret | Inhoud |
|--------|--------|
| `VPS_HOST` | Hostnaam of IP van de VPS |
| `VPS_USER` | SSH-gebruiker |
| `VPS_SSH_KEY` | Private key (inhoud `~/.ssh/id_ed25519`) |
| `VPS_DEPLOY_PATH` | Optioneel, standaard `/opt/finbar` — pad waar de repo (met `deploy/compose.production.yaml`) staat |
| `GHCR_READ_TOKEN` | Alleen als het package op ghcr **privé** is: PAT met `read:packages` om `docker pull` te doen op de server |
| `VPS_SSH_KEY_PASSPHRASE` | Alleen als de SSH-key met passphrase is beveiligd |

Bij publieke image `finbar` op ghcr is **geen** `GHCR_READ_TOKEN` nodig als pull zonder login mag.

## 4. Lokaal dezelfde image testen (optioneel)

```bash
docker build -t finbar:local .
# Zonder .env: alleen snelle API/SPA-check; voor echte app Postgres + .env nodig
```

## 5. Problemen

- **CORS / cookies:** `PUBLIC_APP_URL` moet exact de URL in de browser zijn (https, goed domein). Zelfde site als de API: fetch gaat naar `/api` (same origin).
- **Migraties** draaien bij elke container-start (`prisma migrate deploy`). Nieuwe migraties: commit + deploy + wacht tot Postgres bereikbaar is.
- **Poort in Compose** publiceert alleen `127.0.0.1:8080:3001` (standaard) — je proxy moet dus lokaal naar 8080, niet rechtstreeks naar het internet de Node-poort blootstellen.
