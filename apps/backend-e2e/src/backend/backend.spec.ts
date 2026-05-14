import axios from 'axios';

describe('GET /api', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      statusCode: 200,
      success: true,
      data: { message: 'Hello API' },
    });
  });
});

describe('GET /health', () => {
  it('should return liveness without the api prefix', async () => {
    const res = await axios.get('/health/liveness');

    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe('ok');
    expect(res.data.data.details.process.status).toBe('up');
  });

  it('should return readiness for database and redis', async () => {
    const res = await axios.get('/health/readiness');

    expect(res.status).toBe(200);
    expect(res.data.data.status).toBe('ok');
    expect(res.data.data.details.database.status).toBe('up');
    expect(res.data.data.details.redis.status).toBe('up');
  });
});

describe('POST /api/auth/login', () => {
  it('should rate limit login attempts after 5 requests per minute', async () => {
    const login = () =>
      axios.post(
        '/api/auth/login',
        {
          email: 'missing@example.com',
          password: 'invalid-password',
        },
        {
          validateStatus: () => true,
        },
      );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const res = await login();
      expect(res.status).not.toBe(429);
    }

    const throttled = await login();
    expect(throttled.status).toBe(429);
  });
});
