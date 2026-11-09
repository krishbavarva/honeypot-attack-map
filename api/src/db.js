// db.js - shared PostgreSQL connection settings (same .env as the collector).
import pg from 'pg';

export const dbConfig = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? 'honeypot',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB ?? 'honeypot',
};

export const pool = new pg.Pool(dbConfig);
