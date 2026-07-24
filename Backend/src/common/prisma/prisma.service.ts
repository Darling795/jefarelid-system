import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Base Prisma client (connection lifecycle). The audited client is derived from
 * this via the audit extension and provided under the PRISMA token — see
 * common.module.ts and src/common/prisma/prisma.tokens.ts. Business services
 * inject the audited client so every write is logged; this base client is used
 * for connection management and by the audit extension itself.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
