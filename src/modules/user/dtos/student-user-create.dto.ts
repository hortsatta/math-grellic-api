import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserCreateDto } from './user-create.dto';

export class StudentUserCreateDto extends UserCreateDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @IsOptional()
  password: string;

  @IsString()
  @Length(11)
  teacherId: string;

  @IsString()
  @IsOptional()
  aboutMe: string;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  messengerLink: string;
}
