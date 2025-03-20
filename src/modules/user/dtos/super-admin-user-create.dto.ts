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

export class SuperAdminUserCreateDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsEnum(UserRole)
  @Equals(UserRole.SuperAdmin)
  @IsOptional()
  role: UserRole;
}
