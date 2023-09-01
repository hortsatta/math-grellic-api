import {
  IsDate,
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxDate,
  MaxLength,
  MinLength,
} from 'class-validator';

import { UserApprovalStatus, UserGender } from '../enums/user.enum';
import { Type } from 'class-transformer';

export abstract class UserCreateDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  profileImageUrl: string;

  @IsEnum(UserApprovalStatus)
  approvalStatus: UserApprovalStatus;

  @IsString()
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MaxLength(50)
  lastName: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  middleName: string;

  @Type(() => Date)
  @IsDate()
  @MaxDate(new Date())
  birthDate: Date;

  @IsPhoneNumber('PH')
  @MaxLength(11)
  phoneNumber: string;

  @IsEnum(UserGender)
  gender: UserGender;
}
