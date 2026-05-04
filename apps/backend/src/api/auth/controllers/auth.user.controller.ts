import { StrategyKey } from '@app/constants';
import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { AuthBaseController } from './auth.base.controller';
import { UserEntity } from 'src/api/user/entities/user.entity';
import { RegisterDto } from '../dto/register.dto';

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
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }
}
