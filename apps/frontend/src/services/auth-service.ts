import { httpRequest } from '@/lib/http-request';
import type {
  ChangePasswordPayload,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  LoginSucceeded,
  MessageResponse,
  ResetPasswordPayload,
  LogoutResponse,
  MeResponse,
  RefreshTokenResponse,
  RevokeOtherSessionsResponse,
  RevokeUserLoginSessionResponse,
  RegisterPayload,
  RegisterResponse,
  TwoFactorEnabledResponse,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  UserLoginSessionsResponse,
} from '@org/shared-contracts';

export const authService = {
  login(payload: LoginPayload) {
    return httpRequest.post<LoginResponse>('/auth/login', payload);
  },
  googleOneTap(credential: string) {
    return httpRequest.post<LoginSucceeded>('/auth/google/one-tap', { credential });
  },
  register(payload: RegisterPayload) {
    return httpRequest.post<RegisterResponse>('/auth/register', payload);
  },
  logout() {
    return httpRequest.post<LogoutResponse>('/auth/logout');
  },
  refreshToken() {
    return httpRequest.post<RefreshTokenResponse>('/auth/refresh-token');
  },
  getMe() {
    return httpRequest.get<MeResponse>('/auth/me');
  },
  getSessions() {
    return httpRequest.get<UserLoginSessionsResponse>('/auth/sessions');
  },
  revokeSession(sessionId: string) {
    return httpRequest.delete<RevokeUserLoginSessionResponse>(`/auth/sessions/${sessionId}`);
  },
  revokeOtherSessions() {
    return httpRequest.delete<RevokeOtherSessionsResponse>('/auth/sessions');
  },
  changePassword(payload: ChangePasswordPayload) {
    return httpRequest.post<ChangePasswordResponse>('/auth/change-password', payload);
  },
  getTwoFactorStatus() {
    return httpRequest.get<TwoFactorStatusResponse>('/auth/2fa');
  },

  startTwoFactorSetup() {
    return httpRequest.post<TwoFactorSetupResponse>('/auth/2fa/setup');
  },

  confirmTwoFactorSetup(code: string) {
    return httpRequest.post<TwoFactorEnabledResponse>('/auth/2fa/confirm', { code });
  },

  disableTwoFactor(password: string) {
    return httpRequest.delete<{ message: string }>('/auth/2fa', { data: { password } });
  },

  regenerateRecoveryCodes() {
    return httpRequest.post<TwoFactorEnabledResponse>('/auth/2fa/recovery-codes');
  },

  verifyEmail(email: string, code: string) {
    return httpRequest.post<MessageResponse>('/auth/verify-email', { email, code });
  },

  resendVerification(email: string) {
    return httpRequest.post<MessageResponse>('/auth/resend-verification', { email });
  },

  resetPassword(payload: ResetPasswordPayload) {
    return httpRequest.post<MessageResponse>('/auth/reset-password', payload);
  },

  requestTwoFactorRecovery(challengeToken: string) {
    return httpRequest.post<{ message: string }>('/auth/2fa/recover', { challengeToken });
  },

  confirmTwoFactorRecovery(challengeToken: string, code: string) {
    return httpRequest.post<{ message: string }>('/auth/2fa/recover/confirm', {
      challengeToken,
      code,
    });
  },

  verifyTwoFactor(challengeToken: string, code: string) {
    return httpRequest.post<LoginResponse>('/auth/2fa/verify', { challengeToken, code });
  },

  forgotPassword(email: string) {
    return httpRequest.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
  },
};

export default authService;
