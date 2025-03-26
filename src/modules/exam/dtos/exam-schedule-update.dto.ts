import {
  IsDateString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsInt,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ExamScheduleUpdateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @IsOptional()
  title: string;

  @IsDateString()
  @IsOptional()
  startDate: Date;

  @IsDateString()
  @IsOptional()
  endDate: Date;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  studentIds: number[];
}
