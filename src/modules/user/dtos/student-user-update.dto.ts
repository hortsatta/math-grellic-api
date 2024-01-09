import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { UserUpdateDto } from './user-update.dto';

export class StudentUserUpdateDto extends UserUpdateDto {
  @IsString()
  @Length(11)
  @IsOptional()
  teacherId: string;

  @IsString()
  @IsOptional()
  aboutMe: string;

  @IsUrl()
  @MaxLength(255)
  @IsOptional()
  messengerLink: string;
}
