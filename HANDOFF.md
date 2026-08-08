# JEFARELID System — Handoff & Runbook

Practical setup and status doc for anyone picking up this project. For *what*
the system is and *why*, read `SPEC.md`, `API-CONTRACT.md`, and `CLAUDE.md`.
For *how the pieces connect* (request lifecycle, module map, data flow, diagrams),
read **`ARCHITECTURE.md`**. This file is kept current as each build step lands.

---

## 1. What this is

Internal, staff-only web app that replaces JEFARELID Corp.'s Excel workbook for
building/room rental management. Three-tier and physically separated:

- **`Backend/`** — NestJS + Prisma + PostgreSQL (application + database layers). Port **3001**.
- **`Frontend/`** — Next.js App Router + TypeScript + Tailwind + shadcn/ui (presentation). Port **3000**.
- They talk over HTTP only, per `API-CONTRACT.md`. Base API URL: `http://localhost:3001/api`.

---

## 2. Prerequisites

| Tool | Version used here | Notes |
|---|---|---|
| Node.js | 25.x (18.18+ works) | |
| npm | 11.x | |
| PostgreSQL | 15, running on `localhost:5432` | A DB named `jefarelid` is created automatically by the first migration. |

---

## 3. First-time setup

### Backend
```bash
cd Backend
cp .env.example .env          # then edit DATABASE_URL to match your Postgres
npm install
npx prisma migrate dev        # creates the DB, applies migrations, AND seeds
```
`migrate dev` runs the seed automatically. To reseed on demand later:
```bash
npm run prisma:seed
```

### Frontend
```bash
cd Frontend
cp .env.example .env.local
npm install
```

---

## 4. Running it (day to day)

```bash
# Terminal 1 — backend (http://localhost:3001)
cd Backend && npm run start:dev

# Terminal 2 — frontend (http://localhost:3000)
cd Frontend && npm run dev
```
Open http://localhost:3000. The home page shows a live backend health check.

Health check directly: `GET http://localhost:3001/api/health` → `{ "status": "ok", "timestamp": "..." }`

---

## 5. Seeded data & login

Seed produces (idempotent — safe to re-run): 2 buildings, 6 rooms, 4 tenants,
3 active contracts, 1 super admin, 2 admins, and the `settings` rows (VAT/WHT/
escalation rates, notification lead days, invoice generation day).

**Accounts** — all use password **`ChangeMe123!`** (dev only; change before any real use):

| Role | Email |
|---|---|
| Super Admin | `owner@jefarelid.test` |
| Admin | `secretary1@jefarelid.test` |
| Admin | `secretary2@jefarelid.test` |

Login is live. Super Admin sees the Dashboard, Audit, Settings, and Users areas;
Admins see everything except those. Enforcement is server-side (guards); the
hidden nav is cosmetic.

---

## 6. Config / environment

All config comes from `.env` files (never hardcoded). Keep `.env.example`
current in both projects.

**Backend `.env`**: `PORT`, `DATABASE_URL`, `CORS_ORIGIN`, `SESSION_SECRET`, `SMTP_*`
**Frontend `.env.local`**: `NEXT_PUBLIC_API_URL`

Run the backend unit tests (computation core): `cd Backend && npm test`.

---

## 7. Build progress (SPEC §8)

Each step ends with something you can click, and is reviewed before the next starts.

| Step | Description | Status |
|---|---|---|
| 0 | Scaffold both apps, CORS, `/api/health` | ✅ Done |
| 1 | Prisma schema, migrations, seed | ✅ Done |
| 2 | Auth end-to-end (session + guards, login, route protection) | ✅ Done |
| 3 | Audit middleware (Prisma extension) + audit trail UI | ✅ Done |
| 4 | Buildings & rooms (API + UI) | ✅ Done |
| 5 | Tenants (API + UI) | ✅ Done |
| 6 | Contracts & lifecycle (API + UI) | ✅ Done |
| 7 | Computation module + unit tests (13 pass, no UI) | ✅ Done |
| 8 | Invoices & payments (API + UI) | ✅ Done |
| 9 | Utilities (API + UI) | ✅ Done |
| 10 | Reports & exports (JSON + Excel; PDF via puppeteer) | ✅ Done |
| 11 | Dashboard (Super Admin, Recharts) | ✅ Done |
| 12 | Notifications & cron (daily 08:00, SMTP) | ✅ Done |
| 13 | Excel historical import (script scaffold) | ✅ Done |
| + | Users & Settings (Super Admin) | ✅ Done |

### Step 0 notes
- Backend: global `/api` prefix, CORS allows `localhost:3000` with credentials, health module only.
- Frontend: `create-next-app` rejects capital folder names, so the package is named `jefarelid-frontend` while living in `Frontend/`. Axios instance in `src/lib/api/` uses `withCredentials: true`; components call typed wrappers, never Axios directly.
- Stack versions are current-generation: **Next 16, React 19, Tailwind v4, shadcn v4 (Base UI–based)**. shadcn design tokens live in `Frontend/src/app/globals.css` and are the single source of truth for the system-wide theme (light + dark).

