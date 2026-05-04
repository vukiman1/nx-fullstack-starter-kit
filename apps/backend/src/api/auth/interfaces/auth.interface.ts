export type UserType = 'admin' | 'user';

export interface AuthUser {
  email: string;
  avatar: string;
  balance: number | string;
}
