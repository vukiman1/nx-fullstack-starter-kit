export enum SessionRevokeReason {
  LOGOUT = 'logout',
  LOGOUT_ALL = 'logout_all',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  REVOKED_BY_USER = 'revoked_by_user',
  SESSION_LIMIT = 'session_limit',
  SECURITY = 'security',
}
