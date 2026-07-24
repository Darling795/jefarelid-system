import { Controller, Get, Param, Query } from '@nestjs/common';

import { Roles } from '../../common/auth/roles.decorator';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';

// Super Admin only, read-only. There is no POST/PATCH/DELETE on this resource.
@Roles('super_admin')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: AuditQueryDto) {
    return this.auditService.list(query);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.auditService.getOne(id);
  }
}
