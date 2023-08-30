import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { LessonScheduleResponseDto } from './lesson-schedule-response.dto';

export class LessonResponseDto extends BaseResponseDto {
  @Expose()
  status: number;

  @Expose()
  orderNumber: number;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  videoUrl: number;

  @Expose()
  durationSeconds: number;

  @Expose()
  description: number;

  @Expose()
  @Type(() => LessonScheduleResponseDto)
  schedules: LessonScheduleResponseDto[];
}
