import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ArrayMinSize,
  ArrayNotEmpty,
  IsInt,
  IsPositive,
} from 'class-validator';

import { RecordStatus } from '#/common/enums/content.enum';

export class SchoolYearUpdateDto {
  @IsEnum(RecordStatus)
  @IsOptional()
  status: RecordStatus;

  // If null then set title automatically taken from start and end date
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

  @IsDateString()
  @IsOptional()
  endDate: Date;

  @IsDateString()
  @IsOptional()
  enrollmentStartDate: Date;

  @IsDateString()
  @IsOptional()
  enrollmentEndDate: Date;

  // If null then let backend set grace period automatically
  @IsDateString()
  @IsOptional()
  gracePeriodEndDate: Date;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  teacherIds: number[];
}
