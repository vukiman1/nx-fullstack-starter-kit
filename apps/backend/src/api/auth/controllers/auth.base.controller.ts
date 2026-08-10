import { StrategyKey } from '@org/backend-constants';
import { User } from '@org/backend-decorators';
import { Body, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ApiLogin, ApiLogoutAll, ApiRefreshToken } from '../auth.swagger';
import { UserType } from '../interfaces/auth.interface';
import { AuthService } from '../services/auth.service';
import { UserEntity } from '../../user/entities/user.entity';
import { LoginDto } from '../dto/login.dto';
import { CaptchaGuard } from '../guards/captcha.guard';

export const AuthBaseController = <Entity extends UserEntity>(
  userType: UserType,
  strategyKey: string,
) => {
  const jwtStrategyKey = StrategyKey.JWT[userType.toUpperCase() as keyof typeof StrategyKey.JWT];

  class BaseController {
    constructor(public readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(200)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @ApiLogin(userType)
    @UseGuards(CaptchaGuard, AuthGuard(strategyKey))
    async login(
      @Body() loginDto: LoginDto,
      @User() userData: Entity,
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
    ) {
      return this.authService.login(userData, response, request, loginDto.rememberMe ?? false);
    }

    @Post('refresh-token')
    @HttpCode(200)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @ApiRefreshToken(userType)
    async refreshToken(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
      return this.authService.refreshToken(request, response);
    }

    @Get('me')
    @HttpCode(200)
    @UseGuards(AuthGuard(jwtStrategyKey))
    async me(@User() user: Entity) {
      return this.authService.me(user);
    }

    @Post('logout')
    @HttpCode(200)
    @UseGuards(AuthGuard(jwtStrategyKey))
    async logout(
      @User() user: Entity,
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
    ) {
      return this.authService.logout(user, request, response);
    }

    @Post('logout-all')
    @HttpCode(200)
    @ApiLogoutAll(userType)
    @UseGuards(AuthGuard(jwtStrategyKey))
    async logoutAll(
      @User() user: Entity,
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
    ) {
      return this.authService.logoutAll(user, response, request);
    }
  }

  return BaseController;
};
