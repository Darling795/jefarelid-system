import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';
import { RoomStatus } from '@prisma/client';

export class CreateRoomDto {
  @IsString() @IsNotEmpty() roomNumber!: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsNumberString() areaSqm?: string;
  @IsNumberString() baseRate!: string;
}

export class UpdateRoomDto {
  @IsOptional() @IsString() @IsNotEmpty() roomNumber?: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsNumberString() areaSqm?: string;
  @IsOptional() @IsNumberString() baseRate?: string;
  @IsOptional() @IsEnum(RoomStatus) status?: RoomStatus;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
