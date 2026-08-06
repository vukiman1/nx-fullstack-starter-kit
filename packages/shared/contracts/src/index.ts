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

export type ApiErrorPayload = Record<string, string> | { message: string; [key: string]: unknown };

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
  displayName?: string | null;
  avatar?: string | null;
  balance?: number | string;
  isEmailVerified?: boolean;
  hasPassword?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface GoogleOneTapPayload {
  credential: string;
}

export interface LoginSucceeded {
  user: User;
}

/**
 * Sign-in stops here when a second factor is due. No session exists yet — the challenge token only
 * buys the right to try a code.
 */
export interface TwoFactorRequired {
  twoFactorRequired: true;
  challengeToken: string;
}

/** A union so callers cannot read `user` without first ruling out the challenge case. */
export type LoginResponse = LoginSucceeded | TwoFactorRequired;

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}

export interface MessageResponse {
  message: string;
}

export interface TwoFactorStatusResponse {
  enabled: boolean;
  unusedRecoveryCodes: number;
}

export interface TwoFactorSetupResponse {
  otpauthUri: string;
}

export interface TwoFactorEnabledResponse {
  recoveryCodes: string[];
}

export interface RefreshTokenResponse {
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface RegisterPayload {
  displayName: string;
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

export interface UserLoginSession {
  id: string;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
  rememberMe: boolean;
  authProvider: string;
  lastSeenAt: string | null;
  expiresAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface UserLoginSessionsResponse {
  sessions: UserLoginSession[];
}

export interface RevokeUserLoginSessionResponse {
  message: string;
}

export interface RevokeOtherSessionsResponse {
  message: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

// User
export interface UserCredit {
  balance: number | string;
  token?: number | string;
}
