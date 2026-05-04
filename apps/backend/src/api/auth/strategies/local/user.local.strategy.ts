import { StrategyKey } from '@app/constants';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import * as argon2 from 'argon2';
import { UserService } from 'src/api/user/user.service';
import { UserEntity } from 'src/api/user/entities/user.entity';
import { Strategy } from 'passport-local';

@Injectable()
export class UserLocalStrategy extends PassportStrategy(
  Strategy,
  StrategyKey.LOCAL.USER,
) {
  constructor(private readonly userService: UserService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<UserEntity> {
    const where = { email };
    const user = await this.userService.getOneOrFail(where);
    const comparePassword = await argon2.verify(user.password, password);
    if (!comparePassword) {
      throw new UnauthorizedException('Invalid password');
    }
    return user;
  }
}
