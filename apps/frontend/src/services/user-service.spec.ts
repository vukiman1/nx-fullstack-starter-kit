import { userQueries } from './user-service';
import { httpRequest } from '@/lib/http-request';

jest.mock('@/lib/http-request', () => ({
  httpRequest: { get: jest.fn() },
}));

describe('userQueries.credit', () => {
  beforeEach(() => {
    jest.mocked(httpRequest.get).mockReset();
  });

  it('exposes a stable query key', () => {
    expect(userQueries.credit().queryKey).toEqual(['user', 'credit']);
  });

  it('fetches the credit balance from the user endpoint', async () => {
    const credit = { balance: 250 };
    jest.mocked(httpRequest.get).mockResolvedValue(credit);

    const queryFn = userQueries.credit().queryFn as () => Promise<unknown>;
    const result = await queryFn();

    expect(httpRequest.get).toHaveBeenCalledWith('/user/credit');
    expect(result).toEqual(credit);
  });
});
