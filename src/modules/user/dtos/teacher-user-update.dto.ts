import {
  Equals,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { UserUpdateDto } from './user-update.dto';
import { UserRole } from '../enums/user.enum';

export class TeacherUserUpdateDto extends UserUpdateDto {
  @IsEnum(UserRole)
  @Equals(UserRole.Teacher)
  @IsOptional()
  role: UserRole;

  @IsString()
  @IsOptional()
  aboutMe: string;

  @IsString()
  @IsOptional()
  educationalBackground: string;

  @IsString()
  @IsOptional()
  teachingExperience: string;

  @IsString()
  @IsOptional()
  teachingCertifications: string;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  website: string;

  @IsUrl(null, { each: true })
  @MaxLength(255, { each: true })
  @IsOptional()
  socialMediaLinks: string[];

  @IsEmail(null, { each: true })
  @MaxLength(255, { each: true })
  @IsOptional()
  emails: string[];
}
