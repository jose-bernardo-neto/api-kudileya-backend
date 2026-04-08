import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
const envPath = resolve(__dirname, '../.env.test');
config({ path: envPath });

// Ensure required environment variables are set
process.env.NODE_ENV = 'test';
process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'test-admin-key-123';
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini-key';
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
process.env.PORT = process.env.PORT || '3000';
process.env.MAX_FILE_SIZE_MB = process.env.MAX_FILE_SIZE_MB || '30';
process.env.ALLOWED_MIME_TYPES =
	process.env.ALLOWED_MIME_TYPES ||
	'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
process.env.CACHE_TTL_SECONDS = process.env.CACHE_TTL_SECONDS || '300';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '10';
process.env.RATE_LIMIT_TIME_WINDOW =
	process.env.RATE_LIMIT_TIME_WINDOW || '3600000';
process.env.DEFAULT_PAGE_SIZE = process.env.DEFAULT_PAGE_SIZE || '20';
process.env.MAX_PAGE_SIZE = process.env.MAX_PAGE_SIZE || '100';
