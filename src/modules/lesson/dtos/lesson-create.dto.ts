import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class LessonCreateDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  status: number;

  @IsInt()
  @Min(0)
  orderNumber: number;

  @IsString()
  @MinLength(0)
  @MaxLength(255)
  title: string;

  @IsUrl()
  @MaxLength(255)
  videoUrl: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  durationSeconds: number;

  @IsString()
  @IsOptional()
  description: number;

  @IsDateString()
  @IsOptional()
  startDate: Date;

  //TEMP
  // students for schedule
}
