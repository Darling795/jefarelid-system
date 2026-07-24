import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBuildingDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateBuildingDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() notes?: string;
}
