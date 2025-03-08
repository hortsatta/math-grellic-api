import { Expose, Transform, plainToInstance } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { UserRole, UserApprovalStatus } from '../enums/user.enum';
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
  @Transform(({ obj }) => {
    // const {teacherUserAccount, studentUserAccount, adminUserAccount} = obj
    const { teacherUserAccount, studentUserAccount } = obj;

    if (!!teacherUserAccount) {
      return plainToInstance(TeacherUserResponseDto, teacherUserAccount, {
        excludeExtraneousValues: true,
      });
    } else if (!!studentUserAccount) {
      return plainToInstance(StudentUserResponseDto, studentUserAccount, {
        excludeExtraneousValues: true,
      });
    }
  })
  userAccount: TeacherUserResponseDto | StudentUserResponseDto;
}
