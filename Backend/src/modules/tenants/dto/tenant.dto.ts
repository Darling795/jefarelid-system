import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
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
