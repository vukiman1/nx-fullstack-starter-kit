import { Controller, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { BaseController } from '@app/base';
import { UserEntity } from './entities/user.entity';
import { User } from '@app/decorators';
import { AuthGuard } from '@nestjs/passport';
import { StrategyKey } from '@app/constants';
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
