import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';

export class AnnouncementResponseDto extends BaseResponseDto {
  @Expose()
  title: string;

  @Expose()
  description: string;

  @Expose()
  startDate: string;

  @Expose()
  @Type(() => StudentUserResponseDto)
  students: StudentUserResponseDto[];
}
