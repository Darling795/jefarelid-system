import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { ContractsService } from './contracts.service';
import {
  CreateContractDto,
  RenewContractDto,
  TerminateContractDto,
  UpdateContractDto,
} from './dto/contract.dto';

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  list(
    @Query()
    query: {
      page?: string;
      pageSize?: string;
      status?: string;
      buildingId?: string;
      tenantId?: string;
      expiringWithinDays?: string;
    },
  ) {
    return this.contracts.list(query);
  }

  // Must precede :id so "archive" is not treated as an id.
  @Get('archive')
  archive() {
    return this.contracts.archive();
  }

  @Post()
  create(@Body() dto: CreateContractDto) {
    return this.contracts.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contracts.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContractDto) {
    return this.contracts.update(id, dto);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.contracts.activate(id);
  }

  @Post(':id/renew')
  renew(@Param('id') id: string, @Body() dto: RenewContractDto) {
    return this.contracts.renew(id, dto);
  }

  @Post(':id/terminate')
  terminate(@Param('id') id: string, @Body() dto: TerminateContractDto) {
    return this.contracts.terminate(id, dto);
  }
}
