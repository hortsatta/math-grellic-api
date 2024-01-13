import { Expose } from 'class-transformer';

export class TeacherActivityPerformanceResponseDto {
  @Expose()
  totalActivityCount: number;

  @Expose()
  overallActivityCompletionPercent: number;
}
