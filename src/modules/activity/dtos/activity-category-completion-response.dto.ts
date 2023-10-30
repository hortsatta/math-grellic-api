import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';
import { ActivityCategoryCompletionQuestionAnswerResponseDto } from './activity-category-completion-question-answer-response.dto';
import { ActivityCategoryResponseDto } from './activity-category-response.dto';

export class ActivityCategoryCompletionResponseDto extends BaseResponseDto {
  @Expose()
  score: number | null;

  @Expose()
  timeCompletedSeconds: number | null;

  @Expose()
  submittedAt: string;

  @Expose()
  @Type(() => ActivityCategoryResponseDto)
  activityCategory: ActivityCategoryResponseDto;

  @Expose()
  @Type(() => ActivityCategoryCompletionQuestionAnswerResponseDto)
  questionAnswers: ActivityCategoryCompletionQuestionAnswerResponseDto[];

  @Expose()
  @Type(() => StudentUserResponseDto)
  student: StudentUserResponseDto;
}
