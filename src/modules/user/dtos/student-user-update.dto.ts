import { IsOptional, IsString, Length } from 'class-validator';
import { UserUpdateDto } from './user-update.dto';

export class StudentUserUpdateDto extends UserUpdateDto {
  @IsString()
  @Length(11)
  @IsOptional()
  teacherId: string;

  @IsString()
  @IsOptional()
  aboutMe: string;
}
