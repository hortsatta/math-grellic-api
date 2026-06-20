import { Expose, Type } from 'class-transformer';
import { AnnouncementResponseDto } from './announcement-response.dto';

export class StudentAnnouncementsResponseDto {
  @Expose()
  @Type(() => AnnouncementResponseDto)
  currentAnnouncements: AnnouncementResponseDto[];

  @Expose()
  @Type(() => AnnouncementResponseDto)
  upcomingAnnouncements: {
    startDate: string;
  }[];
}
