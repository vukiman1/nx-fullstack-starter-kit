// Auth
export interface User {
  id: string | number;
  email: string;
  role?: string;
  avatar?: string | null;
  balance?: number | string;
  token?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
}

export interface RefreshTokenResponse {
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface LogoutResponse {
  message: string;
}
