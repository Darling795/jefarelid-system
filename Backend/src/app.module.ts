import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UsersModule } from './modules/users/users.module';
import { UtilitiesModule } from './modules/utilities/utilities.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    HealthModule,
    AuthModule,
    AuditModule,
    BuildingsModule,
    RoomsModule,
    TenantsModule,
    ContractsModule,
    InvoicesModule,
    PaymentsModule,
    SettingsModule,
    UsersModule,
    UtilitiesModule,
    DashboardModule,
    ReportsModule,
    NotificationsModule,
    SearchModule,
  ],
})
export class AppModule {}
