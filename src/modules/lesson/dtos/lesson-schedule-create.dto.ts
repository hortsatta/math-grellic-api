import { IsDateString, IsInt, IsPositive } from 'class-validator';

export class LessonScheduleCreateDto {
  @IsDateString()
  startDate: Date;

  // TODO foreign students id
  // students: Type

  @IsInt()
  @IsPositive()
  lessonId: number;
}
