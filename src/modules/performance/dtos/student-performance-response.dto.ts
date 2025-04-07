import { Expose } from 'class-transformer';

import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';

export class StudentPerformanceResponseDto extends StudentUserResponseDto {
  @Expose()
  examCurrentCount: number;

  @Expose()
  examTotalCount: number;

  @Expose()
  examCompletedCount: number;

  @Expose()
  examPassedCount: number;

  @Expose()
  examFailedCount: number;

  @Expose()
  examExpiredCount: number;

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
  lessonTotalCount: number;

  @Expose()
  lessonCurrentCount: number;

  @Expose()
  lessonCompletedCount: number;

  @Expose()
  overallLessonCompletionPercent: number;
}
