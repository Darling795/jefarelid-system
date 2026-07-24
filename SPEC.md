# Building and Room Rental Management System

Client: JEFARELID CORP.
Type: Internal web application, three-tier architecture, local development.

---

## 1. Context

The client leases commercial space (drugstores, retail outlets) across ten buildings. All records currently live in one Excel workbook with three sheets:

- **Contracts Register** — lessee details, room specs, contract periods, computed rental fees
- **Receipts Journal** — monthly rent payments per tenant, 2019 to 2026
- **Utility Payment Journal** — telephone and internet bills per building, with voucher numbers and official receipts

This system replaces that workbook. Staff-only. Tenants have no login and no portal.

**Out of scope:** online payments, bank transfers, tenant self-service, general accounting or bookkeeping, residential leasing, maintenance requests.

---

## 2. Architecture

Three-tier, physically separated.

```
JERFALID SOFTWARE SYSTEM/
├── CLAUDE.md
├── SPEC.md
├── API-CONTRACT.md
├── Backend/            Application Layer + Database Layer
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   └── src/
│       ├── modules/    one folder per domain module
│       ├── common/     guards, interceptors, filters, decorators
│       └── main.ts
└── Frontend/           Presentation Layer
    └── src/
        ├── app/        routes and pages
        ├── components/
        └── lib/        api client, hooks, formatters
```

**Presentation Layer** — Frontend. Renders UI, collects input, calls the API. No business rules. No tax math. No direct database access.

**Application Layer** — Backend/src. All business logic, validation, computation, authorization, scheduled jobs.

**Database Layer** — Backend/prisma plus PostgreSQL. Schema, migrations, seed data.

The Frontend must never import from the Backend, and vice versa. Their only contact point is HTTP, defined in API-CONTRACT.md.

### Stack

**Backend:** NestJS, TypeScript, Prisma, PostgreSQL, express-session with a Postgres session store, bcrypt, class-validator, @nestjs/schedule, Nodemailer, ExcelJS, Puppeteer, decimal.js.

**Frontend:** Next.js (App Router), TypeScript, Tailwind, shadcn/ui, Recharts, TanStack Query, Axios.

### Local development

Backend on port 3001. Frontend on port 3000. Postgres on 5432.

CORS on the backend allows `http://localhost:3000` with credentials enabled. The frontend Axios instance sets `withCredentials: true`.

All URLs, ports, database connection strings, and SMTP settings come from `.env` files. Never hardcoded in application code. Both projects ship a `.env.example`.

---

## 3. Users and roles

**Super Admin** — the business owner, 1 account.
Full access. Financial dashboard, audit trail, user management, all reports.

**Admin** — secretarial staff, 2 accounts.
Data entry, monitoring, report generation. No dashboard, no audit trail, no user management.

Authorization is enforced by a guard on the backend. The frontend also hides unauthorized navigation, but that is cosmetic only. Every protected endpoint checks the role server-side. A frontend that forgets to hide a link must still get a 403.

---

## 4. Authentication

Email and password. bcrypt hashing.

Session-based, stored in Postgres. The session cookie is httpOnly and sameSite lax. On login the backend creates a session and sets the cookie; the frontend never reads or stores the session id itself.

- Account lockout after 5 consecutive failed attempts, unlocked by time or by Super Admin.
- Session expires after 8 hours of inactivity.
- Password reset is performed by the Super Admin only. There is no self-service email reset flow — three users total does not justify the surface area.
- Logout destroys the server-side session, not just the cookie.

---

## 5. Data model

Defined in `Backend/prisma/schema.prisma`.

### buildings
`id, name, address, notes, created_at, updated_at`

### rooms
`id, building_id, room_number, floor, area_sqm, base_rate, status (vacant | occupied | reserved), is_active`

Occupancy is derived from active contracts. The `status` column is a denormalized convenience field for list views, never the source of truth.

### tenants
`id, business_name, contact_person, contact_number, email, tin, address, status (active | inactive), notes`

### contracts
`id, tenant_id, room_id, start_date, end_date, basic_rent, escalation_rate, escalation_anchor_date, security_deposit, advance_payment, payment_due_day, status (draft | active | expiring | renewed | terminated | expired), parent_contract_id, termination_date, termination_reason`

`parent_contract_id` links a renewal to the contract it replaced. Renewals create new rows; they never mutate the old one.

### rental_invoices
`id, contract_id, period_month, basic_rent_applied, vat_amount, gross_rent, wht_amount, net_receivable, due_date, status (unpaid | partial | paid | overdue), generated_at`

