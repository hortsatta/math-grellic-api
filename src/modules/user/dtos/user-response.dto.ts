import { Expose, Transform, plainToInstance } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { UserRole, UserApprovalStatus } from '../enums/user.enum';
import { AdminUserResponseDto } from './admin-user-response.dto';
import { TeacherUserResponseDto } from './teacher-user-response.dto';
import { StudentUserResponseDto } from './student-user-response.dto';

export class UserResponseDto extends BaseResponseDto {
  @Expose()
  publicId: string;

  @Expose()
  role: UserRole;

  @Expose()
  email: string;

  @Expose()
  profileImageUrl: string;

  @Expose()
  approvalStatus: UserApprovalStatus;

  @Expose()
  approvalDate: Date;

  @Expose()
  approvalRejectedReason: string;

  @Expose()
  @Transform(({ obj }) => {
    const { adminUserAccount, teacherUserAccount, studentUserAccount } = obj;

    if (!!teacherUserAccount) {
      return plainToInstance(TeacherUserResponseDto, teacherUserAccount, {
        excludeExtraneousValues: true,
      });
    } else if (!!studentUserAccount) {
      return plainToInstance(StudentUserResponseDto, studentUserAccount, {
        excludeExtraneousValues: true,
      });
    } else if (!!adminUserAccount) {
      return plainToInstance(AdminUserResponseDto, adminUserAccount, {
        excludeExtraneousValues: true,
      });
    }
  })
  userAccount:
    | AdminUserResponseDto
    | TeacherUserResponseDto
    | StudentUserResponseDto;
}
