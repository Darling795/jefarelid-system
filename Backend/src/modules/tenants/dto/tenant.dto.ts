import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @IsString() @IsNotEmpty() businessName!: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsString() contactNumber?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() tin?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() @IsNotEmpty() businessName?: string;
  @IsOptional() @IsString() contactPerson?: string;
  @IsOptional() @IsString() contactNumber?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() tin?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsEnum(TenantStatus) status?: TenantStatus;
}

export class ApplyCreditDto {
  @IsString() @IsNotEmpty() invoiceId!: string;
  @IsNumberString() amount!: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) paymentDate?: string;
}
