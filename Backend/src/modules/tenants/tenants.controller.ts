import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { TenantsService } from './tenants.service';
import {
  ApplyCreditDto,
  CreateTenantDto,
  UpdateTenantDto,
} from './dto/tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  list(
    @Query()
    query: { page?: string; pageSize?: string; search?: string; status?: string },
  ) {
    return this.tenants.list(query);
  }

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenants.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }

  @Get(':id/payments')
  payments(@Param('id') id: string) {
    return this.tenants.payments(id);
  }

  @Get(':id/credits')
  credits(@Param('id') id: string) {
    return this.tenants.credits(id);
  }

  @Post(':id/credits/apply')
  applyCredit(
    @Param('id') id: string,
    @Body() dto: ApplyCreditDto,
    @CurrentUser() user: User,
  ) {
    return this.tenants.applyCredit(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.tenants.remove(id);
  }
}
