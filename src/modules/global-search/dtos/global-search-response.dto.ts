import { Expose, Type } from 'class-transformer';

import { LessonResponseDto } from '#/modules/lesson/dtos/lesson-response.dto';
import { ExamResponseDto } from '#/modules/exam/dtos/exam-response.dto';
import { ActivityResponseDto } from '#/modules/activity/dtos/activity-response.dto';
import { StudentPerformanceResponseDto } from '#/modules/performance/dtos/student-performance-response.dto';
import { MeetingScheduleResponseDto } from '#/modules/schedule/dtos/meeting-schedule-response.dto';

export class GlobalSearchResponseDto {
  @Expose()
  @Type(() => LessonResponseDto)
  lessons: LessonResponseDto[];

  @Expose()
  @Type(() => ExamResponseDto)
  exams: ExamResponseDto[];

  @Expose()
  @Type(() => ActivityResponseDto)
  activities: ActivityResponseDto[];

  @Expose()
  @Type(() => StudentPerformanceResponseDto)
  studentPerformances: StudentPerformanceResponseDto[];

  @Expose()
  @Type(() => MeetingScheduleResponseDto)
  meetingSchedules: MeetingScheduleResponseDto[];
}
