import { Expose, Transform } from 'class-transformer';
import { UserAccountResponseDto } from './user-account-response.dto';

export class StudentUserResponseDto extends UserAccountResponseDto {
  @Expose()
  @Transform(({ obj }) => obj.teacherUser?.publicId || null)
  teacherId: string;

  @Expose()
  aboutMe: string;
}
