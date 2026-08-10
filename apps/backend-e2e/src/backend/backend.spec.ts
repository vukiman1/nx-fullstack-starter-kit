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

describe('Security headers (helmet)', () => {
  it('should set HSTS, frame and content-type protections', async () => {
    const res = await axios.get('/api');

    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('should leave CSP disabled so Swagger UI keeps working', async () => {
    const res = await axios.get('/api');
    expect(res.headers['content-security-policy']).toBeUndefined();

    const docs = await axios.get('/docs', { validateStatus: () => true });
    expect(docs.status).toBe(200);
  });
});

describe('Generic user CRUD', () => {
  it.each([
    ['get', '/api/user/all'],
    ['post', '/api/user/create'],
    ['patch', '/api/user/update/00000000-0000-0000-0000-000000000000'],
    ['delete', '/api/user/delete/00000000-0000-0000-0000-000000000000'],
  ])('should not route %s %s', async (method, path) => {
    const res = await axios.request({
      method,
      url: path,
      data: {},
      validateStatus: () => true,
    });

    expect(res.status).toBe(404);
  });
});

describe('Request validation', () => {
  it('should reject a body carrying a property the DTO does not declare', async () => {
    const res = await axios.post(
      '/api/auth/register',
      {
        email: 'whitelist-probe@example.com',
        displayName: 'Probe',
        password: 'Local1234',
        confirmPassword: 'Local1234',
        role: 'ADMIN',
      },
      { validateStatus: () => true },
    );

    expect(res.status).toBe(400);
    expect(res.data.errors.role).toBe('property role should not exist');
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
