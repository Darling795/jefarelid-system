import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, DeletePaymentDto } from './dto/payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(
    @Query()
    query: {
      page?: string;
      pageSize?: string;
      tenantId?: string;
      buildingId?: string;
      periodMonth?: string;
      orNumber?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    return this.payments.list(query);
  }

  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: User) {
    return this.payments.create(dto, user.id);
  }

  // Must precede :id.
  @Get('outstanding')
  outstanding(@Query() query: { tenantId?: string; buildingId?: string }) {
    return this.payments.outstanding(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payments.findOne(id);
  }

  @Roles('super_admin')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Body() dto: DeletePaymentDto) {
    return this.payments.remove(id, dto.reason);
  }
}
