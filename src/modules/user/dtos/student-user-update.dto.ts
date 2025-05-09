import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserUpdateDto } from './user-update.dto';

export class StudentUserUpdateDto extends UserUpdateDto {
  @IsString()
  @IsOptional()
  aboutMe: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  messengerLink: string;
}
