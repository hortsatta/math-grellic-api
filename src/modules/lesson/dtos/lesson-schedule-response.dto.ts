import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';
import { LessonResponseDto } from './lesson-response.dto';

export class LessonScheduleResponseDto extends BaseResponseDto {
  @Expose()
  startDate: string;

  @Expose()
  @Type(() => LessonResponseDto)
  lesson: LessonResponseDto;

  @Expose()
  @Type(() => StudentUserResponseDto)
  students: StudentUserResponseDto[];
}
