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
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { AuthBaseController } from './auth.base.controller';
import { ApiChangePassword } from '../auth.swagger';
import { UserEntity } from '../../user/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ResendVerificationDto } from '../dto/resend-verification.dto';
import { GoogleOneTapDto } from '../dto/google-one-tap.dto';

const STRICT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('Auth API For User')
@Controller('/auth')
export class AuthUserController extends AuthBaseController<UserEntity>(
  'user',
  StrategyKey.LOCAL.USER,
) {
  constructor(public readonly authService: AuthService) {
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
    return this.authService.verifyEmail(body.token, request);
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
    const jti = request.sessionJti;
    if (!jti) {
      throw new UnauthorizedException();
    }
    return this.authService.changePassword(user, jti, body, request);
  }

  @Get('sessions')
  @HttpCode(200)
  @UseGuards(AuthGuard(StrategyKey.JWT.USER))
  async sessions(@User() user: UserEntity, @Req() request: Request) {
    return this.authService.listSessions(user, request);
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
