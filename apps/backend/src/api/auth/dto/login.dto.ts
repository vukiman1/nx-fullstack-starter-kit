import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @Transform(({ value }) => String(value))
  @IsString()
  @IsNotEmpty()
  password!: string;

  // @IsString()
  // captchaToken: string;
}
