import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthAuditService } from './services/auth-audit.service';
import { CaptchaService } from './services/captcha.service';
import { AuthUserController } from './controllers/auth.user.controller';
import { JwtUserStrategy } from './strategies/jwt/user.jwt.strategy';
import { UserModule } from '../user/user.module';
import { UserLocalStrategy } from './strategies/local/user.local.strategy';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [UserModule, PassportModule],
  controllers: [AuthUserController],
  providers: [
    AuthService,
    SessionService,
    AuthTokenService,
    AuthAuditService,
    CaptchaService,
    JwtUserStrategy,
    UserLocalStrategy,
  ],
})
export class AuthModule {}
