import {
  Equals,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserCreateDto } from './user-create.dto';
import { UserRole } from '../enums/user.enum';

export class TeacherUserCreateDto extends UserCreateDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

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

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  messengerLink: string;

  @IsEmail(null, { each: true })
  @MaxLength(255, { each: true })
  @IsOptional()
  emails: string[];
}
