import { Expose, Transform } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { User } from '#/modules/user/entities/user.entity';
import {
  SchoolYearAcademicProgress,
  SchoolYearEnrollmentApprovalStatus,
} from '../enums/school-year-enrollment.enum';
import { SchoolYear } from '../entities/school-year.entity';

export class SchoolYearEnrollmentResponseDto extends BaseResponseDto {
  @Expose()
  approvalStatus: SchoolYearEnrollmentApprovalStatus;

  @Expose()
  approvalDate: Date;

  @Expose()
  approvalRejectedReason: string;

  @Expose()
  academicProgress: SchoolYearAcademicProgress;

  @Expose()
  academicProgressRemarks: string;

  @Expose()
  schoolYear: SchoolYear;

  @Expose()
  user: User;

  @Expose()
  @Transform(({ obj }) => obj.teacherUser?.publicId || null)
  teacherPublicId: string;
}
