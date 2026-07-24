import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class GenerateInvoiceDto {
  @Matches(/^\d{4}-\d{2}$/, { message: 'periodMonth must be YYYY-MM' })
  periodMonth!: string;

  @IsOptional() @IsString() contractId?: string;
}

export class VoidInvoiceDto {
  @IsString() @IsNotEmpty() reason!: string;
}
