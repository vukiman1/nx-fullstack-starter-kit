import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Match } from './validators/match.validator';
import { IsStrongPassword } from './validators/strong-password.validator';

export class RegisterDto {
  // IsNotEmpty last: the error filter reports the final failing constraint, and "must be shorter
  // than 255 characters" is a confusing thing to say about a field that was left out.
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  displayName!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsNotEmpty()
  @Match('password', { message: 'confirmPassword must match password' })
  confirmPassword!: string;
}
