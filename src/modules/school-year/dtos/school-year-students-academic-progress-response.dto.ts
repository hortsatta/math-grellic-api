import { Expose } from 'class-transformer';

export class SchoolYearStudentsAcademicProgressResponseDto {
  @Expose()
  passedCount: number;

  @Expose()
  failedCount: number;
  @Expose()
  ongoingCount: number;

  @Expose()
  passedPercent: number;

  @Expose()
  failedPercent: number;

  @Expose()
  ongoingPercent: number;

  @Expose()
  totalStudentCount: number;
}
