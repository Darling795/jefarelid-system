# API Contract

The single point of contact between Frontend and Backend. Both sides are built against this document. If a change is needed, change this file first, then both sides.

Base URL: `http://localhost:3001/api` (from `.env`, never hardcoded)

---

## Conventions

**Auth.** Session cookie, httpOnly. All requests from the frontend send `withCredentials: true`. Every endpoint except `POST /auth/login` requires a valid session.

**IDs.** All entity ids are strings (cuid).

**Money.** Serialized as strings, not numbers. `"12500.00"`. JavaScript numbers lose precision on currency; the frontend parses these for display only and never does arithmetic on them.

**Dates.** ISO 8601. Date-only fields use `YYYY-MM-DD`. Timestamps use full ISO with timezone.

**Period.** Month identifiers use `YYYY-MM`.

### Success envelope

```json
{ "data": <payload> }
```

### List envelope

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "pageSize": 20, "total": 143 }
}
```

### Error envelope

```json
{
  "error": {
    "code": "CONTRACT_OVERLAP",
    "message": "Room already has an active contract for this period.",
    "details": { "conflictingContractId": "clx..." }
  }
}
```

Status codes: 400 validation, 401 unauthenticated, 403 wrong role, 404 not found, 409 business rule conflict, 500 unexpected.

`code` is a stable machine-readable string. The frontend switches on `code`, never on `message`.

### Query parameters

List endpoints accept: `page`, `pageSize`, `search`, `sortBy`, `sortDir`, plus endpoint-specific filters.

---

## Auth

```
POST   /auth/login          { email, password }  → { user }
POST   /auth/logout                              → 204
GET    /auth/me                                  → { user }
POST   /auth/change-password { currentPassword, newPassword } → 204
```

`user` shape: `{ id, name, email, role, lastLoginAt }`

Login errors: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, `ACCOUNT_INACTIVE`.

---

## Users — Super Admin only

```
GET    /users                → list
POST   /users                { name, email, password, role }
PATCH  /users/:id            { name, isActive }
POST   /users/:id/reset-password  { newPassword }
POST   /users/:id/unlock     → 204
```

---

## Buildings

```
GET    /buildings            → list, each with roomCount and occupiedCount
POST   /buildings            { name, address, notes }
GET    /buildings/:id        → building with rooms
PATCH  /buildings/:id
DELETE /buildings/:id        → 409 BUILDING_HAS_ROOMS if it still has rooms;
                               409 BUILDING_HAS_UTILITY_HISTORY if it has paid
                               utility bills. Otherwise removes the building and
                               clears any unpaid utility bills.
```

---

## Rooms

```
GET    /buildings/:buildingId/rooms   → list
POST   /buildings/:buildingId/rooms   { roomNumber, floor, areaSqm, baseRate }
GET    /rooms/:id                     → room with currentContract and tenant
PATCH  /rooms/:id
DELETE /rooms/:id                     → removes the room if it never billed
                                        (clearing empty draft/terminated
                                        contracts); if it has invoice history it
                                        is kept and marked inactive instead.
                                        409 ROOM_HAS_CONTRACTS if a contract is
                                        active.
```

Room list item includes: `{ id, roomNumber, floor, areaSqm, baseRate, status, currentTenantName, contractEndDate }`

---

## Tenants

```
GET    /tenants              → list
POST   /tenants              { businessName, contactPerson, contactNumber, email, tin, address }
GET    /tenants/:id          → tenant with contracts, outstandingBalance
PATCH  /tenants/:id
GET    /tenants/:id/payments → payment history
DELETE /tenants/:id          → removes the tenant if they never billed
                               (clearing empty draft/terminated contracts); if
                               they have invoice history the tenant is kept and
                               marked inactive instead. 409
                               TENANT_HAS_ACTIVE_CONTRACT if a contract is active.
