import { AuthProvider } from '@org/backend-enum';

export interface NormalizedIdentity {
  provider: AuthProvider;
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  avatar?: string;
}
