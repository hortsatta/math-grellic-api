import { Expose } from 'class-transformer';
import { UserAccountResponseDto } from './user-account-response.dto';

export class TeacherUserResponseDto extends UserAccountResponseDto {
  @Expose()
  aboutMe: string;

  @Expose()
  educationalBackground: string;

  @Expose()
  teachingExperience: string;

  @Expose()
  teachingCertifications: string;

  @Expose()
  website: string;

  @Expose()
  socialMediaLinks: string[];

  @Expose()
  emails: string[];
}

// @Expose()
// @Type(() => LessonScheduleResponseDto)
// schedules: LessonScheduleResponseDto[];