### Architecture notes
- **Response envelope** — every success is `{ data }` (lists add `meta`); every error is `{ error: { code, message, details } }` with stable `code`s (`Backend/src/common/http/api-codes.ts`). `/api/health` is the only unwrapped route.
- **Auth** — session in Postgres (`session` table, Prisma-owned), httpOnly `sameSite=lax` cookie, 8h rolling expiry, bcrypt, 5-attempt lockout (15 min). Guards: `SessionGuard` then `RolesGuard`, applied globally.
- **Audit** — a Prisma Client **extension** (`src/common/audit/`) logs every request-driven create/update/delete automatically, with `passwordHash` redacted, via an `AsyncLocalStorage` request context. Append-only (no write endpoints). Business services inject the audited client under the `PRISMA` token.
- **Money** — `Decimal` in the DB, `decimal.js` in logic, **strings over the wire** (2 dp), rounded at each step. The computation module (`src/modules/computation/`) is pure (no Prisma/Nest) and unit-tested first.

### Decisions encoded for the SPEC §9 open items (confirm with client)
All are marked `TODO: confirm with client` in code and behind settings/constants — none are silently buried.
- **WHT base = net of VAT** (`effective_basic_rent × wht_rate`) — per CLAUDE.md. Change in one place in `computation.ts`.
- **Escalation = compound, anniversary-based** — `escalate()` supports a `'simple'` mode; cadence is in `escalationPeriods()`. Change there if the Excel differs.
- **Payment due day = per-contract** (`payment_due_day` column).
- **Utilities are NOT passed through to tenants** (company expense ledger, per SPEC 6.10).
- **Security-deposit settlement on termination** — termination records reason/date and frees the room; the refund/forfeiture math is a `TODO` in `contracts.service.terminate()` awaiting the client's rule.
- **Historical import scope** — `scripts/import-historical.ts` has an `IMPORT_MODE` flag (`full` | `opening-balances`) and placeholder column names to map to the real workbook.

### Verified during the build
- Auth flow (401 → login → me → change-password validation → logout → 401); audit row on an authenticated write with redaction; role 403 for Admins on Super-Admin routes.
- Buildings occupancy + `BUILDING_HAS_ROOMS`; create/delete auto-audited.
- **13 computation unit tests pass** (`npm test`), incl. the exact API-CONTRACT worked example.
- Full invoice flow: escalated frozen amounts (35000 → 36750 net 39322.50), partial payment → balance, and `INVOICE_ALREADY_EXISTS` / `DUPLICATE_OR_NUMBER` / `OVERPAYMENT` / aged outstanding.
- All 18 backend modules boot; dashboard aggregates; Excel export streams; both apps build + typecheck; frontend serves.

---

## 8. Follow-ups before production

- **PDF export** — enabled. `puppeteer` is a dependency (downloads Chromium on install) and `toPdf()` renders the report HTML to A4. Verified end-to-end (`GET /reports/occupancy?format=pdf` → `application/pdf`). If Chromium is ever missing on a host, `format=pdf` still fails gracefully with a clear 501; `xlsx`/`json` are unaffected.
- **Security deposit** rule, **historical-import** column mapping, and the other §9 items above need client confirmation.
- **Production hardening** — set a strong `SESSION_SECRET`, serve over HTTPS and set the session cookie `secure: true`, and provision a real SMTP host.

## 8a. Post-build fixes (UI polish)

- **Dropdowns showed raw values** — Base UI's `<Select.Value>` renders the raw selected value (a building **id**, or an enum like `vacant`/`super_admin`) unless `<Select.Root>` is given an `items` prop mapping values → labels. Added `items` to every `Select` (contracts/new, utilities, invoices, contracts list, reports, users, room-form-dialog) so triggers show human labels.
- **Audit IP was `::1` / `::ffff:127.0.0.1`** — normalized loopback to `127.0.0.1` at capture (`main.ts` `clientIp()`) and on display (`audit/page.tsx` `formatIp()`, which also cleans pre-existing rows).
- **A building with rooms could never be deleted** — "delete room" only ever soft-deleted (`isActive:false`), the row stayed, and building delete counted *all* rooms, so `roomCount` never reached 0 → permanent dead-end. Now **smart delete**, keyed on real financial records (invoices), not the mere existence of a contract:
  - `rooms.service.remove()` — active contract → blocked (`ROOM_HAS_CONTRACTS`); any contract with invoice history → kept + marked inactive (protects frozen invoices, SPEC 6.4); otherwise the room is removed outright and its empty draft/terminated contracts are cleared first (Contract's only inbound FKs are `RentalInvoice` and the renewal self-relation, so an invoice-free delete is safe).
  - `buildings.service.remove()` — still 409 `BUILDING_HAS_ROOMS` while rooms remain; then 409 `BUILDING_HAS_UTILITY_HISTORY` if any utility bill was paid; otherwise unpaid utility bills are cleared and the building is deleted. New `BUILDING_HAS_UTILITY_HISTORY` code added to `api-codes.ts` + `API-CONTRACT.md`.
  - Frontend copy updated ("Deactivate" → "Remove") and the new utility-history error surfaced.
- **Tenants had no delete at all** — no DELETE endpoint, no UI control (not even deactivate). Added the same smart-delete: `DELETE /tenants/:id` → active contract blocks (409 `TENANT_HAS_ACTIVE_CONTRACT`); invoice history → kept + `status: inactive`; never billed → removed outright (empty contracts cleared first). New code in `api-codes.ts` + `API-CONTRACT.md`; Delete button + confirm added to the tenant detail page. Verified end-to-end (409 block / deactivate-with-history / hard-delete → 404).

## 9. Known warnings (non-blocking)
- **Prisma `$use` removed in v6** — auditing uses the Client extension API instead (documented above).
- Stray `C:\Users\Dominic\package-lock.json` on the machine; `turbopack.root` is pinned so Next no longer warns.
