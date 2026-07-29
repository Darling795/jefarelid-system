import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Building } from '@prisma/client';

import { PRISMA, ExtendedPrismaClient } from '../../common/prisma/prisma.tokens';
import { ApiCode } from '../../common/http/api-codes';
import { AppException } from '../../common/http/app-exception';
import { iso } from '../../common/http/serialize';
import { mapRoomListItem, roomListInclude } from '../rooms/room.view';
import { CreateBuildingDto, UpdateBuildingDto } from './dto/building.dto';

@Injectable()
export class BuildingsService {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async list() {
    const buildings = await this.prisma.building.findMany({
      orderBy: { name: 'asc' },
      include: {
        rooms: {
          select: {
            id: true,
            contracts: { where: { status: 'active' }, select: { id: true } },
          },
        },
      },
    });

    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      notes: b.notes,
      roomCount: b.rooms.length,
      occupiedCount: b.rooms.filter((r) => r.contracts.length > 0).length,
    }));
  }

  async create(dto: CreateBuildingDto) {
    const b = await this.prisma.building.create({
      data: { name: dto.name, address: dto.address, notes: dto.notes },
    });
    return this.view(b);
  }

  async findOne(id: string) {
    const b = await this.prisma.building.findUnique({
      where: { id },
      include: { rooms: { orderBy: { roomNumber: 'asc' }, include: roomListInclude } },
    });
    if (!b) throw this.notFound();
    return { ...this.view(b), rooms: b.rooms.map(mapRoomListItem) };
  }

  async update(id: string, dto: UpdateBuildingDto) {
    await this.ensureExists(id);
    const b = await this.prisma.building.update({
      where: { id },
      data: { name: dto.name, address: dto.address, notes: dto.notes },
    });
    return this.view(b);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    const roomCount = await this.prisma.room.count({ where: { buildingId: id } });
    if (roomCount > 0) {
      throw new AppException(
        ApiCode.BUILDING_HAS_ROOMS,
        'Cannot delete a building that has rooms.',
        HttpStatus.CONFLICT,
        { roomCount },
      );
    }

    // Utility bills reference the building. A bill that was actually paid is
    // financial history and must be kept, so it blocks deletion. Unpaid bills
    // (leftover test entries) carry no records and are cleared with the building.
    const bills = await this.prisma.utilityBill.findMany({
      where: { buildingId: id },
      select: { id: true, _count: { select: { payments: true } } },
    });
    if (bills.some((b) => b._count.payments > 0)) {
      throw new AppException(
        ApiCode.BUILDING_HAS_UTILITY_HISTORY,
        'Cannot delete a building with paid utility bills.',
        HttpStatus.CONFLICT,
      );
    }
    if (bills.length) {
      await this.prisma.utilityBill.deleteMany({ where: { buildingId: id } });
    }
    await this.prisma.building.delete({ where: { id } });
  }

  private view(b: Building) {
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      notes: b.notes,
      createdAt: iso(b.createdAt),
      updatedAt: iso(b.updatedAt),
    };
  }

  private async ensureExists(id: string): Promise<void> {
    const exists = await this.prisma.building.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw this.notFound();
  }

  private notFound() {
    return new AppException(
      ApiCode.NOT_FOUND,
      'Building not found.',
      HttpStatus.NOT_FOUND,
    );
  }
}
