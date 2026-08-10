import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { AuthAuditService } from './services/auth-audit.service';
import { UserSessionService } from './services/user-session.service';
import { SessionRevocationService } from './services/session-revocation.service';
import { SessionCookieService } from './services/session-cookie.service';
import { GeoIpService } from './services/geo-ip.service';
import { CaptchaService } from './services/captcha.service';
import { AuthUserController } from './controllers/auth.user.controller';
import { JwtUserStrategy } from './strategies/jwt/user.jwt.strategy';
import { UserModule } from '../user/user.module';
import { UserLocalStrategy } from './strategies/local/user.local.strategy';
import { PassportModule } from '@nestjs/passport';
import { UserSessionEntity } from './entities/user-session.entity';
import { AuthIdentityEntity } from './entities/auth-identity.entity';
import { UserTotpEntity } from './entities/user-totp.entity';
import { UserRecoveryCodeEntity } from './entities/user-recovery-code.entity';
import { TotpService } from './services/totp.service';
import { TwoFactorService } from './services/two-factor.service';
import { TwoFactorChallengeService } from './services/two-factor-challenge.service';
import { TwoFactorAccountService } from './services/two-factor-account.service';
import { EmailCodeService } from './services/email-code.service';
import { GoogleOneTapVerifier } from './services/social/google-one-tap.verifier';
import { SocialAuthService } from './services/social/social-auth.service';

@Module({
  imports: [
    UserModule,
    PassportModule,
    TypeOrmModule.forFeature([
      UserSessionEntity,
      AuthIdentityEntity,
      UserTotpEntity,
      UserRecoveryCodeEntity,
    ]),
  ],
  controllers: [AuthUserController],
  providers: [
    AuthService,
    SessionService,
    AuthAuditService,
    UserSessionService,
    SessionRevocationService,
    SessionCookieService,
    GeoIpService,
    CaptchaService,
    JwtUserStrategy,
    UserLocalStrategy,
    GoogleOneTapVerifier,
    SocialAuthService,
    TotpService,
    TwoFactorService,
    TwoFactorChallengeService,
    TwoFactorAccountService,
    EmailCodeService,
  ],
})
export class AuthModule {}