All monetary fields are computed at generation time and frozen. Historical invoices are never recomputed from current rates.

### rental_payments
`id, invoice_id, amount_paid, payment_date, or_number, payment_method, remarks, recorded_by`

### utility_bills
`id, building_id, utility_type (telephone | internet), billing_period, amount, due_date, status (unpaid | paid | overdue)`

### utility_payments
`id, utility_bill_id, amount_paid, payment_date, voucher_number, or_number, recorded_by`

### users
`id, name, email, password_hash, role (super_admin | admin), is_active, last_login_at, failed_login_count, locked_until`

### audit_logs
`id, user_id, action (create | update | delete), entity_type, entity_id, before_json, after_json, ip_address, created_at`

Append-only. No update or delete endpoints. Ever.

### notifications
`id, type, entity_type, entity_id, recipient_user_id, sent_at, status, dedupe_key`

### settings
`id, key, value, description`

Holds VAT rate, WHT rate, default escalation rate, notification lead days. Philippine tax rates change; nothing tax-related is hardcoded.

**All money columns use Prisma `Decimal`. Never `Float`.**

---

## 6. Backend modules

One NestJS module per domain, each with controller, service, DTOs, and its own folder under `src/modules/`.

### 6.1 auth
Login, logout, current session, change password. Session guard and roles guard live in `src/common/guards/`.

### 6.2 users
Super Admin only. Create, deactivate, reset password for admin accounts.

### 6.3 buildings
CRUD. Cannot delete a building that has rooms.

### 6.4 rooms
CRUD, nested under building. List view returns current occupancy, current tenant, and contract end date. Rooms with contract history cannot be hard-deleted; set `is_active = false`.

### 6.5 tenants
CRUD. Detail endpoint returns all contracts current and historical, payment history, and current outstanding balance.

### 6.6 contracts
Create a contract linking a tenant to a room.

**Validation:** reject any contract whose date range overlaps an existing active contract on the same room.

**Lifecycle:** `draft → active → (expiring) → renewed | terminated | expired`

- `expiring` is derived, not set manually — `end_date` within 90 days
- Renewal creates a new contract row with `parent_contract_id` set, carrying forward the escalated rent as the new `basic_rent`
- Termination requires a reason and an effective date, and triggers security deposit settlement
- Archive endpoint lists expired and terminated contracts

### 6.7 computation

**This is the core of the system.** A pure module at `src/modules/computation/`. No Prisma imports. No NestJS decorators on the calculation functions themselves. It takes numbers and returns numbers.

Unit test it before wiring it to anything else.

**Escalation.** On each anniversary of `escalation_anchor_date`, basic rent increases by `escalation_rate`. The engine answers: given a contract and a target month, what is the effective basic rent?

**Per-invoice computation:**

```
effective_basic_rent = escalate(basic_rent, escalation_rate, months_elapsed)
vat_amount           = effective_basic_rent * VAT_RATE
gross_rent           = effective_basic_rent + vat_amount
wht_amount           = effective_basic_rent * WHT_RATE
net_receivable       = gross_rent - wht_amount
```

`VAT_RATE`, `WHT_RATE`, and the default escalation rate are read from the settings table and passed in as arguments. The computation module does not fetch them itself.

Use decimal arithmetic throughout. Never floating point for money. Round to two decimal places at each step, not only at the end, so stored values reconcile against a hand calculation.

> **Open question — confirm before finalising this module.** The source thesis defines WHT as 5% of gross rent. Standard Philippine practice computes the 5% expanded withholding tax on rent net of VAT. The formula above uses the net-of-VAT base. If the client's Excel uses the gross base, change it in one place in this module and nowhere else.

### 6.8 invoices
Monthly invoice generation for every active contract, run as a scheduled job on the 1st. Manual generation also available for corrections and backfills. Duplicate generation for the same contract and period is rejected.

### 6.9 payments
Record payments against invoices. Support partial payment. Invoice status updates automatically as payments land. Outstanding balance queries: per tenant, per building, portfolio-wide. Security deposits tracked separately from rent, applied against final billing on termination.

### 6.10 utilities
Per-building telephone and internet bills. Record the bill, then record payment with voucher number and OR number. Utilities are a company expense ledger per the source Excel, not allocated to individual tenants. Overdue tracking only.

### 6.11 notifications
Daily cron at 08:00 via `@nestjs/schedule`, delivered over SMTP. Recipients are admin users, never tenants.

