import { StrategyKey } from '@app/constants';
import { User } from '@app/decorators/user.decorator';
import { Body, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { ApiLogin } from '../auth.swagger';
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
      console.log(userData);
      return this.authService.login(userData, response);
    }

    // @Get('refresh-token')
    // @ApiRefreshToken(userType)
    // async refreshToken(@Req() request: Request) {
    //   return this.authService.refreshToken(request, userType);
    // }

    // @Post('change-password')
    // @HttpCode(200)
    // @ApiChangePassword(userType)
    // @AuthAdmin()
    // async changePassword(
    //   @Body() body: ChangePasswordDto,
    //   @User() user: Entity,
    // ) {
    //   return this.authService.changePassword(body, user, userType);
    // }

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
      response.clearCookie('sub');
      return this.authService.logout(user);
    }
  }

  return BaseController;
};
