import { Expose, Type } from 'class-transformer';

import { BaseResponseDto } from '#/common/dtos/base-response.dto';
import { AnnouncementResponseDto } from './announcement-response.dto';

export class StudentAnnouncementsResponseDto extends BaseResponseDto {
  @Expose()
  @Type(() => AnnouncementResponseDto)
  currentAnnouncements: AnnouncementResponseDto[];

  @Expose()
  @Type(() => AnnouncementResponseDto)
  upcomingAnnouncements: {
    startDate: string;
  }[];
}
