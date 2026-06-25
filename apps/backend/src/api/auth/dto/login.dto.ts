import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Transform(({ value }) => String(value))
  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsString()
  captchaToken?: string;
}
