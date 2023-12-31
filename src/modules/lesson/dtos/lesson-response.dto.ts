import { Expose, Type } from 'class-transformer';

import { RecordStatus } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { LessonScheduleResponseDto } from './lesson-schedule-response.dto';
import { LessonCompletionResponseDto } from './lesson-completion-response.dto';

export class LessonResponseDto extends BaseResponseDto {
  @Expose()
  status: RecordStatus;

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
  excerpt: string;

  @Expose()
  @Type(() => LessonScheduleResponseDto)
  schedules: LessonScheduleResponseDto[];

  @Expose()
  @Type(() => LessonCompletionResponseDto)
  completions: LessonCompletionResponseDto[];
}
