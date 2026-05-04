import { httpRequest } from '@/lib/http-request';
import type {
  LoginPayload,
  LoginResponse,
  LogoutResponse,
  RefreshTokenResponse,
  RegisterPayload,
  RegisterResponse,
} from './interfaces/service.interfaces';

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
};

export default authService;
