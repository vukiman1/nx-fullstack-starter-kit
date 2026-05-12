import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { BaseController } from '@org/backend-base';
import { UserEntity } from './entities/user.entity';
import { User } from '@org/backend-decorators';
import { AuthGuard } from '@nestjs/passport';
import { StrategyKey } from '@org/backend-constants';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard(StrategyKey.JWT.USER))
@Controller('user')
export class UserController extends BaseController<UserEntity>(
  UserEntity,
  'User',
) {
  relations: string[] = [];
  constructor(private readonly userService: UserService) {
    super(userService);
  }

  @Get('credit')
  async getUserCredit(@User() user: UserEntity) {
    return this.userService.getUserCredit(user.id);
  }
}
