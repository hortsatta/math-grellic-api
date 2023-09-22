import { Expose, Type } from 'class-transformer';

import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { LessonResponseDto } from './lesson-response.dto';

export class LessonCompletionResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => LessonResponseDto)
  lesson: LessonResponseDto;

  @Expose()
  @Type(() => StudentUserResponseDto)
  student: StudentUserResponseDto;
}
