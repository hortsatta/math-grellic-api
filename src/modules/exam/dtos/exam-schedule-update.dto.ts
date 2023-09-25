import {
  IsDateString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  ArrayMinSize,
  IsInt,
  IsPositive,
} from 'class-validator';

export class ExamScheduleUpdateDto {
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
