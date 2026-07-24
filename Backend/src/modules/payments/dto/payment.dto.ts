import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString() @IsNotEmpty() invoiceId!: string;
  @IsNumberString() amountPaid!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) paymentDate!: string;
  @IsOptional() @IsString() orNumber?: string;
  @IsOptional() @IsString() paymentMethod?: string;
  @IsOptional() @IsString() remarks?: string;
}

export class DeletePaymentDto {
  @IsString() @IsNotEmpty() reason!: string;
}
