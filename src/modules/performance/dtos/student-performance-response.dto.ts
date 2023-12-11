import { Expose } from 'class-transformer';

import { StudentUserResponseDto } from '../../user/dtos/student-user-response.dto';

export class StudentPerformanceResponseDto extends StudentUserResponseDto {
  @Expose()
  currentExamCount: number;

  @Expose()
  examsCompletedCount: number;

  @Expose()
  examsPassedCount: number;

  @Expose()
  examsFailedCount: number;

  @Expose()
  examsExpiredCount: number;

  @Expose()
  overallExamCompletionPercent: number;

  @Expose()
  overallExamRank: number;

  @Expose()
  overallExamScore: number | null;

  @Expose()
  totalActivityCount: number;

  @Expose()
  activitiesCompletedCount: number;

  @Expose()
  overallActivityCompletionPercent: number;

  @Expose()
  overallActivityRank: number;

  @Expose()
  overallActivityScore: number | null;

  @Expose()
  totalLessonCount: number;

  @Expose()
  currentLessonCount: number;

  @Expose()
  lessonsCompletedCount: number;

  @Expose()
  overallLessonCompletionPercent: number;
}
