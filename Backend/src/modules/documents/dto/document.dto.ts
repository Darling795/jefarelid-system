import { IsOptional, IsString } from 'class-validator';

export class UploadDocumentDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() category?: string;
}
