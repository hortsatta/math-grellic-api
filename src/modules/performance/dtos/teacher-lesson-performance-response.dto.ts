import { Expose } from 'class-transformer';

export class TeacherLessonPerformanceResponseDto {
  @Expose()
  lessonTotalCount: number;

  @Expose()
  totalLessonDurationSeconds: number;

  @Expose()
  overallLessonCompletionPercent: number;
}
