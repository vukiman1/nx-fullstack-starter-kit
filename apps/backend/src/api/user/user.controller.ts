import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StrategyKey } from '@org/backend-constants';
import { User } from '@org/backend-decorators';
import { UserEntity } from './entities/user.entity';
import { UserService } from './user.service';

@UseGuards(AuthGuard(StrategyKey.JWT.USER))
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('credit')
  async getUserCredit(@User() user: UserEntity) {
    return this.userService.getUserCredit(user.id);
  }
}
