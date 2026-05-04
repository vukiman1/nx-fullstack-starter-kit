import { httpRequest } from '@/lib/http-request';
import type { UserCredit } from './interfaces/service.interfaces';

export const userService = {
  getCredit() {
    return httpRequest.get<UserCredit>('/user/credit');
  },
};

export default userService;
