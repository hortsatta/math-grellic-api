import { Expose } from 'class-transformer';

export class TeacherExamPerformanceResponseDto {
  @Expose()
  totalExamCount: number;

  @Expose()
  totalExamPoints: number;

  @Expose()
  overallExamCompletionPercent: number;
}
