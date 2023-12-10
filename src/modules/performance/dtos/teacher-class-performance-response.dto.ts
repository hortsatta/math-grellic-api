import { Expose } from 'class-transformer';

export class TeacherClassPerformanceResponseDto {
  @Expose()
  overallLessonCompletionPercent: number;

  @Expose()
  overallExamCompletionPercent: number;

  @Expose()
  overallActivityCompletionPercent: number;
}
