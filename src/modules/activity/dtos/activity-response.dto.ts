import { Expose, Type } from 'class-transformer';

import { RecordStatus } from '#/common/enums/content.enum';
import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { ActivityCategoryResponseDto } from './activity-category-response.dto';

export class ActivityResponseDto extends BaseResponseDto {
  @Expose()
  status: RecordStatus;

  @Expose()
  orderNumber: number;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  game: { name: string; type: string };

  @Expose()
  description: string;

  @Expose()
  excerpt: string;

  @Expose()
  @Type(() => ActivityCategoryResponseDto)
  categories: ActivityCategoryResponseDto[];
}
