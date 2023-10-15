import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ExamResponseDto } from './exam-response.dto';

export class StudentExamListResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => ExamResponseDto)
  latestExam: ExamResponseDto | null;

  @Expose()
  @Type(() => ExamResponseDto)
  upcomingExam: ExamResponseDto | null;

  @Expose()
  @Type(() => ExamResponseDto)
  previousExams: ExamResponseDto[];

  @Expose()
  @Type(() => ExamResponseDto)
  ongoingExams: ExamResponseDto[];
}
