import { queryOptions } from '@tanstack/react-query';
import { httpRequest } from '@/lib/http-request';
import type { UserCredit } from '@org/shared-contracts';

export const userService = {
  getCredit() {
    return httpRequest.get<UserCredit>('/user/credit');
  },
};

export const userQueries = {
  credit: () =>
    queryOptions({
      queryKey: ['user', 'credit'],
      queryFn: () => userService.getCredit(),
    }),
};

export default userService;
