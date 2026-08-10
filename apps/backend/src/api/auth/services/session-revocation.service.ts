import { Injectable } from '@nestjs/common';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { SessionService } from './session.service';
import { UserSessionService } from './user-session.service';

// Redis holds the tokens, Postgres the device row: revoking one alone leaves a session that still
// works but is invisible, or a row its owner cannot remove. Reason is required — the repositories
// default it, so a caller that forgets records a plausible but wrong one.
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
