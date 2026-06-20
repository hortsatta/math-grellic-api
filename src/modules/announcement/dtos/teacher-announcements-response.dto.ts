import { Expose, Type } from 'class-transformer';
import { AnnouncementResponseDto } from './announcement-response.dto';

export class TeacherAnnouncementsResponseDto {
  @Expose()
  @Type(() => AnnouncementResponseDto)
  currentAnnouncements: AnnouncementResponseDto[];

  @Expose()
  @Type(() => AnnouncementResponseDto)
  upcomingAnnouncements: AnnouncementResponseDto[];
}
