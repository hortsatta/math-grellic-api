import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { LessonScheduleResponseDto } from '#/modules/lesson/dtos/lesson-schedule-response.dto';
import { ExamScheduleResponseDto } from '#/modules/exam/dtos/exam-schedule-response.dto';
import { MeetingScheduleResponseDto } from './meeting-schedule-response.dto';

export class TimelineSchedulesResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => LessonScheduleResponseDto)
  lessonSchedules: LessonScheduleResponseDto[];

  @Expose()
  @Type(() => ExamScheduleResponseDto)
  examSchedules: ExamScheduleResponseDto[];

  @Expose()
  @Type(() => MeetingScheduleResponseDto)
  meetingSchedules: MeetingScheduleResponseDto[];
}
