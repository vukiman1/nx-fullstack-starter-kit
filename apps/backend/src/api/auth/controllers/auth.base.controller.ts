import { StrategyKey } from '@app/constants';
import { User } from '@app/decorators/user.decorator';
import { Body, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ApiLogin, ApiRefreshToken } from '../auth.swagger';
import { UserType } from '../interfaces/auth.interface';
import { AuthService } from '../services/auth.service';
import { UserEntity } from 'src/api/user/entities/user.entity';
import { LoginDto } from '../dto/login.dto';

export const AuthBaseController = <Entity extends UserEntity>(
  userType: UserType,
  strategyKey: string,
) => {
  class BaseController {
    constructor(public readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(200)
    @ApiLogin(userType)
    @UseGuards(AuthGuard(strategyKey))
    async login(
      @Body() _login: LoginDto, // Load to Swagger
      @User() userData: Entity,
      @Res({ passthrough: true }) response: Response,
    ) {
      return this.authService.login(userData, response);
    }

    @Get('refresh-token')
    @HttpCode(200)
    @ApiRefreshToken(userType)
    async refreshToken(
      @Req() request: Request,
      @Res({ passthrough: true }) response: Response,
    ) {
      return this.authService.refreshToken(request, response, userType);
    }

    @Get('me')
    @HttpCode(200)
    @UseGuards(
      AuthGuard(
        StrategyKey.JWT[userType.toUpperCase() as keyof typeof StrategyKey.JWT],
      ),
    )
    async me(@User() user: Entity) {
      return this.authService.me(user);
    }

    @Post('logout')
    @HttpCode(200)
    @UseGuards(
      AuthGuard(
        StrategyKey.JWT[userType.toUpperCase() as keyof typeof StrategyKey.JWT],
      ),
    )
    async logout(
      @User() user: Entity,
      @Res({ passthrough: true }) response: Response,
    ) {
      return this.authService.logout(user, response);
    }
  }

  return BaseController;
};
