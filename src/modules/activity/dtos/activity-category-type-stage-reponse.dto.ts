import { Expose } from 'class-transformer';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';

export class ActivityCategoryTypeStageResponseDto extends BaseResponseDto {
  @Expose()
  totalStageCount: number;
}
