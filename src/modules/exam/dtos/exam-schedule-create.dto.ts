import {
  IsDateString,
  IsInt,
  IsPositive,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ExamScheduleCreateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsDateString()
  startDate: Date;

  @IsDateString()
  endDate: Date;

  @IsInt()
  @IsPositive()
  examId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @IsOptional()
  studentIds: number[];
}
