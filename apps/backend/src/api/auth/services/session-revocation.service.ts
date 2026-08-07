import { Injectable } from '@nestjs/common';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { SessionService } from './session.service';
import { UserSessionService } from './user-session.service';

/**
 * A session lives in two stores: Redis holds the tokens that authenticate it, Postgres holds the
 * device record the owner sees. Revoking one without the other leaves either a session that still
 * works but is invisible, or a dead row the owner cannot get rid of — so both are revoked here and
 * nowhere else.
 *
 * The reason is required. The underlying repositories default it, which lets a caller that forgets
 * record a plausible but wrong one.
 */
@Injectable()
export class SessionRevocationService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly userSessionService: UserSessionService,
  ) {}

  async revokeOne(userId: string, jti: string, reason: SessionRevokeReason): Promise<void> {
    await this.sessionService.revokeSession(userId, jti);
    await this.userSessionService.revokeSession(userId, jti, reason);
  }

  async revokeAll(userId: string, reason: SessionRevokeReason): Promise<void> {
    await this.sessionService.revokeAllSessions(userId);
    await this.userSessionService.revokeAllSessions(userId, reason);
  }

  async revokeOthers(userId: string, keepJti: string, reason: SessionRevokeReason): Promise<void> {
    await this.sessionService.revokeOtherSessions(userId, keepJti);
    await this.userSessionService.revokeOtherSessions(userId, keepJti, reason);
  }
}
