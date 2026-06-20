import { Expose, Type } from 'class-transformer';
import { ActivityResponseDto } from './activity-response.dto';

export class StudentActivityListResponseDto {
  @Expose()
  @Type(() => ActivityResponseDto)
  featuredActivities: ActivityResponseDto[];

  @Expose()
  @Type(() => ActivityResponseDto)
  otherActivities: ActivityResponseDto[];
}
