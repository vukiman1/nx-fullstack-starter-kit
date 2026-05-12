import { httpRequest } from '@/lib/http-request';
import type { UserCredit } from '@org/shared-contracts';

export const userService = {
  getCredit() {
    return httpRequest.get<UserCredit>('/user/credit');
  },
};

export default userService;
