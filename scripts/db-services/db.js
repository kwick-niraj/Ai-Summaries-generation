import pkg from 'pg';
const { Client } = pkg;
import { config } from 'dotenv';

config()

// PostgreSQL client setup
const dbClient = () => new Client({
  host: process.env.PG_HOST,
  port: process.env.PG_PORT,
  database: process.env.PG_DATABASE,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
});

export default dbClient