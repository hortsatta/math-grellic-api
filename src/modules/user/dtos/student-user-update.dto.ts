import {
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
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

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  messengerLink: string;
}
