import {
  IsNumber,
  Min,
  IsOptional,
  IsInt,
  IsPositive,
  IsString,
  MinLength,
  MaxLength,
  IsUrl,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { RecordStatus } from '#/common/enums/content.enum';

export class LessonUpdateDto {
  @IsNumber()
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

  @IsDateString()
  @IsOptional()
  startDate: Date;
}
