import { IsNotEmpty, IsString } from 'class-validator';
import { Match } from './validators/match.validator';
import { IsStrongPassword } from './validators/strong-password.validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsStrongPassword()
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  @Match('newPassword', { message: 'confirmPassword must match newPassword' })
  confirmPassword!: string;
}
