import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { PrismaService } from './prisma/prisma.service';
import { PRISMA, applyAudit } from './prisma/prisma.tokens';
import { AllExceptionsFilter } from './http/all-exceptions.filter';
import { TransformInterceptor } from './http/transform.interceptor';
import { SessionGuard } from './auth/session.guard';
import { RolesGuard } from './auth/roles.guard';

/**
 * Cross-cutting wiring, applied app-wide:
 *  - PrismaService (exported for every module)
 *  - SessionGuard then RolesGuard (order matters: auth before authz)
 *  - response envelope interceptor + error envelope filter
 */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: PRISMA,
      useFactory: (base: PrismaService) => applyAudit(base),
      inject: [PrismaService],
    },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
  exports: [PrismaService, PRISMA],
})
export class CommonModule {}
