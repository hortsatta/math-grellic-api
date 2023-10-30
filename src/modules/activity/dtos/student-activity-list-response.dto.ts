import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityResponseDto } from './activity-response.dto';

export class StudentActivityListResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => ActivityResponseDto)
  featuredActivities: ActivityResponseDto[];

  @Expose()
  @Type(() => ActivityResponseDto)
  otherActivities: ActivityResponseDto[];
}
