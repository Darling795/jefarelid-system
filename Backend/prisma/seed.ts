/**
 * Seed data for local development (SPEC.md section 8, step 1).
 *
 * Produces: 2 buildings, 6 rooms, 4 tenants, 3 active contracts,
 * 1 super admin, 2 admins, and the settings rows that hold the tax and
 * escalation rates (never hardcoded in application code — CLAUDE.md).
 *
 * Idempotent: uses fixed ids + upserts, so it is safe to run repeatedly.
 *
 * Default dev password for all seeded accounts: "ChangeMe123!"
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEV_PASSWORD = 'ChangeMe123!';
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  // ── Settings (tax + escalation rates, notification config) ─────────────
  const settings: Array<{ key: string; value: string; description: string }> = [
    { key: 'vat_rate', value: '0.12', description: 'Value Added Tax rate applied to basic rent.' },
    { key: 'wht_rate', value: '0.05', description: 'Expanded withholding tax rate on rent (base: net of VAT — see SPEC).' },
    { key: 'default_escalation_rate', value: '0.05', description: 'Default annual rent escalation rate for new contracts.' },
    { key: 'notification_lead_days', value: '90,60,30', description: 'Contract-expiry reminder lead times, in days.' },
    { key: 'invoice_generation_day', value: '1', description: 'Day of month the scheduled invoice job runs.' },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: s,
    });
  }

  // ── Users: 1 super admin + 2 admins ────────────────────────────────────
  const users: Array<{ id: string; name: string; email: string; role: 'super_admin' | 'admin' }> = [
    { id: 'usr_owner', name: 'Business Owner', email: 'owner@jefarelid.test', role: 'super_admin' },
    { id: 'usr_admin_1', name: 'Secretary One', email: 'secretary1@jefarelid.test', role: 'admin' },
    { id: 'usr_admin_2', name: 'Secretary Two', email: 'secretary2@jefarelid.test', role: 'admin' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, email: u.email, role: u.role, isActive: true },
      create: { ...u, passwordHash, isActive: true },
    });
  }

  // ── Buildings (2) ──────────────────────────────────────────────────────
  const buildings: Array<{ id: string; name: string; address: string }> = [
    { id: 'bld_makati', name: 'JEFARELID Center — Makati', address: '123 Ayala Avenue, Makati City' },
    { id: 'bld_qc', name: 'JEFARELID Plaza — Quezon City', address: '45 Timog Avenue, Quezon City' },
  ];
  for (const b of buildings) {
    await prisma.building.upsert({ where: { id: b.id }, update: { name: b.name, address: b.address }, create: b });
  }

  // ── Rooms (6): rm_101/102/201 in Makati, rm_g01/g02/201 in QC ──────────
  // Occupancy below is the denormalized convenience field; active contracts
  // remain the source of truth (SPEC 5). rm_101, rm_102, rm_g01 are leased.
  const rooms: Array<{
    id: string; buildingId: string; roomNumber: string; floor: string;
    areaSqm: string; baseRate: string; status: 'vacant' | 'occupied' | 'reserved';
  }> = [
    { id: 'rm_mk_101', buildingId: 'bld_makati', roomNumber: '101', floor: '1', areaSqm: '48.50', baseRate: '35000.00', status: 'occupied' },
    { id: 'rm_mk_102', buildingId: 'bld_makati', roomNumber: '102', floor: '1', areaSqm: '32.00', baseRate: '25000.00', status: 'occupied' },
    { id: 'rm_mk_201', buildingId: 'bld_makati', roomNumber: '201', floor: '2', areaSqm: '60.00', baseRate: '42000.00', status: 'vacant' },
    { id: 'rm_qc_g01', buildingId: 'bld_qc', roomNumber: 'G01', floor: 'G', areaSqm: '55.00', baseRate: '38000.00', status: 'occupied' },
    { id: 'rm_qc_g02', buildingId: 'bld_qc', roomNumber: 'G02', floor: 'G', areaSqm: '40.00', baseRate: '30000.00', status: 'vacant' },
    { id: 'rm_qc_201', buildingId: 'bld_qc', roomNumber: '201', floor: '2', areaSqm: '28.00', baseRate: '22000.00', status: 'reserved' },
  ];
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { id: r.id },
      update: { buildingId: r.buildingId, roomNumber: r.roomNumber, floor: r.floor, areaSqm: r.areaSqm, baseRate: r.baseRate, status: r.status, isActive: true },
      create: { ...r, isActive: true },
    });
  }

  // ── Tenants (4): 3 leasing, 1 without a contract ───────────────────────
  const tenants: Array<{
    id: string; businessName: string; contactPerson: string; contactNumber: string;
    email: string; tin: string; status: 'active' | 'inactive';
  }> = [
    { id: 'tn_mercury', businessName: 'Mercury Drug Corporation', contactPerson: 'Ana Cruz', contactNumber: '0917-100-1001', email: 'ana.cruz@mercurydrug.test', tin: '004-111-222-000', status: 'active' },
    { id: 'tn_watsons', businessName: 'Watsons Personal Care', contactPerson: 'Ben Santos', contactNumber: '0917-100-1002', email: 'ben.santos@watsons.test', tin: '004-333-444-000', status: 'active' },
    { id: 'tn_711', businessName: '7-Eleven Philippines', contactPerson: 'Carlo Reyes', contactNumber: '0917-100-1003', email: 'carlo.reyes@711.test', tin: '004-555-666-000', status: 'active' },
    { id: 'tn_generika', businessName: 'Generika Drugstore', contactPerson: 'Dina Lim', contactNumber: '0917-100-1004', email: 'dina.lim@generika.test', tin: '004-777-888-000', status: 'active' },
  ];
  for (const t of tenants) {
    await prisma.tenant.upsert({ where: { id: t.id }, update: { ...t }, create: t });
  }

  // ── Contracts (3 active) ───────────────────────────────────────────────
  const contracts: Array<{
    id: string; tenantId: string; roomId: string; startDate: string; endDate: string;
    basicRent: string; securityDeposit: string; advancePayment: string; paymentDueDay: number;
  }> = [
    { id: 'ct_mercury_101', tenantId: 'tn_mercury', roomId: 'rm_mk_101', startDate: '2025-01-01', endDate: '2027-12-31', basicRent: '35000.00', securityDeposit: '70000.00', advancePayment: '35000.00', paymentDueDay: 5 },
    { id: 'ct_watsons_102', tenantId: 'tn_watsons', roomId: 'rm_mk_102', startDate: '2025-06-01', endDate: '2027-05-31', basicRent: '25000.00', securityDeposit: '50000.00', advancePayment: '25000.00', paymentDueDay: 5 },
    { id: 'ct_711_g01', tenantId: 'tn_711', roomId: 'rm_qc_g01', startDate: '2024-09-01', endDate: '2026-08-31', basicRent: '38000.00', securityDeposit: '76000.00', advancePayment: '38000.00', paymentDueDay: 10 },
  ];
  for (const c of contracts) {
    await prisma.contract.upsert({
      where: { id: c.id },
      update: {
        tenantId: c.tenantId, roomId: c.roomId, startDate: d(c.startDate), endDate: d(c.endDate),
        basicRent: c.basicRent, escalationRate: '0.05', escalationAnchorDate: d(c.startDate),
        securityDeposit: c.securityDeposit, advancePayment: c.advancePayment, paymentDueDay: c.paymentDueDay,
        status: 'active',
      },
      create: {
        id: c.id, tenantId: c.tenantId, roomId: c.roomId, startDate: d(c.startDate), endDate: d(c.endDate),
        basicRent: c.basicRent, escalationRate: '0.05', escalationAnchorDate: d(c.startDate),
        securityDeposit: c.securityDeposit, advancePayment: c.advancePayment, paymentDueDay: c.paymentDueDay,
        status: 'active',
      },
    });
  }

  console.log('Seed complete:');
  console.log(`  settings:  ${settings.length}`);
  console.log(`  users:     ${users.length} (1 super admin, 2 admins)`);
  console.log(`  buildings: ${buildings.length}`);
  console.log(`  rooms:     ${rooms.length}`);
  console.log(`  tenants:   ${tenants.length}`);
  console.log(`  contracts: ${contracts.length} (active)`);
  console.log(`\n  Login with any seeded email and password: ${DEV_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
