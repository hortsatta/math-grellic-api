import { Expose, Type } from 'class-transformer';

import { LessonScheduleResponseDto } from '#/modules/lesson/dtos/lesson-schedule-response.dto';
import { LessonCompletionResponseDto } from '#/modules/lesson/dtos/lesson-completion-response.dto';
import { ExamScheduleResponseDto } from '#/modules/exam/dtos/exam-schedule-response.dto';
import { ExamCompletionResponseDto } from '#/modules/exam/dtos/exam-completion-response.dto';
import { ActivityCategoryCompletionResponseDto } from '#/modules/activity/dtos/activity-category-completion-response.dto';
import { UserAccountResponseDto } from './user-account-response.dto';

export class StudentUserResponseDto extends UserAccountResponseDto {
  @Expose()
  aboutMe: string;

  @Expose()
  messengerLink: string;

  @Expose()
  @Type(() => LessonScheduleResponseDto)
  lessonSchedules: LessonScheduleResponseDto[];

  @Expose()
  @Type(() => ExamScheduleResponseDto)
  examSchedules: ExamScheduleResponseDto[];

  @Expose()
  @Type(() => LessonCompletionResponseDto)
  lessonCompletions: LessonCompletionResponseDto[];

  @Expose()
  @Type(() => ExamCompletionResponseDto)
  examCompletions: ExamCompletionResponseDto[];

  @Expose()
  @Type(() => ActivityCategoryCompletionResponseDto)
  activityCategoryCompletions: ActivityCategoryCompletionResponseDto[];
}
