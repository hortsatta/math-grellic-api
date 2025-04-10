import { Expose } from 'class-transformer';

export class TeacherActivityPerformanceResponseDto {
  @Expose()
  activityTotalCount: number;

  @Expose()
  overallActivityCompletionPercent: number;
}
