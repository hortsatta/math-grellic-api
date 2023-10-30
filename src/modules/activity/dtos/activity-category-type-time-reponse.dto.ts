import { Expose } from 'class-transformer';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';

export class ActivityCategoryTypeTimeResponseDto extends BaseResponseDto {
  @Expose()
  correctAnswerCount: number;
}
