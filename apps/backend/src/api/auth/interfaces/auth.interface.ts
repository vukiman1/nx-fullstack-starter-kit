export type UserType = 'admin' | 'user';

export interface LoginResponse {
  user: {
    id: string;
    role: string;
    email: string;
    avatar: string;
  };
  accessToken: string;
}
