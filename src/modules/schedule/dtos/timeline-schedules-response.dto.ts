import { Expose, Type } from 'class-transformer';

import { LessonScheduleResponseDto } from '#/modules/lesson/dtos/lesson-schedule-response.dto';
import { ExamScheduleResponseDto } from '#/modules/exam/dtos/exam-schedule-response.dto';
import { MeetingScheduleResponseDto } from './meeting-schedule-response.dto';

export class TimelineSchedulesResponseDto {
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
