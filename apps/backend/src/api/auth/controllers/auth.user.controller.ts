import { StrategyKey } from '@org/backend-constants';
import { User } from '@org/backend-decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { TwoFactorAccountService } from '../services/two-factor-account.service';
import { AuthBaseController } from './auth.base.controller';
import { requireSessionJti } from '../session-request';
import { ApiChangePassword } from '../auth.swagger';
import { UserEntity } from '../../user/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { GoogleOneTapDto } from '../dto/google-one-tap.dto';
import {
  ConfirmTwoFactorDto,
  ConfirmTwoFactorRecoveryDto,
  DisableTwoFactorDto,
  RequestTwoFactorRecoveryDto,
  VerifyTwoFactorDto,
} from '../dto/two-factor.dto';

const STRICT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Auth API For User')
@Controller('/auth')
export class AuthUserController extends AuthBaseController<UserEntity>(
  'user',
  StrategyKey.LOCAL.USER,
) {
  constructor(
    public readonly authService: AuthService,
    private readonly twoFactorAccountService: TwoFactorAccountService,
  ) {
    super(authService);
  }

  @Post('register')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async register(@Body() body: RegisterDto, @Req() request: Request) {
    return this.authService.register(body, request);
  }

  @Post('google/one-tap')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async googleOneTap(
    @Body() body: GoogleOneTapDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.loginWithGoogle(body.credential, response, request);
  }

  @Post('verify-email')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async verifyEmail(@Body() body: VerifyEmailDto, @Req() request: Request) {
    return this.authService.verifyEmail(body, request);
  }

  @Post('resend-verification')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.authService.resendVerification(body.email);
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async forgotPassword(@Body() body: ForgotPasswordDto, @Req() request: Request) {
    return this.authService.forgotPassword(body.email, request);
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async resetPassword(@Body() body: ResetPasswordDto, @Req() request: Request) {
    return this.authService.resetPassword(body, request);
  }

  @Post('change-password')
  @HttpCode(200)
  @ApiChangePassword('user')
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async changePassword(
    @User() user: UserEntity,
    @Body() body: ChangePasswordDto,
    @Req() request: Request,
  ) {
    return this.authService.changePassword(user, requireSessionJti(request), body, request);
  }

  @Post('2fa/verify')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async verifyTwoFactor(
    @Body() body: VerifyTwoFactorDto,
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
  ) {
    return this.authService.verifyTwoFactor(body.challengeToken, body.code, response, request);
  }

  @Post('2fa/recover')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async requestTwoFactorRecovery(
    @Body() body: RequestTwoFactorRecoveryDto,
    @Req() request: Request,
  ) {
    return this.twoFactorAccountService.requestRecovery(body.challengeToken, request);
  }

  @Post('2fa/recover/confirm')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  async confirmTwoFactorRecovery(
    @Body() body: ConfirmTwoFactorRecoveryDto,
    @Req() request: Request,
  ) {
    return this.twoFactorAccountService.confirmRecovery(body.challengeToken, body.code, request);
  }

  @Get('2fa')
  @HttpCode(200)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async twoFactorStatus(@User() user: UserEntity) {
    return this.twoFactorAccountService.getStatus(user);
  }

  @Post('2fa/setup')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async startTwoFactorSetup(@User() user: UserEntity) {
    return this.twoFactorAccountService.startSetup(user);
  }

  @Post('2fa/confirm')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async confirmTwoFactorSetup(
    @User() user: UserEntity,
    @Body() body: ConfirmTwoFactorDto,
    @Req() request: Request,
  ) {
    return this.twoFactorAccountService.confirmSetup(user, body.code, request);
  }

  @Delete('2fa')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async disableTwoFactor(
    @User() user: UserEntity,
    @Body() body: DisableTwoFactorDto,
    @Req() request: Request,
  ) {
    return this.twoFactorAccountService.disable(user, body.password, request);
  }

  @Post('2fa/recovery-codes')
  @HttpCode(200)
  @Throttle(STRICT_THROTTLE)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async regenerateRecoveryCodes(@User() user: UserEntity) {
    return this.twoFactorAccountService.regenerateRecoveryCodes(user);
  }

  @Get('sessions')
  @HttpCode(200)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async sessions(@User() user: UserEntity, @Req() request: Request) {
    return this.authService.listSessions(user, request);
  }

  @Delete('sessions')
  @HttpCode(200)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async revokeOtherSessions(@User() user: UserEntity, @Req() request: Request) {
    return this.authService.revokeOtherDeviceSessions(user, request);
  }

  @Delete('sessions/:id')
  @HttpCode(200)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async revokeSession(
    @User() user: UserEntity,
    @Param('id') sessionId: string,
    @Req() request: Request,
  ) {
    return this.authService.revokeDeviceSession(user, sessionId, request);
  }
}
