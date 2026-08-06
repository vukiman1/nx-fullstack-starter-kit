import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Match } from './validators/match.validator';
import { IsStrongPassword } from './validators/strong-password.validator';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be six digits' })
  code!: string;

  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword!: string;
}
