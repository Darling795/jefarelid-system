import { Controller, Get, Query } from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { DashboardService } from './dashboard.service';

@Roles('super_admin')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary() {
    return this.dashboard.summary();
  }

  @Get('income-trend')
  incomeTrend(@Query('months') months?: string) {
    return this.dashboard.incomeTrend(months ? Number(months) : 12);
  }

  @Get('occupancy')
  occupancy() {
    return this.dashboard.occupancy();
  }

  @Get('receivables')
  receivables() {
    return this.dashboard.receivables();
  }

  @Get('utility-costs')
  utilityCosts(@Query('months') months?: string) {
    return this.dashboard.utilityCosts(months ? Number(months) : 12);
  }

  @Get('expiring')
  expiring(@Query('days') days?: string) {
    return this.dashboard.expiring(days ? Number(days) : 90);
  }

  @Get('top-tenants')
  topTenants(@Query('limit') limit?: string) {
    return this.dashboard.topTenants(limit ? Number(limit) : 10);
  }
}
