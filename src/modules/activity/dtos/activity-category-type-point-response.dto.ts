import { Expose } from 'class-transformer';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';

export class ActivityCategoryTypePointResponseDto extends BaseResponseDto {
  @Expose()
  pointsPerQuestion: number;

  @Expose()
  durationSeconds: number;
}
