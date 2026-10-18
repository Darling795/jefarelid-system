/**
 * Admin cleanup: permanently delete a building and EVERYTHING under it
 * (rooms, contracts, invoices, payments, utility bills/payments, advance
 * credits tied to those invoices, documents).
 *
 * The app deliberately refuses to delete a building that has financial history
 * (to protect records). This script is the escape hatch for removing test /
 * mistyped buildings during setup. It is destructive and has no undo.
 *
 * Usage (from the Backend folder):
 *   node scripts/purge-building.mjs --list                 # show all buildings + ids
 *   node scripts/purge-building.mjs <buildingId> [more...] # delete those buildings
 *
 * Example:
 *   node scripts/purge-building.mjs ckxyz123 ckabc456
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const args = process.argv.slice(2);

async function list() {
  const buildings = await prisma.building.findMany({
    orderBy: { name: 'asc' },
    include: { rooms: { select: { id: true } }, utilityBills: { select: { id: true } } },
  });
  console.log('Buildings:\n');
  for (const b of buildings) {
    const roomIds = b.rooms.map((r) => r.id);
    const contracts = roomIds.length
      ? await prisma.contract.count({ where: { OR: [{ roomId: { in: roomIds } }, { rooms: { some: { roomId: { in: roomIds } } } }] } })
      : 0;
    const invoices = roomIds.length
      ? await prisma.rentalInvoice.count({ where: { contract: { OR: [{ roomId: { in: roomIds } }, { rooms: { some: { roomId: { in: roomIds } } } }] } } })
      : 0;
    console.log(
      `  ${b.id}  ${b.name}\n     rooms=${b.rooms.length}  contracts=${contracts}  invoices=${invoices}  utilityBills=${b.utilityBills.length}`,
    );
  }
  console.log('\nTo delete: node scripts/purge-building.mjs <id> [<id> ...]');
}

async function purge(id) {
  const building = await prisma.building.findUnique({
    where: { id },
    include: { rooms: { select: { id: true } }, utilityBills: { select: { id: true } } },
  });
  if (!building) {
    console.log(`  ! ${id} — not found, skipping`);
    return;
  }
  const roomIds = building.rooms.map((r) => r.id);
  const billIds = building.utilityBills.map((u) => u.id);

  // All contracts touching these rooms (primary room or via the join table).
  const contracts = roomIds.length
    ? await prisma.contract.findMany({
        where: { OR: [{ roomId: { in: roomIds } }, { rooms: { some: { roomId: { in: roomIds } } } }] },
        select: { id: true },
      })
    : [];
  const contractIds = contracts.map((c) => c.id);

  const invoices = contractIds.length
    ? await prisma.rentalInvoice.findMany({ where: { contractId: { in: contractIds } }, select: { id: true } })
    : [];
  const invoiceIds = invoices.map((i) => i.id);

  await prisma.$transaction(async (tx) => {
    if (invoiceIds.length) {
      await tx.rentalPayment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
      await tx.tenantCredit.deleteMany({ where: { sourceInvoiceId: { in: invoiceIds } } });
      await tx.rentalInvoice.deleteMany({ where: { id: { in: invoiceIds } } });
    }
    if (contractIds.length) {
      // Detach any renewal in another building that points at these contracts.
      await tx.contract.updateMany({
        where: { parentContractId: { in: contractIds }, id: { notIn: contractIds } },
        data: { parentContractId: null },
      });
      await tx.contractRoom.deleteMany({ where: { contractId: { in: contractIds } } });
      // documents on these contracts cascade on contract delete
      await tx.contract.deleteMany({ where: { id: { in: contractIds } } });
    }
    if (roomIds.length) {
      await tx.contractRoom.deleteMany({ where: { roomId: { in: roomIds } } });
      await tx.room.deleteMany({ where: { id: { in: roomIds } } });
    }
    if (billIds.length) {
      await tx.utilityPayment.deleteMany({ where: { utilityBillId: { in: billIds } } });
      await tx.utilityBill.deleteMany({ where: { id: { in: billIds } } });
    }
    await tx.building.delete({ where: { id } });
  });

  console.log(
    `  ✓ Deleted ${building.name}  (rooms ${roomIds.length}, contracts ${contractIds.length}, invoices ${invoiceIds.length}, utilityBills ${billIds.length})`,
  );
}

async function main() {
  if (args.length === 0 || args[0] === '--list' || args[0] === '-l') {
    await list();
    return;
  }
  console.log(`Purging ${args.length} building(s)…`);
  for (const id of args) await purge(id);
  console.log('Done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