Triggers:
- Contract expiring at 90, 60, and 30 days out
- Rent due in 3 days
- Rent overdue
- Utility bill due
- Utility bill overdue

Every send writes a row to `notifications` with a `dedupe_key` so the same alert cannot fire on consecutive days.

For local development, SMTP points at a local catcher (Mailhog or Ethereal). No real mail is sent during development.

### 6.12 dashboard
Super Admin only. Aggregate queries backing the frontend dashboard:
- Monthly income trend, billed against collected
- Occupancy rate, portfolio-wide and per building
- Outstanding receivables, aged into current / 30 / 60 / 90+
- Utility cost by building and by type
- Contracts expiring in the next 90 days
- Top tenants by revenue

### 6.13 reports
Generates report data plus PDF and Excel export:
- Billing statement, per tenant per period
- Payment history, per tenant
- Collection report, by date range
- Occupancy report
- Utility expense report
- Contract expiry report
- VAT and WHT summary, formatted for BIR filing

### 6.14 audit
Super Admin only, read-only. Logs every create, update, and delete across all business entities: acting user, timestamp, entity type and id, before and after state as JSON.

Filterable by user, entity, action, and date range.

Implemented as a **Prisma middleware or extension** in `src/common/`, not as per-service calls. A new endpoint must be audited by default, not by remembering to add a line.

---

## 7. Frontend structure

```
src/app/
  (auth)/login
  (dashboard)/
    dashboard          Super Admin only
    buildings          list, detail, rooms
    tenants            list, detail
    contracts          list, detail, new, renew
    invoices           list, detail
    payments           record, history
    utilities          bills, payments
    reports
    audit              Super Admin only
    settings           Super Admin only
    users              Super Admin only
```

`src/lib/api/` holds one file per backend module, each a thin typed wrapper over Axios. Components never call Axios directly.

`src/lib/` also holds shared formatters — currency, dates, contract status labels. Currency formatting is PHP with two decimals.

**The frontend performs no business calculations.** It displays what the API returns. If a number needs computing, the backend computes it.

---

## 8. Build order

Backend and frontend are built together per feature, not backend-then-frontend. Each step ends with something you can click.

0. Scaffold both projects. Backend running on 3001, frontend on 3000, CORS working, health check endpoint returning 200 from a browser fetch.
1. Prisma schema, migrations, seed script (2 buildings, 6 rooms, 4 tenants, 3 active contracts, 1 super admin, 2 admins).
2. Auth end to end — backend session auth plus guards, frontend login page and route protection.
3. Audit middleware wired in, verified against a manual create.
4. Buildings and rooms — API plus UI.
5. Tenants — API plus UI.
6. Contracts and lifecycle — API plus UI.
7. Computation module plus unit tests. **No UI. Tests only.**
8. Invoices and payments — API plus UI.
9. Utilities — API plus UI.
10. Reports and exports.
11. Dashboard.
12. Notifications and cron.
13. Excel historical data import script.

**Do not skip ahead. Stop after each numbered step and report before continuing.**

---

## 9. Open items

Confirm each with the client before the step it blocks.

| Item | Blocks step |
|---|---|
| WHT base: net of VAT, or VAT-inclusive gross | 7 |
| Escalation compounds, or is simple against original rent | 7 |
| Escalation anniversary-based, or calendar-year-based | 7 |
| Payment due day: fixed date, or per-contract | 8 |
| Security deposit refund and forfeiture rules | 6, 8 |
| Whether utility costs are ever passed through to tenants | 9 |
| Historical data 2019 to 2026: full import, or opening balances only | 13 |

Where an item is unresolved, put the decision behind a settings row or a clearly marked constant with a `TODO: confirm with client` comment. Do not guess and bury it in the logic.

---

## 10. Constraints

- Do not implement anything not described in this document or API-CONTRACT.md.
- Where the spec is ambiguous, ask. Do not infer.
- Frontend never imports from Backend. Backend never imports from Frontend.
- Frontend performs no business calculations.
- The computation module has no framework or database dependencies.
- Tax rates and escalation defaults live in the settings table, not in code.
- Invoices freeze their computed amounts at generation time.
- Audit logging goes through Prisma middleware.
- Money is `Decimal`, never `Float`.
- URLs, ports, credentials, and SMTP settings come from `.env`. Local-only values may sit in `.env` but never in application code.
- Every endpoint checks authorization server-side regardless of what the frontend hides.
