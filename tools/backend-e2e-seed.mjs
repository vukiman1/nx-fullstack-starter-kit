#!/usr/bin/env node
import Redis from 'ioredis';
import pg from 'pg';

const db = new pg.Client({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nestdb',
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
});

try {
  await db.connect();
  await db.query('select 1');
  await redis.connect();
  await redis.ping();

  // Explicit seed hook for backend e2e. Current smoke tests do not require rows.
  console.log(
    'backend e2e seed: infrastructure verified; no seed rows required',
  );
} finally {
  await db.end().catch(() => undefined);
  redis.disconnect();
}
