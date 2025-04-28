import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { TeacherUserAccount } from '#/modules/user/entities/teacher-user-account.entity';
import { User } from '#/modules/user/entities/user.entity';
import { Expose } from 'class-transformer';
import { SchoolYear } from '../entities/school-year.entity';
import { SchoolYearEnrollmentApprovalStatus } from '../enums/school-year-enrollment.enum';

export class SchoolYearEnrollmentResponseDto extends BaseResponseDto {
  @Expose()
  approvalStatus: SchoolYearEnrollmentApprovalStatus;

  @Expose()
  approvalDate: Date;

  @Expose()
  approvalRejectedReason: string;

  @Expose()
  schoolYear: SchoolYear;

  @Expose()
  user: User;

  @Expose()
  teacherUser: TeacherUserAccount;
}
