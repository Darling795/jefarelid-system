import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { User } from '@prisma/client';

import { CurrentUser } from '../../common/auth/current-user.decorator';
import { UtilitiesService } from './utilities.service';
import {
  CreateUtilityBillDto,
  RecordUtilityPaymentDto,
  UpdateUtilityBillDto,
} from './dto/utility.dto';

@Controller('utility-bills')
export class UtilitiesController {
  constructor(private readonly utilities: UtilitiesService) {}

  @Get()
  list(
    @Query()
    query: {
      page?: string;
      pageSize?: string;
      buildingId?: string;
      utilityType?: string;
      status?: string;
      periodFrom?: string;
      periodTo?: string;
    },
  ) {
    return this.utilities.list(query);
  }

  @Post()
  create(@Body() dto: CreateUtilityBillDto) {
    return this.utilities.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.utilities.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUtilityBillDto) {
    return this.utilities.update(id, dto);
  }

  @Post(':id/payments')
  addPayment(
    @Param('id') id: string,
    @Body() dto: RecordUtilityPaymentDto,
    @CurrentUser() user: User,
  ) {
    return this.utilities.addPayment(id, dto, user.id);
  }
}
