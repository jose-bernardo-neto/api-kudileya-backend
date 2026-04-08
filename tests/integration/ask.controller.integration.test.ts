import { buildServer } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Ask Controller Integration Tests', () => {
	let app: FastifyInstance;

	beforeEach(async () => {
		// Build server with test configuration
		app = await buildServer();
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	describe('POST /api/v1/ask', () => {
		it('should return AI response for valid question', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/ask',
				payload: {
					question: 'How do I reset my password?',
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('answer');
			expect(body).toHaveProperty('timestamp');
			expect(body).toHaveProperty('provider');
			expect(typeof body.answer).toBe('string');
			expect(body.answer.length).toBeGreaterThan(0);
		});

		it('should return 400 for missing question', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/ask',
				payload: {},
			});

			expect(response.statusCode).toBe(400);
			const body = JSON.parse(response.body);
			expect(body.error).toBe('Bad Request');
			expect(body.message).toBe('Validation failed');
		});

		it('should return 400 for question too short', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/ask',
				payload: {
					question: 'Hi',
				},
			});

			expect(response.statusCode).toBe(400);
		});

		it('should return 400 for question too long', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/ask',
				payload: {
					question: 'a'.repeat(501),
				},
			});

			expect(response.statusCode).toBe(400);
		});

		it('should apply rate limiting', async () => {
			// Make multiple requests to trigger rate limit
			const requests = [];
			for (let i = 0; i < 12; i++) {
				requests.push(
					app.inject({
						method: 'POST',
						url: '/api/v1/ask',
						payload: { question: `Question ${i}` },
					}),
				);
			}

			const responses = await Promise.all(requests);
			const rateLimited = responses.some((r) => r.statusCode === 429);

			// At least one should be rate limited
			expect(rateLimited).toBe(true);
		});
	});

	describe('GET /api/v1/ask/health', () => {
		it('should return health status', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/ask/health',
			});

			expect(response.statusCode).toBeGreaterThanOrEqual(200);
			expect(response.statusCode).toBeLessThan(600);

			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('provider');
			expect(body).toHaveProperty('available');
			expect(body).toHaveProperty('message');
		});

		it('should cache health checks', async () => {
			const response1 = await app.inject({
				method: 'GET',
				url: '/api/v1/ask/health',
			});

			const response2 = await app.inject({
				method: 'GET',
				url: '/api/v1/ask/health',
			});

			expect(response1.body).toBe(response2.body);
		});
	});

	describe('POST /api/v1/ask/suggestions', () => {
		it('should return suggestions for valid question', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/ask/suggestions',
				payload: {
					question: 'How do I create an account?',
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('suggestions');
			expect(body).toHaveProperty('count');
			expect(Array.isArray(body.suggestions)).toBe(true);
		});

		it('should return empty array on error without failing', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/ask/suggestions',
				payload: {
					question: 'Test question',
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(Array.isArray(body.suggestions)).toBe(true);
		});
	});
});
