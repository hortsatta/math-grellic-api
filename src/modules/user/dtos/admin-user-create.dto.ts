import {
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  Equals,
  IsOptional,
  IsEmail,
} from 'class-validator';

import { UserRole } from '../enums/user.enum';
import { UserCreateDto } from './user-create.dto';

export class AdminUserCreateDto extends UserCreateDto {
  @IsEnum(UserRole)
  @Equals(UserRole.Admin)
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
