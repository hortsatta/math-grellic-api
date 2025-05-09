import { Expose } from 'class-transformer';

import { RecordStatus } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';

export class SchoolYearResponseDto extends BaseResponseDto {
  @Expose()
  status: RecordStatus;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  description: string;

  @Expose()
  startDate: Date;

  @Expose()
  endDate: Date;

  @Expose()
  enrollmentStartDate: Date;

  @Expose()
  enrollmentEndDate: Date;

  @Expose()
  gracePeriodEndDate: Date;

  @Expose()
  isActive: boolean;

  @Expose()
  isDone: boolean;

  @Expose()
  isEnrolled: boolean;

  @Expose()
  canEnroll: boolean;

  @Expose()
  totalTeacherCount: number;

  @Expose()
  totalStudentCount: number;
}
