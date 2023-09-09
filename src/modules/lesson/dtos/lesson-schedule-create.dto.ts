import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsInt,
  IsPositive,
} from 'class-validator';

export class LessonScheduleCreateDto {
  @IsDateString()
  startDate: Date;

  @IsInt()
  @IsPositive()
  lessonId: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @IsPositive({ each: true })
  studentIds: number[];
}
