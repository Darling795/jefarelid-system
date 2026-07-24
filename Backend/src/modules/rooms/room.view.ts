import { Prisma } from '@prisma/client';

import { dateOnly, money } from '../../common/http/serialize';

/** Include used to derive a room's current occupancy from its active contract. */
export const roomListInclude = Prisma.validator<Prisma.RoomInclude>()({
  contracts: {
    where: { status: 'active' },
    include: { tenant: { select: { businessName: true } } },
    orderBy: { startDate: 'desc' },
    take: 1,
  },
});

export type RoomListRow = Prisma.RoomGetPayload<{ include: typeof roomListInclude }>;

/** Room list item (API-CONTRACT.md → Rooms). Occupancy derived from active contract. */
export function mapRoomListItem(room: RoomListRow) {
  const active = room.contracts[0];
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
