import { httpRequest } from '@/lib/http-request';
import type {
  ChangePasswordPayload,
  ChangePasswordResponse,
  ForgotPasswordResponse,
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshTokenResponse,
  RevokeOtherSessionsResponse,
  RevokeUserLoginSessionResponse,
  RegisterPayload,
  RegisterResponse,
  UserLoginSessionsResponse,
} from '@org/shared-contracts';

export const authService = {
  login(payload: LoginPayload) {
    return httpRequest.post<LoginResponse>('/auth/login', payload);
  },
  googleOneTap(credential: string) {
    return httpRequest.post<LoginResponse>('/auth/google/one-tap', { credential });
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
  forgotPassword(email: string) {
    return httpRequest.post<ForgotPasswordResponse>('/auth/forgot-password', { email });
  },
};

export default authService;
