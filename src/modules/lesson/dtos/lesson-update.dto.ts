import {
  Min,
  IsOptional,
  IsInt,
  IsPositive,
  IsString,
  MinLength,
  MaxLength,
  IsUrl,
  IsEnum,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
} from 'class-validator';
import { RecordStatus } from '#/common/enums/content.enum';

export class LessonUpdateDto {
  @IsEnum(RecordStatus)
  @IsOptional()
  status: RecordStatus;

  @IsInt()
  @IsPositive()
  @IsOptional()
  orderNumber: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  title: string;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  videoUrl: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds: number;

  @IsString()
  @IsOptional()
  description: string;

  @IsString()
  @IsOptional()
  excerpt: string;

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
