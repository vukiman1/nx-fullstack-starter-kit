// API envelope (must match backend ResponseTransformInterceptor + exception filters)
export interface PaginationMetadata {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ApiSuccessEnvelope<T> {
  statusCode: number;
  success: true;
  data: T;
  metadata?: PaginationMetadata;
}

export type ApiErrorPayload =
  | Record<string, string>
  | { message: string; [key: string]: unknown };

export interface ApiErrorEnvelope {
  statusCode: number;
  success: false;
  errors: ApiErrorPayload;
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

export interface PaginatedResult<T> {
  items: T[];
  metadata: PaginationMetadata;
}

// Auth
export interface User {
  email: string;
  avatar?: string | null;
  balance?: number | string;
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

export interface MeResponse {
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

// User
export interface UserCredit {
  balance: number | string;
  token?: number | string;
}
