import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ExamCompletionResponseDto } from './exam-completion-response.dto';
import { ExamQuestionChoiceResponseDto } from './exam-question-choice-response.dto';
import { ExamQuestionResponseDto } from './exam-question-response.dto';

export class ExamCompletionQuestionAnswerResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => ExamCompletionResponseDto)
  completion: ExamCompletionResponseDto;

  @Expose()
  @Type(() => ExamQuestionResponseDto)
  question: ExamQuestionResponseDto;

  @Expose()
  @Type(() => ExamQuestionChoiceResponseDto)
  selectedQuestionChoice: ExamQuestionChoiceResponseDto;
}
