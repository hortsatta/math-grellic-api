import { IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class LessonScheduleUpdateDto {
  @IsDateString()
  @IsOptional()
  startDate: Date;

  // TODO students
  // students: Type

  @IsBoolean()
  @IsOptional()
  isActive: boolean;
}
