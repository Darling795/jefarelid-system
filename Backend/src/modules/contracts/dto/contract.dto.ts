import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateContractDto {
  @IsString() @IsNotEmpty() tenantId!: string;
  @IsString() @IsNotEmpty() roomId!: string;
  @Matches(DATE) startDate!: string;
  @Matches(DATE) endDate!: string;
  @IsNumberString() basicRent!: string;
  @IsOptional() @IsNumberString() escalationRate?: string;
  @IsOptional() @Matches(DATE) escalationAnchorDate?: string;
  @IsNumberString() securityDeposit!: string;
  @IsNumberString() advancePayment!: string;
  @IsInt() @Min(1) @Max(31) paymentDueDay!: number;
}

export class UpdateContractDto {
  @IsOptional() @Matches(DATE) endDate?: string;
  @IsOptional() @IsNumberString() basicRent?: string;
  @IsOptional() @IsNumberString() escalationRate?: string;
  @IsOptional() @IsNumberString() securityDeposit?: string;
  @IsOptional() @IsNumberString() advancePayment?: string;
  @IsOptional() @IsInt() @Min(1) @Max(31) paymentDueDay?: number;
}

export class RenewContractDto {
  @Matches(DATE) startDate!: string;
  @Matches(DATE) endDate!: string;
  @IsOptional() @IsNumberString() basicRent?: string;
  @IsOptional() @IsNumberString() escalationRate?: string;
}

export class TerminateContractDto {
  @Matches(DATE) effectiveDate!: string;
  @IsString() @IsNotEmpty() reason!: string;
}
