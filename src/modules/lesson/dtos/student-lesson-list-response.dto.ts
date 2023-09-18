import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { LessonResponseDto } from './lesson-response.dto';

export class StudentLessonListResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => LessonResponseDto)
  upcoming: LessonResponseDto[];

  @Expose()
  @Type(() => LessonResponseDto)
  latest: LessonResponseDto[];

  @Expose()
  @Type(() => LessonResponseDto)
  previous: LessonResponseDto[];
}
