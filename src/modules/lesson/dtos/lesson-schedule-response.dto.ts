import { Expose } from 'class-transformer';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';

export class LessonScheduleResponseDto extends BaseResponseDto {
  @Expose()
  startDate: string;

  // TODO students
  // students: type
}
