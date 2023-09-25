import {
  IsDateString,
  IsInt,
  IsPositive,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsOptional,
} from 'class-validator';

export class ExamScheduleCreateDto {
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
