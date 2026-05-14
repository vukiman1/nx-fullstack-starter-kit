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
