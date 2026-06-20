import { Expose, Type } from 'class-transformer';

import { LessonResponseDto } from '#/modules/lesson/dtos/lesson-response.dto';
import { ExamResponseDto } from '#/modules/exam/dtos/exam-response.dto';
import { ActivityResponseDto } from '#/modules/activity/dtos/activity-response.dto';
import { MeetingScheduleResponseDto } from '#/modules/schedule/dtos/meeting-schedule-response.dto';

class LessonsResponseDto {
  @Expose()
  @Type(() => LessonResponseDto)
  upcomingLesson: LessonResponseDto | null;

  @Expose()
  @Type(() => LessonResponseDto)
  moreLessons: LessonResponseDto[];
}

class ExamsResponseDto {
  @Expose()
  @Type(() => ExamResponseDto)
  upcomingExam: ExamResponseDto | null;

  @Expose()
  @Type(() => ExamResponseDto)
  ongoingExams: ExamResponseDto[];

  @Expose()
  @Type(() => ExamResponseDto)
  moreExams: ExamResponseDto[];
}

class MeetingSchedulesResponseDto {
  @Expose()
  @Type(() => MeetingScheduleResponseDto)
  upcomingMeetingSchedules: MeetingScheduleResponseDto[];

  @Expose()
  @Type(() => MeetingScheduleResponseDto)
  moreMeetingSchedules: MeetingScheduleResponseDto[];
}

export class StudentGlobalSearchResponseDto {
  @Expose()
  @Type(() => LessonsResponseDto)
  lessons: LessonsResponseDto | null;

  @Expose()
  @Type(() => ExamsResponseDto)
  exams: ExamsResponseDto | null;

  @Expose()
  @Type(() => ActivityResponseDto)
  activities: ActivityResponseDto[];

  @Expose()
  @Type(() => MeetingSchedulesResponseDto)
  meetingSchedules: MeetingSchedulesResponseDto | null;
}
