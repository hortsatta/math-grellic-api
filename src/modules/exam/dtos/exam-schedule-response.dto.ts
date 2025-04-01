import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { StudentUserResponseDto } from '#/modules/user/dtos/student-user-response.dto';
import { ExamResponseDto } from './exam-response.dto';

export class ExamScheduleResponseDto extends BaseResponseDto {
  @Expose()
  title: string;

  @Expose()
  startDate: string;

  @Expose()
  endDate: string;

  @Expose()
  @Type(() => ExamResponseDto)
  exam: ExamResponseDto;

  @Expose()
  @Type(() => StudentUserResponseDto)
  students: StudentUserResponseDto[];

  @Expose()
  studentCount: string;

  @Expose()
  isRecent: boolean;
}
