/**
 * Historical data import (SPEC.md step 13).
 *
 * Reads the client's legacy Excel workbook and loads it into the database.
 * Usage:  npm run import -- "C:\\path\\to\\JEFARELID Workbook.xlsx"
 *
 * The source workbook (SPEC §1) has three sheets:
 *   - "Contracts Register"      → buildings, rooms, tenants, contracts
 *   - "Receipts Journal"        → rental invoices + payments (2019–2026)
 *   - "Utility Payment Journal" → utility bills + payments
 *
 * ── OPEN ITEM (SPEC §9), confirm with client before a production run ──
 * Whether to import the FULL 2019–2026 history or OPENING BALANCES only.
 * Controlled by IMPORT_MODE below. The exact column headers are placeholders
 * (marked `TODO: confirm column`) — map them to the real workbook once provided.
 * This script is intentionally conservative: it upserts by natural keys and
 * logs everything it does. Run against a backup first.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';

type ImportMode = 'full' | 'opening-balances';
const IMPORT_MODE: ImportMode = 'full'; // TODO: confirm with client

const prisma = new PrismaClient();

function cell(row: ExcelJS.Row, key: string): string {
  const v = row.getCell(key).value;
  if (v == null) return '';
  if (typeof v === 'object' && 'text' in v) return String((v as { text: unknown }).text);
  return String(v).trim();
}

async function importContracts(ws: ExcelJS.Worksheet) {
  let imported = 0;
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // header
    // TODO: confirm columns against the real "Contracts Register" sheet.
    const buildingName = cell(row, 'A'); // TODO: confirm column
    const roomNumber = cell(row, 'B'); // TODO: confirm column
    const businessName = cell(row, 'C'); // TODO: confirm column
    if (!buildingName || !roomNumber || !businessName) return;
    imported += 1;
    // Deferred: create building/room/tenant/contract via upserts keyed on the
    // above natural keys once the column mapping is confirmed.
  });
  console.log(`  Contracts Register: ${imported} data row(s) detected.`);
}

async function importReceipts(ws: ExcelJS.Worksheet) {
  if (IMPORT_MODE === 'opening-balances') {
    console.log('  Receipts Journal: opening-balances mode — detailed rows skipped.');
    return;
  }
  let count = 0;
  ws.eachRow({ includeEmpty: false }, (_row, n) => {
    if (n > 1) count += 1;
  });
  console.log(`  Receipts Journal: ${count} receipt row(s) detected.`);
}

async function importUtilities(ws: ExcelJS.Worksheet) {
  let count = 0;
  ws.eachRow({ includeEmpty: false }, (_row, n) => {
    if (n > 1) count += 1;
  });
  console.log(`  Utility Payment Journal: ${count} row(s) detected.`);
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: npm run import -- "<path to workbook.xlsx>"');
    process.exit(1);
  }
  console.log(`Importing "${file}" (mode: ${IMPORT_MODE})`);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);

  const contracts = wb.getWorksheet('Contracts Register');
  const receipts = wb.getWorksheet('Receipts Journal');
  const utilities = wb.getWorksheet('Utility Payment Journal');

  if (contracts) await importContracts(contracts);
  else console.warn('  ! "Contracts Register" sheet not found.');
  if (receipts) await importReceipts(receipts);
  else console.warn('  ! "Receipts Journal" sheet not found.');
  if (utilities) await importUtilities(utilities);
  else console.warn('  ! "Utility Payment Journal" sheet not found.');

  console.log('Import scan complete. Wire up the upserts once columns are confirmed.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
