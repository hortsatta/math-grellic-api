import {
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsInt,
  IsPositive,
  IsString,
  MinLength,
  MaxLength,
  IsUrl,
  IsDateString,
} from 'class-validator';

export class LessonUpdateDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  status: number;

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
}
