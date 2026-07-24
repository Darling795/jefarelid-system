import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { InvoicesService } from './invoices.service';
import { GenerateInvoiceDto, VoidInvoiceDto } from './dto/invoice.dto';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  list(
    @Query()
    query: {
      page?: string;
      pageSize?: string;
      contractId?: string;
      tenantId?: string;
      buildingId?: string;
      status?: string;
      periodFrom?: string;
      periodTo?: string;
    },
  ) {
    return this.invoices.list(query);
  }

  @Post('generate')
  generate(@Body() dto: GenerateInvoiceDto) {
    return this.invoices.generate(dto.periodMonth, dto.contractId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoices.findOne(id);
  }

  @Post(':id/void')
  void(@Param('id') id: string, @Body() dto: VoidInvoiceDto) {
    return this.invoices.void(id, dto.reason);
  }
}
