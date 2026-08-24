import { HttpStatus, Inject, Injectable } from '@nestjs/common';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { dateOnly, money } from '../../common/http/serialize';
import { mapRoomListItem, roomListInclude } from './room.view';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async listForBuilding(buildingId: string) {
    await this.ensureBuilding(buildingId);
    const rooms = await this.prisma.room.findMany({
      where: { buildingId },
      orderBy: { roomNumber: 'asc' },
      include: roomListInclude,
    });
    return rooms.map(mapRoomListItem);
  }

  async create(buildingId: string, dto: CreateRoomDto) {
    await this.ensureBuilding(buildingId);
    const room = await this.prisma.room.create({
      data: {
        buildingId,
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        areaSqm: dto.areaSqm ?? null,
        baseRate: dto.baseRate,
      },
    });
    return this.findOne(room.id);
  }

  async findOne(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        building: { select: { id: true, name: true } },
        contractRooms: {
          where: { contract: { status: 'active' } },
          include: {
            contract: {
              include: { tenant: { select: { id: true, businessName: true } } },
            },
          },
          orderBy: { contract: { startDate: 'desc' } },
          take: 1,
        },
      },
    });
    if (!room) throw this.notFound();

    const active = room.contractRooms[0]?.contract;
    return {
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      areaSqm: money(room.areaSqm),
      baseRate: money(room.baseRate),
      status: room.status,
      isActive: room.isActive,
      building: room.building,
      currentContract: active
        ? {
            id: active.id,
            startDate: dateOnly(active.startDate),
            endDate: dateOnly(active.endDate),
            basicRent: money(active.basicRent),
            status: active.status,
          }
        : null,
      tenant: active
        ? { id: active.tenant.id, businessName: active.tenant.businessName }
        : null,
    };
  }

  async update(id: string, dto: UpdateRoomDto) {
    await this.ensureRoom(id);
    await this.prisma.room.update({
      where: { id },
      data: {
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        areaSqm: dto.areaSqm,
        baseRate: dto.baseRate,
        status: dto.status,
        isActive: dto.isActive,
      },
    });
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { contractRooms: { select: { contractId: true } } },
    });
    if (!room) throw this.notFound();

    // Every contract that covers this room (as primary or additional).
    const contractIds = [...new Set(room.contractRooms.map((cr) => cr.contractId))];

    if (contractIds.length) {
      const contracts = await this.prisma.contract.findMany({
        where: { id: { in: contractIds } },
        select: { id: true, status: true },
      });
      if (contracts.some((c) => c.status === 'active')) {
        throw new AppException(
          ApiCode.ROOM_HAS_CONTRACTS,
          'Cannot remove a room with an active contract.',
          HttpStatus.CONFLICT,
        );
      }

      // If any covering lease also covers other rooms, removing this one room
      // would alter that shared contract — refuse and let the user edit the
      // lease instead. (Keeps the multi-room case safe.)
      for (const cId of contractIds) {
        const roomsOnContract = await this.prisma.contractRoom.count({
          where: { contractId: cId },
        });
        if (roomsOnContract > 1) {
          throw new AppException(
            ApiCode.ROOM_HAS_CONTRACTS,
            'This room is part of a multi-room lease; remove it from that contract first.',
            HttpStatus.CONFLICT,
          );
        }
      }

      // "History worth keeping" means actual frozen financial records — invoices.
      // A room whose only leases never billed anything (e.g. leftover test data)
      // has nothing to protect, so it is removed outright, clearing those empty
      // single-room contracts first for the FK. A room that did bill is kept for
      // the record (SPEC 6.4) and only marked inactive.
      const invoiceCount = await this.prisma.rentalInvoice.count({
        where: { contractId: { in: contractIds } },
      });
      if (invoiceCount > 0) {
        await this.prisma.room.update({
          where: { id },
          data: { isActive: false, status: 'vacant' },
        });
        return;
      }

      // Each remaining contract is single-room + invoice-free → delete it (its
      // ContractRoom rows cascade away, freeing the room's FK).
      await this.prisma.contract.deleteMany({ where: { id: { in: contractIds } } });
    }

    await this.prisma.room.delete({ where: { id } });
  }

  private async ensureBuilding(buildingId: string): Promise<void> {
    const b = await this.prisma.building.findUnique({
      where: { id: buildingId },
      select: { id: true },
    });
    if (!b) {
      throw new AppException(
        ApiCode.NOT_FOUND,
        'Building not found.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async ensureRoom(id: string): Promise<void> {
    const r = await this.prisma.room.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!r) throw this.notFound();
  }

  private notFound() {
    return new AppException(
      ApiCode.NOT_FOUND,
      'Room not found.',
      HttpStatus.NOT_FOUND,
    );
  }
}
