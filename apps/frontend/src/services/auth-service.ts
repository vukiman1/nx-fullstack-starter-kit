import { httpRequest } from '@/lib/http-request';
import type {
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  MeResponse,
  RefreshTokenResponse,
  RegisterPayload,
  RegisterResponse,
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
    return httpRequest.get<RefreshTokenResponse>('/auth/refresh-token');
  },
  getMe() {
    return httpRequest.get<MeResponse>('/auth/me');
  },
};

export default authService;
