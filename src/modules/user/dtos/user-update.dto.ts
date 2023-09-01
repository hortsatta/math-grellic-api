import {
  IsDate,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  MaxDate,
  MaxLength,
} from 'class-validator';

import { UserApprovalStatus, UserGender } from '../enums/user.enum';
import { Type } from 'class-transformer';

export abstract class UserUpdateDto {
  // @IsEmail()
  // @MaxLength(255)
  // @IsOptional()
  // email: string;

  // @IsString()
  // @MinLength(8)
  // @MaxLength(100)
  // @IsOptional()
  // password: string;

  // @IsString()
  // @Length(11)
  // @IsOptional()
  // publicId: string;

  // @IsEnum(UserRole)
  // @IsOptional()
  // role: UserRole;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  profileImageUrl: string;

  @IsEnum(UserApprovalStatus)
  @IsOptional()
  approvalStatus: UserApprovalStatus;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  firstName: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  lastName: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  middleName: string;

  @Type(() => Date)
  @IsDate()
  @MaxDate(new Date())
  @IsOptional()
  birthDate: Date;

  @IsPhoneNumber('PH')
  @MaxLength(11)
  @IsOptional()
  phoneNumber: string;

  @IsEnum(UserGender)
  @IsOptional()
  gender: UserGender;
}
