# Finbar op een VPS (Docker + GitHub Actions)

Korte route voor o.a. `finbar.diversepersonality.com` op je eigen server met **Docker**, **Postgres in Compose**, en **CI/CD** via **GitHub Container Registry (ghcr.io)** en **SSH-deploy**.

## 1. Eenmalig op de VPS

- **DNS:** A-record (of AAAA) voor `finbar.diversepersonality.com` → IP van de VPS.
- **Docker** + **Docker Compose plugin** geïnstalleerd.
- **Reverse proxy (TLS):** Nginx of Caddy vóór de app.
  - **Nginx:** voorbeeldbestand `deploy/nginx/finbar.conf.example` (proxy naar `127.0.0.1:8080` of `FINBAR_PUBLISH_PORT`).
  - **Caddy:** `deploy/Caddyfile.example`.

Repository op de server (bijv.):

```bash
sudo mkdir -p /opt/finbar && sudo chown "$USER:$USER" /opt/finbar
cd /opt/finbar
git clone <jouw-repo-url> .
```

**Met GitHub Actions (aanbevolen):** stel in §3 de secrets in (o.a. `FINBAR_POSTGRES_PASSWORD`, `FINBAR_JWT_SECRET`). Bij de eerste (of elke) deploy schrijft de workflow `/opt/finbar/.env` en zet `FINBAR_IMAGE` op het zojuist gebouwde image — je hoeft geen lege `.env` handmatig te vullen.

**Zonder CD / handmatig:** `cp deploy/.env.production.example .env` en vul `POSTGRES_PASSWORD`, `DATABASE_URL` (zelfde wachtwoord), `JWT_SECRET` (≥32 teken), `PUBLIC_APP_URL`, `FINBAR_IMAGE` in. Eerste start:

```bash
cd /opt/finbar
export FINBAR_IMAGE=ghcr.io/antonsprojects/finbar:latest
FINBAR_IMAGE="$FINBAR_IMAGE" docker compose -f deploy/compose.production.yaml up -d
```

*(Bij private ghcr: zie `GHCR_READ_TOKEN` in §3.)*

## 2. GitHub Actions: build + deploy (push → deploy)

De workflow **Build & deploy** (`.github/workflows/deploy.yml`):

- Bij elke **push naar `main`**: image bouwen en pushen naar `ghcr.io/<org>/<repo>:latest` (alles **kleine letters**).
- Daarna **automatisch deploy** over SSH: `git pull`, **`.env` op de server genereren** (uit secrets, zie §3), `docker pull` + `docker compose up` in `VPS_DEPLOY_PATH` (standaard `/opt/finbar`).

Zorg dat onder **Settings → Actions → General** de workflow-machtiging **Read and write** voor **packages** aanstaat (nodig om naar ghcr.io te pushen). De image-URL in de gegenereerde `.env` is altijd de tag die in diezelfde run is gepusht.

## 2b. Nginx + TLS (subdomein)

1. DNS A-record: `finbar.diversepersonality.com` → IP van de VPS.
2. Plaats een config op basis van `deploy/nginx/finbar.conf.example` (pas `server_name` en `upstream` poort 8080 aan indien nodig).
3. **Certbot (Let’s Encrypt), voorbeeld met Nginx-plugin:**

   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d finbar.diversepersonality.com
   ```

   Of eerst alleen HTTP-test zonder certificaat, daarna `certbot` om 443 in te stellen.
4. Herlaad Nginx: `sudo nginx -t && sudo systemctl reload nginx`

## 3. GitHub: secrets (SSH + `.env` op de server)

Gebruik **of** *repository secrets* (Settings → Actions → *Repository* secrets) **of** *environment* **production** (Settings → Environments). De deploy-job in `.github/workflows/deploy.yml` heeft `environment: production` — zet VPS- en `FINBAR_*`-geheimen dáár of als **repository** secrets; **alleen** in een *andere* environment-naam (zonder workflow aan te passen) levert geen `VPS_HOST` en faalt deploy met *missing server host*.

*Optioneel: voor environment `production` wacht- of goedkeuringsregels kunnen het deploystap pauzeren tot iemand in GitHub de run goedkeurt.*

| Secret | Verplicht? | Inhoud |
|--------|------------|--------|
| `VPS_HOST` | ja | Hostnaam of IP van de VPS (ssh-doel) |
| `VPS_USER` | ja | SSH-gebruiker |
| `VPS_SSH_KEY` | ja | Private key (bijv. `~/.ssh/id_ed25519` inhoud) |
| `VPS_SSH_KEY_PASSPHRASE` | nee | Alleen als de SSH-key een passphrase heeft |
| `VPS_DEPLOY_PATH` | nee | Standaard `/opt/finbar` — pad met repo + `deploy/compose.production.yaml` |
| `FINBAR_POSTGRES_PASSWORD` | **ja** | Wachtwoord voor Postgres in het Finbar-compose; workflow bouwt `DATABASE_URL` (URL-encoded) en zet `POSTGRES_PASSWORD` |
| `FINBAR_JWT_SECRET` | **ja** | Minimaal 32 willekeurige tekens; geen regeleindes in de secret |
| `FINBAR_PUBLIC_APP_URL` | nee | Standaard `https://finbar.diversepersonality.com` — zet alleen om af te wijken |
| `FINBAR_RESEND_API_KEY` | nee | Optioneel, Resend (wachtwoord-reset e-mail) |
| `FINBAR_RESEND_FROM` | nee | Optioneel, bijv. `Finbar <noreply@domein.tld>` (alleen zinvol met API-key) |
| `GHCR_READ_TOKEN` | nee | Alleen als het ghcr-package **privé** is: PAT met `read:packages` voor `docker pull` op de server |

Bij een **publiek** `finbar`-package op ghcr is **geen** `GHCR_READ_TOKEN` nodig.

Elke geslaagde deploy **overschrijft** `/opt/finbar/.env`. Lokale wijzigingen in `.env` op de server gaan dus verloren; voeg waarden of veranderingen in GitHub secrets toe of pas de workflow aan.

## 4. Lokaal dezelfde image testen (optioneel)

```bash
docker build -t finbar:local .
# Zonder .env: alleen snelle API/SPA-check; voor echte app Postgres + .env nodig
```

## 5. Problemen

- **CORS / cookies:** `PUBLIC_APP_URL` moet exact de URL in de browser zijn (https, goed domein). Zelfde site als de API: fetch gaat naar `/api` (same origin).
- **Migraties** draaien bij elke container-start (`prisma migrate deploy`). Nieuwe migraties: commit + deploy + wacht tot Postgres bereikbaar is.
- **Poort in Compose** publiceert alleen `127.0.0.1:8080:3001` (standaard) — je proxy moet dus lokaal naar 8080, niet rechtstreeks naar het internet de Node-poort blootstellen.
