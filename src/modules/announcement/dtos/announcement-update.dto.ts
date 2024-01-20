import {
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsDateString,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
} from 'class-validator';

export class AnnouncementUpdateDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  id: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  title: string;

  @IsString()
  @IsOptional()
  description: string;

  @IsDateString()
  @IsOptional()
  startDate: Date;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  studentIds: number[];
}
