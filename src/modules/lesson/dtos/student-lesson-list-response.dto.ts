import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { LessonResponseDto } from './lesson-response.dto';

export class StudentLessonListResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => LessonResponseDto)
  latestLesson: LessonResponseDto | null;

  @Expose()
  @Type(() => LessonResponseDto)
  upcomingLesson: LessonResponseDto | null;

  @Expose()
  @Type(() => LessonResponseDto)
  previousLessons: LessonResponseDto[];
}
