import { Expose, Type } from 'class-transformer';

import { ContentStatus } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { LessonScheduleResponseDto } from './lesson-schedule-response.dto';

export class LessonResponseDto extends BaseResponseDto {
  @Expose()
  status: ContentStatus;

  @Expose()
  orderNumber: number;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  videoUrl: string;

  @Expose()
  durationSeconds: number;

  @Expose()
  description: string;

  @Expose()
  @Type(() => LessonScheduleResponseDto)
  schedules: LessonScheduleResponseDto[];
}
