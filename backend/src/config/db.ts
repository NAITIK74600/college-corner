import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Support DATABASE_URL (Neon / Railway) or individual params (local dev)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required by Neon / Railway
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'college_corner',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

// Test connection on startup
pool.connect((err: Error | undefined, _client, release: () => void) => {
  if (err) {
    console.error('[DB] Connection error:', err.message);
    return;
  }
  console.log('[DB] PostgreSQL connected successfully');
  release();
});

export default pool;
