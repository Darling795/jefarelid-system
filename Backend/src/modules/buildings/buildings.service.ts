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

    // What a delete would also remove — surfaced so the UI can warn precisely.
    const roomIds = b.rooms.map((r) => r.id);
    const contractCount = roomIds.length
      ? await this.prisma.contract.count({
          where: {
            OR: [
              { roomId: { in: roomIds } },
              { rooms: { some: { roomId: { in: roomIds } } } },
            ],
          },
        })
      : 0;
    const invoiceCount = roomIds.length
      ? await this.prisma.rentalInvoice.count({
          where: {
            contract: {
              OR: [
                { roomId: { in: roomIds } },
                { rooms: { some: { roomId: { in: roomIds } } } },
              ],
            },
          },
        })
      : 0;

    return {
      ...this.view(b),
      rooms: b.rooms.map(mapRoomListItem),
      contractCount,
      invoiceCount,
    };
  }

  async update(id: string, dto: UpdateBuildingDto) {
    await this.ensureExists(id);
    const b = await this.prisma.building.update({
      where: { id },
      data: { name: dto.name, address: dto.address, notes: dto.notes },
    });
    return this.view(b);
  }

  /**
   * Delete a building and EVERYTHING under it — rooms, contracts, invoices,
   * payments, utility bills/payments, advance credits tied to those invoices,
   * and (by cascade) contract documents. Per the owner's request a building can
   * always be removed, even with financial history. This is destructive and has
   * no undo; the UI confirms what will be deleted. Deletes run in FK-safe order.
   */
  async remove(id: string): Promise<void> {
    await this.ensureExists(id);

    const rooms = await this.prisma.room.findMany({
      where: { buildingId: id },
      select: { id: true },
    });
    const roomIds = rooms.map((r) => r.id);

    // All contracts touching these rooms (primary room or via the join table).
    const contracts = roomIds.length
      ? await this.prisma.contract.findMany({
          where: {
            OR: [
              { roomId: { in: roomIds } },
              { rooms: { some: { roomId: { in: roomIds } } } },
            ],
          },
          select: { id: true },
        })
      : [];
    const contractIds = contracts.map((c) => c.id);

    const invoices = contractIds.length
      ? await this.prisma.rentalInvoice.findMany({
          where: { contractId: { in: contractIds } },
          select: { id: true },
        })
      : [];
    const invoiceIds = invoices.map((i) => i.id);

    if (invoiceIds.length) {
      await this.prisma.rentalPayment.deleteMany({
        where: { invoiceId: { in: invoiceIds } },
      });
      await this.prisma.tenantCredit.deleteMany({
        where: { sourceInvoiceId: { in: invoiceIds } },
      });
      await this.prisma.rentalInvoice.deleteMany({
        where: { id: { in: invoiceIds } },
      });
    }
    if (contractIds.length) {
      // Detach any renewal in another building that points at these contracts.
      await this.prisma.contract.updateMany({
        where: { parentContractId: { in: contractIds }, id: { notIn: contractIds } },
        data: { parentContractId: null },
      });
      await this.prisma.contractRoom.deleteMany({
        where: { contractId: { in: contractIds } },
      });
      await this.prisma.contract.deleteMany({ where: { id: { in: contractIds } } });
    }
    if (roomIds.length) {
      await this.prisma.contractRoom.deleteMany({ where: { roomId: { in: roomIds } } });
      await this.prisma.room.deleteMany({ where: { id: { in: roomIds } } });
    }

    const bills = await this.prisma.utilityBill.findMany({
      where: { buildingId: id },
      select: { id: true },
    });
    const billIds = bills.map((b) => b.id);
    if (billIds.length) {
      await this.prisma.utilityPayment.deleteMany({
        where: { utilityBillId: { in: billIds } },
      });
      await this.prisma.utilityBill.deleteMany({ where: { id: { in: billIds } } });
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
