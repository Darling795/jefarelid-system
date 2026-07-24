# JEFARELID Building and Room Rental Management System

Read `SPEC.md` and `API-CONTRACT.md` before writing code. This file holds the rules that apply to every session; the spec holds what to build.

## Project shape

Three-tier, physically separated. `Backend/` is NestJS plus Prisma plus PostgreSQL. `Frontend/` is Next.js App Router. They communicate over HTTP only, per `API-CONTRACT.md`.

Backend runs on 3001. Frontend on 3000. Local development only for now.

## Working agreement

- Follow the build order in SPEC.md section 8. Do not skip ahead.
- Stop after each numbered step and report what was built. Wait for review before continuing.
- Where the spec is ambiguous, ask. Do not infer and do not pick a plausible default.
- Do not implement anything not described in SPEC.md or API-CONTRACT.md. No extra features, no speculative abstractions, no "while I was in here" refactors.
- If a change would alter the API surface, update `API-CONTRACT.md` first, then both sides.

## Hard rules

**Money.** Prisma `Decimal` in the schema, `decimal.js` in logic, strings over the wire. Never `Float`. Never JavaScript `number` for a currency value.

**Tax rates.** VAT rate, WHT rate, and default escalation rate live in the `settings` table. They are never hardcoded, never inlined as `0.12` or `0.05` anywhere in the codebase.

**Computation module.** `Backend/src/modules/computation/` is pure. No Prisma imports. No NestJS decorators on the calculation functions. It receives values and returns values. Callers fetch settings and pass them in. Unit tests come before any caller is wired up.

**Invoices are frozen.** Computed amounts are written once at generation time. Nothing recomputes a historical invoice from current rates. `amountPaid` and `balance` are derived on read; every other money field on an invoice is stored.

**Audit logging.** Implemented as Prisma middleware in `Backend/src/common/`. Never as per-service calls. A new endpoint is audited because the middleware exists, not because someone remembered.

**Audit logs are append-only.** No update endpoint. No delete endpoint. Ever.

**Authorization is server-side.** Every protected endpoint checks the role in a guard. The frontend hiding a nav link is cosmetic. A request that bypasses the UI must still get 403.

**Layer boundaries.** Frontend never imports from Backend. Backend never imports from Frontend. The frontend performs no business calculations — if a number needs computing, the backend computes it and sends the result.

**Configuration.** URLs, ports, database connection strings, SMTP settings all come from `.env`. `.env.example` stays current in both projects. Local-only values may live in `.env` but never in application code.

## Open decisions

SPEC.md section 9 lists decisions still pending with the client. Where one blocks the current step, stop and ask rather than choosing. If a placeholder is unavoidable, mark it `// TODO: confirm with client — <the question>` and surface it in the step report.

The WHT base is the most consequential of these. The thesis says 5% of gross rent; standard Philippine practice is 5% of rent net of VAT. The spec uses net-of-VAT. Do not change it without being told.

## Conventions

- TypeScript strict mode on both sides.
- Backend: one module folder per domain under `src/modules/`, each with controller, service, DTOs. Validation via `class-validator` on DTOs.
- Frontend: `src/lib/api/` holds one typed wrapper file per backend module. Components never call Axios directly.
- Currency displays as PHP with two decimals. Dates display as `DD MMM YYYY`.
- Error codes in responses are stable strings. The frontend switches on `code`, never on `message`.

## Commands

```
# Backend
cd Backend && npm run start:dev
npx prisma migrate dev
npx prisma db seed
npm run test

# Frontend
cd Frontend && npm run dev
```
