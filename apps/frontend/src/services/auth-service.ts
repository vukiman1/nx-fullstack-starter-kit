import { httpRequest } from '@/lib/http-request';
import type {
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshTokenResponse,
  RevokeUserLoginSessionResponse,
  RegisterPayload,
  RegisterResponse,
  UserLoginSessionsResponse,
} from '@org/shared-contracts';

export const authService = {
  login(payload: LoginPayload) {
    return httpRequest.post<LoginResponse>('/auth/login', payload);
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
};

export default authService;
