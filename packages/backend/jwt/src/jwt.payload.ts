export interface JwtPayload {
  id: string;
  jti: string;
  iat?: number;
  exp?: number;
}
