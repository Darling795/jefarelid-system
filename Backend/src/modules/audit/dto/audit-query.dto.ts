import { IsIn, IsOptional, IsString } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @IsString() page?: string;
  @IsOptional() @IsString() pageSize?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() entityType?: string;

  @IsOptional()
  @IsIn(['create', 'update', 'delete'])
  action?: 'create' | 'update' | 'delete';

  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
}
