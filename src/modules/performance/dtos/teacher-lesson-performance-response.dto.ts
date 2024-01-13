import { Expose } from 'class-transformer';

export class TeacherLessonPerformanceResponseDto {
  @Expose()
  totalLessonCount: number;

  @Expose()
  totalLessonDurationSeconds: number;

  @Expose()
  overallLessonCompletionPercent: number;
}
