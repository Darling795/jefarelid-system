import {
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
} from 'class-validator';

export const PAYMENT_METHODS = ['cash', 'postdated_check'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class CreatePaymentDto {
  @IsString() @IsNotEmpty() invoiceId!: string;
  @IsNumberString() amountPaid!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) paymentDate!: string;
  // OR number is auto-generated server-side (unique); not a client input.
  @IsIn(PAYMENT_METHODS) paymentMethod!: PaymentMethod;
  // Required only for postdated checks.
  @ValidateIf((o: CreatePaymentDto) => o.paymentMethod === 'postdated_check')
  @IsString()
  @IsNotEmpty()
  checkNumber?: string;
  @IsOptional() @IsString() remarks?: string;
}

export class UpdatePaymentDto {
  @IsOptional() @IsNumberString() amountPaid?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) paymentDate?: string;
  @IsOptional() @IsIn(PAYMENT_METHODS) paymentMethod?: PaymentMethod;
  @ValidateIf((o: UpdatePaymentDto) => o.paymentMethod === 'postdated_check')
  @IsString()
  @IsNotEmpty()
  checkNumber?: string;
  @IsOptional() @IsString() remarks?: string;
}

export class DeletePaymentDto {
  @IsString() @IsNotEmpty() reason!: string;
}
