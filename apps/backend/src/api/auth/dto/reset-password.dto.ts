import { IsNotEmpty, IsString } from 'class-validator';
import { Match } from './validators/match.validator';
import { IsStrongPassword } from './validators/strong-password.validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword!: string;
}
