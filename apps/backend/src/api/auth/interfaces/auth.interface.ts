export type UserType = 'admin' | 'user';

export interface AuthUser {
  id: string;
  role: string;
  email: string;
  avatar: string;
}
