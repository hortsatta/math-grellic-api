import { Expose, Type } from 'class-transformer';
import { LessonResponseDto } from './lesson-response.dto';

export class StudentLessonListResponseDto {
  @Expose()
  @Type(() => LessonResponseDto)
  latestLesson: LessonResponseDto | null;

  @Expose()
  @Type(() => LessonResponseDto)
  upcomingLesson: LessonResponseDto | null;

  @Expose()
  @Type(() => LessonResponseDto)
  previousLessons: LessonResponseDto[];
}
