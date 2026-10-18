# Deploying to Railway

Hosts all three pieces in **one Railway project**: a **PostgreSQL** database, the
**Backend** (NestJS), and the **Frontend** (Next.js). The repo is already
Railway-ready — `Backend/railway.json` and `Frontend/railway.json` tell Railway
how to build and run each, migrations apply automatically on every backend deploy.

> Prerequisite: the repo is pushed to GitHub (it is: `Darling795/jefarelid-system`)
> and you have a Railway account.

---

## 1. Create the project + database

1. Railway → **New Project** → **Deploy PostgreSQL** (or New Project → empty, then
   **+ New → Database → PostgreSQL**). This gives a `DATABASE_URL`.

## 2. Backend service

1. In the project: **+ New → GitHub Repo** → pick the repo.
2. Open the service → **Settings → Root Directory → `Backend`**. (Railway then reads
   `Backend/railway.json`.)
3. **Variables** (service → Variables):
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference the Postgres service) |
   | `SESSION_SECRET` | a long random string — e.g. `openssl rand -hex 32` |
   | `COOKIE_SECURE` | `true` |
   | `CORS_ORIGIN` | *(fill in step 4, once the frontend has a domain)* |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | your real mail host (needed only for the notification cron) |
4. **Settings → Networking → Generate Domain**. Note it, e.g.
   `https://backend-production-xxxx.up.railway.app`.
   - The backend's public API base is that URL **+ `/api`**.

## 3. Frontend service

1. **+ New → GitHub Repo** → same repo.
2. Service → **Settings → Root Directory → `Frontend`**.
3. **Variables**:
   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://backend-production-xxxx.up.railway.app/api` (the backend domain **+ /api**) |
4. **Settings → Networking → Generate Domain** → note it, e.g.
   `https://frontend-production-yyyy.up.railway.app`.

> ⚠️ `NEXT_PUBLIC_API_URL` is baked in at **build time**. If the backend URL ever
> changes, redeploy the frontend.

## 4. Point the two at each other

1. Back on the **backend** service → set `CORS_ORIGIN` to the **exact** frontend
   URL: `https://frontend-production-yyyy.up.railway.app` (scheme + host, **no path,
   no trailing slash**).
2. Redeploy the backend (Railway does this automatically on a variable change).

## 5. Seed the login accounts (once)

The first backend deploy runs `prisma migrate deploy`, which creates all tables
(including the session table). It does **not** create the login users — do that
once with the Railway CLI from your machine:

```bash
npm i -g @railway/cli
railway login
railway link            # pick this project
# clean start (just the 3 logins + settings, no demo data):
railway run --service <backend-service-name> sh -c "SEED_DEMO=false npm run prisma:seed"
# …or WITH demo buildings/tenants to click around first:
railway run --service <backend-service-name> npm run prisma:seed
```

Accounts (password `ChangeMe123!` — **change immediately** after first login):
`owner@jefarelid.test`, `secretary1@jefarelid.test`, `secretary2@jefarelid.test`.

## 6. Open it

Visit the **frontend** URL, log in, done. Super Admin = "Admin" (owner),
secretaries = "Secretary".

---

## Known deployment follow-ups

- **PDF export (reports):** Puppeteer needs a Chromium that isn't in the default
  Nixpacks image, so `format=pdf` returns **501** until configured; `xlsx` and
  `json` work. To enable later, add `Backend/nixpacks.toml` installing Chromium
  and set `PUPPETEER_EXECUTABLE_PATH`.
- **File uploads (tenant/contract documents):** the container disk resets on each
  deploy. To persist uploads, add a **Volume** to the backend service (mount at
  e.g. `/data`) and set `UPLOAD_DIR=/data/uploads`.
- **Notification cron (daily 08:00):** only sends if `SMTP_*` points at a real
  host; otherwise it logs and no mail goes out.
- **Custom domain:** add it under each service's **Settings → Networking**, then
  update `CORS_ORIGIN` (backend) and `NEXT_PUBLIC_API_URL` (frontend) to match and
  redeploy.
