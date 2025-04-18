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
} from 'class-validator';
import { Type } from 'class-transformer';

import dayjs from '#/common/configs/dayjs.config';
import { UserGender } from '../enums/user.enum';

export abstract class UserCreateDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  profileImageUrl: string;

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
  @MaxDate(dayjs().toDate())
  birthDate: Date;

  @IsPhoneNumber('PH')
  @MaxLength(11)
  phoneNumber: string;

  @IsEnum(UserGender)
  gender: UserGender;
}