```

---

## Contracts

```
GET    /contracts                  → list; filters: status, buildingId, tenantId, expiringWithinDays
POST   /contracts                  → create
GET    /contracts/:id              → contract with tenant, room, invoices
PATCH  /contracts/:id              → editable fields only; not while active without reason
POST   /contracts/:id/activate     → draft to active
POST   /contracts/:id/renew        { startDate, endDate, basicRent?, escalationRate? }
POST   /contracts/:id/terminate    { effectiveDate, reason }
GET    /contracts/archive          → expired and terminated
```

**Create body:**

```json
{
  "tenantId": "...",
  "roomId": "...",
  "startDate": "2026-01-01",
  "endDate": "2027-12-31",
  "basicRent": "25000.00",
  "escalationRate": "0.05",
  "escalationAnchorDate": "2026-01-01",
  "securityDeposit": "50000.00",
  "advancePayment": "25000.00",
  "paymentDueDay": 5
}
```

Errors: `CONTRACT_OVERLAP`, `ROOM_INACTIVE`, `INVALID_DATE_RANGE`, `TENANT_INACTIVE`.

`renew` returns the new contract and sets the old one to `renewed`. If `basicRent` is omitted, the backend computes the escalated rent.

---

## Invoices

```
GET    /invoices                   → list; filters: contractId, tenantId, buildingId, status, periodFrom, periodTo
POST   /invoices/generate          { periodMonth, contractId? }  → generated invoices
GET    /invoices/:id               → invoice with contract, tenant, payments
POST   /invoices/:id/void          { reason }
```

**Invoice shape:**

```json
{
  "id": "...",
  "contractId": "...",
  "periodMonth": "2026-03",
  "basicRentApplied": "26250.00",
  "vatAmount": "3150.00",
  "grossRent": "29400.00",
  "whtAmount": "1312.50",
  "netReceivable": "28087.50",
  "amountPaid": "10000.00",
  "balance": "18087.50",
  "dueDate": "2026-03-05",
  "status": "partial"
}
```

`amountPaid` and `balance` are computed by the backend on read. They are not stored columns.

Omitting `contractId` on generate runs for all active contracts. Duplicate period returns `INVOICE_ALREADY_EXISTS`.

---

## Payments

```
GET    /payments                   → list; filters: tenantId, buildingId, periodMonth (YYYY-MM), orNumber (partial), dateFrom, dateTo
POST   /payments                   { invoiceId, amountPaid, paymentDate, orNumber, paymentMethod, remarks }
GET    /payments/:id
DELETE /payments/:id               { reason }  → Super Admin only
GET    /payments/outstanding       → filters: tenantId, buildingId; aged buckets
```

Errors: `OVERPAYMENT`, `INVOICE_VOIDED`, `DUPLICATE_OR_NUMBER`.

**Outstanding shape:**

```json
{
  "current": "12000.00",
  "days30": "8000.00",
  "days60": "0.00",
  "days90Plus": "25000.00",
  "total": "45000.00"
}
```

---

## Utilities

```
GET    /utility-bills              → filters: buildingId, utilityType, status, periodFrom, periodTo
POST   /utility-bills              { buildingId, utilityType, billingPeriod, amount, dueDate }
GET    /utility-bills/:id
PATCH  /utility-bills/:id
POST   /utility-bills/:id/payments { amountPaid, paymentDate, voucherNumber, orNumber }
```

---

## Dashboard — Super Admin only

```
GET    /dashboard/summary          → headline KPI cards
GET    /dashboard/income-trend     ?months=12
GET    /dashboard/occupancy        → portfolio and per building
GET    /dashboard/receivables      → aged buckets
GET    /dashboard/utility-costs    ?months=12
GET    /dashboard/expiring         ?days=90
GET    /dashboard/top-tenants      ?limit=10
```

Each returns chart-ready data. The frontend does no aggregation.

---

## Reports

```
GET    /reports/billing-statement  ?tenantId=&periodMonth=
GET    /reports/payment-history    ?tenantId=&dateFrom=&dateTo=
GET    /reports/collection         ?dateFrom=&dateTo=&buildingId=
GET    /reports/occupancy          ?asOf=
GET    /reports/utility-expense    ?dateFrom=&dateTo=&buildingId=
GET    /reports/contract-expiry    ?days=
GET    /reports/tax-summary        ?periodFrom=&periodTo=
```

Each accepts `?format=json|pdf|xlsx`. Default `json`. `pdf` and `xlsx` return a file stream with the appropriate `Content-Disposition`.

---

## Audit — Super Admin only

```
GET    /audit-logs   → filters: userId, entityType, action, dateFrom, dateTo
GET    /audit-logs/:id → full before/after JSON
```

Read-only. There is no POST, PATCH, or DELETE on this resource.

---

## Settings — Super Admin only

```
GET    /settings              → all
PATCH  /settings/:key         { value }
```

Keys: `vat_rate`, `wht_rate`, `default_escalation_rate`, `notification_lead_days`, `invoice_generation_day`.

Changing a tax rate affects future invoice generation only. Existing invoices keep their frozen values.

---

## Health

```
GET    /health   → { status: "ok", timestamp }
```

No auth. Used to verify the two servers are talking during step 0.
