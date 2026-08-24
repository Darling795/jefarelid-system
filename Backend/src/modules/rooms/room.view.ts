import { Prisma } from '@prisma/client';

import { dateOnly, money } from '../../common/http/serialize';

/**
 * Include used to derive a room's current occupancy from its active contract.
 * Uses the ContractRoom join so a room shows its lease whether it is the
 * primary room or an additional room on a multi-room contract.
 */
export const roomListInclude = Prisma.validator<Prisma.RoomInclude>()({
  contractRooms: {
    where: { contract: { status: 'active' } },
    include: {
      contract: { include: { tenant: { select: { businessName: true } } } },
    },
    orderBy: { contract: { startDate: 'desc' } },
    take: 1,
  },
});

export type RoomListRow = Prisma.RoomGetPayload<{ include: typeof roomListInclude }>;

/** Room list item (API-CONTRACT.md → Rooms). Occupancy derived from active contract. */
export function mapRoomListItem(room: RoomListRow) {
  const active = room.contractRooms[0]?.contract;
  return {
    id: room.id,
    roomNumber: room.roomNumber,
    floor: room.floor,
    areaSqm: money(room.areaSqm),
    baseRate: money(room.baseRate),
    status: room.status,
    isActive: room.isActive,
    currentTenantName: active?.tenant.businessName ?? null,
    contractEndDate: active ? dateOnly(active.endDate) : null,
  };
}
