import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class UploadFileOptionsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  baseName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  folderName: string;
}
