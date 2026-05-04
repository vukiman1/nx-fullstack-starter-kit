import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthUserController } from './controllers/auth.user.controller';
import { JwtUserStrategy } from './strategies/jwt/user.jwt.strategy';
import { UserModule } from '../user/user.module';
import { UserLocalStrategy } from './strategies/local/user.local.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [UserModule, PassportModule],
  controllers: [AuthUserController],
  providers: [AuthService, JwtUserStrategy, UserLocalStrategy],
})
export class AuthModule {}
