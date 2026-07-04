import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthAuditService } from './services/auth-audit.service';
import { UserSessionService } from './services/user-session.service';
import { GeoIpService } from './services/geo-ip.service';
import { CaptchaService } from './services/captcha.service';
import { AuthUserController } from './controllers/auth.user.controller';
import { JwtUserStrategy } from './strategies/jwt/user.jwt.strategy';
import { UserModule } from '../user/user.module';
import { UserLocalStrategy } from './strategies/local/user.local.strategy';
import { PassportModule } from '@nestjs/passport';
import { UserSessionEntity } from './entities/user-session.entity';
import { AuthIdentityEntity } from './entities/auth-identity.entity';
import { GoogleOneTapVerifier } from './services/social/google-one-tap.verifier';
import { SocialAuthService } from './services/social/social-auth.service';

@Module({
  imports: [
    UserModule,
    PassportModule,
    TypeOrmModule.forFeature([UserSessionEntity, AuthIdentityEntity]),
  ],
  controllers: [AuthUserController],
  providers: [
    AuthService,
    SessionService,
    AuthTokenService,
    AuthAuditService,
    UserSessionService,
    GeoIpService,
    CaptchaService,
    JwtUserStrategy,
    UserLocalStrategy,
    GoogleOneTapVerifier,
    SocialAuthService,
  ],
})
export class AuthModule {}
