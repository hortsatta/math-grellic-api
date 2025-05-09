import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';

import { RecordStatus } from '#/common/enums/content.enum';

export class SchoolYearCreateDto {
  @IsEnum(RecordStatus)
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
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsDateString()
  enrollmentStartDate: Date;

  @IsDateString()
  enrollmentEndDate: Date;

  // If null then let backend set grace period automatically
  @IsDateString()
  @IsOptional()
  gracePeriodEndDate: Date;

  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  teacherIds: number[];
}
