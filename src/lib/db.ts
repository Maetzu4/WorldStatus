import { Pool, type QueryResultRow } from 'pg';
import { logger } from './logger';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err: Error) => {
  logger.error({ err }, 'Unexpected error on idle pg client');
  process.exit(-1);
});

export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug({ query: text, params, duration, rows: res.rowCount }, 'Executed query');
    return res;
  } catch (err) {
    const duration = Date.now() - start;
    logger.error({ query: text, params, duration, error: err }, 'Error executing query');
    throw err;
  }
};

export const getClient = () => {
  return pool.connect();
};
