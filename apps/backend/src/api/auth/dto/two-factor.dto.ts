import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class ConfirmTwoFactorDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be six digits' })
  code!: string;
}

export class DisableTwoFactorDto {
  /** Required even on an authenticated session: removing the factor is as sensitive as passing it. */
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'Issued by /auth/login when two-factor is enabled' })
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @ApiProperty({ description: 'Six-digit code, or one recovery code' })
  @IsString()
  @Length(6, 32)
  code!: string;
}

export class RequestTwoFactorRecoveryDto {
  @ApiProperty({ description: 'Issued by /auth/login when two-factor is enabled' })
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;
}

export class ConfirmTwoFactorRecoveryDto {
  @ApiProperty({ description: 'Issued by /auth/login when two-factor is enabled' })
  @IsString()
  @IsNotEmpty()
  challengeToken!: string;

  @ApiProperty({ description: 'Six-digit code from the recovery email' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'code must be six digits' })
  code!: string;
}
