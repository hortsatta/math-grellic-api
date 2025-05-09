import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RecordStatus } from '#/common/enums/content.enum';

export class LessonCreateDto {
  @IsEnum(RecordStatus)
  @IsOptional()
  status: RecordStatus;

  @IsInt()
  @IsPositive()
  orderNumber: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsUrl()
  @MaxLength(255)
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

  @IsInt()
  @IsPositive()
  @IsOptional()
  schoolYearId: number;
}
