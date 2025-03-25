import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UserLastStepRegisterDto {
  @IsString()
  @IsOptional()
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;
}
