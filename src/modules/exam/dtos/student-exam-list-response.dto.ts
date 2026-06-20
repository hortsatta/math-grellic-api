import { Expose, Type } from 'class-transformer';
import { ExamResponseDto } from './exam-response.dto';

export class StudentExamListResponseDto {
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
