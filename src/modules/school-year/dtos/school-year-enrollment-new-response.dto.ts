import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { UserResponseDto } from '#/modules/user/dtos/user-response.dto';
import { SchoolYearEnrollmentResponseDto } from './school-year-enrollment-response.dto';

export class SchoolYearEnrollmentNewResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => UserResponseDto)
  user: UserResponseDto;

  @Expose()
  @Type(() => SchoolYearEnrollmentResponseDto)
  enrollment: SchoolYearEnrollmentResponseDto;
}
