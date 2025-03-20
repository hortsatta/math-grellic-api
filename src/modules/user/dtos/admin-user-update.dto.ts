import {
  IsEnum,
  Equals,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
} from 'class-validator';

import { UserRole } from '../enums/user.enum';
import { UserUpdateDto } from './user-update.dto';

export class AdminUserUpdateDto extends UserUpdateDto {
  @IsEnum(UserRole)
  @Equals(UserRole.Teacher)
  @IsOptional()
  role: UserRole;

  @IsString()
  @IsOptional()
  aboutMe: string;

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
