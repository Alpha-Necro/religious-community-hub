import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables
config();

// Define test environment schema
const testEnvSchema = z.object({
  DB_TEST_NAME: z.string(),
  DB_TEST_USER: z.string(),
  DB_TEST_PASSWORD: z.string(),
  DB_TEST_HOST: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string(),
  SESSION_SECRET: z.string(),
  REDIS_HOST: z.string(),
  REDIS_PORT: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_DB: z.string(),
});

// Parse and validate environment variables
const testEnv = testEnvSchema.parse({
  DB_TEST_NAME: process.env.DB_TEST_NAME,
  DB_TEST_USER: process.env.DB_TEST_USER,
  DB_TEST_PASSWORD: process.env.DB_TEST_PASSWORD,
  DB_TEST_HOST: process.env.DB_TEST_HOST,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  SESSION_SECRET: process.env.SESSION_SECRET,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  REDIS_DB: process.env.REDIS_DB,
});

export default testEnv;
