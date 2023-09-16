import {
  IsDateString,
  IsOptional,
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsPositive,
} from 'class-validator';

export class LessonScheduleUpdateDto {
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
}
