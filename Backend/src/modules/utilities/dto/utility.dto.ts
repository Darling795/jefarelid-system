import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { UtilityType } from '@prisma/client';

export class CreateUtilityBillDto {
  @IsString() buildingId!: string;
  @IsEnum(UtilityType) utilityType!: UtilityType;
  @Matches(/^\d{4}-\d{2}$/) billingPeriod!: string;
  @IsNumberString() amount!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate!: string;
}

export class UpdateUtilityBillDto {
  @IsOptional() @IsNumberString() amount?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dueDate?: string;
}

export class RecordUtilityPaymentDto {
  @IsNumberString() amountPaid!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) paymentDate!: string;
  @IsOptional() @IsString() voucherNumber?: string;
  @IsOptional() @IsString() orNumber?: string;
}
