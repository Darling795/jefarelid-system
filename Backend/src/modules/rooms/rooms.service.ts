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
        contracts: {
          where: { status: 'active' },
          include: { tenant: { select: { id: true, businessName: true } } },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
      },
    });
    if (!room) throw this.notFound();

    const active = room.contracts[0];
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
      include: { contracts: { where: { status: 'active' }, select: { id: true } } },
    });
    if (!room) throw this.notFound();
    if (room.contracts.length > 0) {
      throw new AppException(
        ApiCode.ROOM_HAS_CONTRACTS,
        'Cannot deactivate a room with an active contract.',
        HttpStatus.CONFLICT,
      );
    }
    // Soft delete: rooms with contract history are never hard-deleted (SPEC 6.4).
    await this.prisma.room.update({
      where: { id },
      data: { isActive: false, status: 'vacant' },
    });
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
