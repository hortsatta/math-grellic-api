import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { UserCreateDto } from './user-create.dto';

export class StudentUserCreateDto extends UserCreateDto {
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @IsOptional()
  password: string;

  @IsString()
  @IsOptional()
  aboutMe: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsOptional()
  messengerLink: string;
}
