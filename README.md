# JEFARELID — Building & Room Rental Management System

Internal, staff-only web app that manages buildings, rooms, tenants, leases, rent
invoicing/payments, and utility bills — with reports, a dashboard, in-app alerts,
and a full audit trail.

- **Backend/** — NestJS + Prisma + PostgreSQL (API, port 3001)
- **Frontend/** — Next.js + Tailwind + shadcn/ui (UI, port 3000)

> Deeper docs: **`ARCHITECTURE.md`** (how it connects), **`HANDOFF.md`** (status +
> decisions), **`API-CONTRACT.md`** (endpoints), **`SPEC.md`** (requirements).

---

## Prerequisites

- **Node.js** 18.18+ (works on 20/22/25)
- **PostgreSQL** 15+ running locally on `localhost:5432`
- **npm**

---

## Setup (first time)

Clone, then set up each side. **`.env` files are not in the repo** — copy them from
the `.env.example` templates and adjust to your machine.

### 1. Backend

```bash
cd Backend
cp .env.example .env          # then edit DATABASE_URL to match your Postgres
npm install
npx prisma migrate dev        # creates the DB, applies migrations, and seeds demo data
npm run start:dev             # → http://localhost:3001
```

`.env` values to check:
- `DATABASE_URL` — e.g. `postgresql://postgres:postgres@localhost:5432/jefarelid?schema=public`
- `SESSION_SECRET` — any long random string
- `CORS_ORIGIN` — leave as `http://localhost:3000`

### 2. Frontend (in a second terminal)

```bash
cd Frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL should be http://localhost:3001/api
npm install
npm run dev                    # → http://localhost:3000
```

Open **http://localhost:3000** and sign in.

---

## Seeded logins (demo data)

All use password **`ChangeMe123!`**:

| Role | Email |
|---|---|
| Super Admin | `owner@jefarelid.test` |
| Admin | `secretary1@jefarelid.test` |
| Admin | `secretary2@jefarelid.test` |

To reseed demo data anytime: `cd Backend && npm run prisma:seed`.

---

## Handy commands

```bash
# Backend
npm run start:dev        # run API with hot reload
npm test                 # computation unit tests
npx prisma studio        # browse the database in a GUI

# Frontend
npm run dev              # run UI with hot reload
npm run build            # production build / typecheck
```

---

## Notes

- **Money** is stored as precise decimals and sent as strings — no floating-point
  errors; the frontend never does math.
- **Invoices are frozen** at generation; changing a rate never rewrites old invoices.
- **Everything is role-checked server-side and audited** automatically.
- Tax/escalation rates live in the **Settings** page, never in code.
