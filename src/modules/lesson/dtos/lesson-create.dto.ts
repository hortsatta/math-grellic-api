import {
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
import { ContentStatus } from '#/common/enums/content.enum';

export class LessonCreateDto {
  @IsEnum(ContentStatus)
  @IsOptional()
  status: ContentStatus;

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

  @IsDateString()
  @IsOptional()
  startDate: Date;

  // TODO
  // students for schedule
}
