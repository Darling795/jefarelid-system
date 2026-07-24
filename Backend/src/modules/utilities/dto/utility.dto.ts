import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateUtilityBillDto {
  @IsString() buildingId!: string;
  @IsString() @IsNotEmpty() utilityType!: string;
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
