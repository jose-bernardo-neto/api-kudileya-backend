import { buildServer } from '../../src/server';
import { FastifyInstance } from 'fastify';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('FAQ Controller Integration Tests', () => {
	let app: FastifyInstance;
	const testDataPath = path.join(process.cwd(), 'data', 'faqs.json');
	const adminKey = 'test-admin-key-123';

	beforeEach(async () => {
		// Create test data directory
		await fs.mkdir(path.dirname(testDataPath), { recursive: true });
		// Start with empty FAQs
		await fs.writeFile(testDataPath, JSON.stringify({ faqs: [] }), 'utf-8');

		// Build server
		app = await buildServer();
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
		// Cleanup test data
		try {
			await fs.unlink(testDataPath);
		} catch (error) {
			// Ignore if file doesn't exist
		}
	});

	describe('POST /api/v1/faqs', () => {
		it('should create FAQ with valid admin key', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: {
					'x-admin-key': adminKey,
				},
				payload: {
					question: 'What is the refund policy?',
					answer: 'Refunds are processed within 7 business days',
					topic: 'billing',
					keywords: ['refund', 'policy', 'billing'],
				},
			});

			expect(response.statusCode).toBe(201);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('id');
			expect(body.question).toBe('What is the refund policy?');
			expect(body.topic).toBe('billing');
		});

		it('should return 401 without admin key', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				payload: {
					question: 'Test question?',
					answer: 'Test answer',
				},
			});

			expect(response.statusCode).toBe(401);
		});

		it('should return 400 for invalid data', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: {
					'x-admin-key': adminKey,
				},
				payload: {
					question: 'Q',
					answer: 'A',
				},
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe('GET /api/v1/faqs', () => {
		beforeEach(async () => {
			// Create test FAQs
			const res1 = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'What is Question 1?',
					answer: 'This is the answer to Question 1',
					topic: 'general',
				},
			});

			const res2 = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'What is Question 2?',
					answer: 'This is the answer to Question 2',
					topic: 'support',
				},
			});

			// Ensure FAQs were created
			if (res1.statusCode !== 201 || res2.statusCode !== 201) {
				throw new Error(
					`Failed to create test FAQs: ${res1.statusCode}, ${res2.statusCode}`,
				);
			}
		});

		it('should list all FAQs', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('data');
			expect(body).toHaveProperty('has_more');
			expect(body.data.length).toBeGreaterThan(0);
		});

		it('should support pagination', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs?limit=1',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body.data.length).toBe(1);
			expect(body).toHaveProperty('next_cursor');
		});

		it('should cache responses', async () => {
			const response1 = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs',
			});

			const response2 = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs',
			});

			expect(response1.body).toBe(response2.body);
		});
	});

	describe('GET /api/v1/faqs/search', () => {
		beforeEach(async () => {
			await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'How to reset password?',
					answer: 'Use forgot password',
					topic: 'authentication',
					keywords: ['password', 'reset'],
				},
			});
		});

		it('should search FAQs by query', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs/search?q=password',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('results');
			expect(body.results.length).toBeGreaterThan(0);
		});

		it('should return 400 without query', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs/search',
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe('GET /api/v1/faqs/topics', () => {
		beforeEach(async () => {
			await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'How do I authenticate?',
					answer: 'You need to use your credentials to log in',
					topic: 'Authentication',
				},
			});

			await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'How do I pay my bill?',
					answer: 'You can pay your bill through the billing portal',
					topic: 'Billing',
				},
			});
		});

		it('should list all topics', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs/topics',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(Array.isArray(body.topics)).toBe(true);
			expect(body.topics.length).toBeGreaterThan(0);
		});

		it('should cache topics', async () => {
			const response1 = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs/topics',
			});

			const response2 = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs/topics',
			});

			expect(response1.body).toBe(response2.body);
		});
	});

	describe('GET /api/v1/faqs/:id', () => {
		let faqId: string;

		beforeEach(async () => {
			const createResponse = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'Test question?',
					answer: 'Test answer',
					topic: 'testing',
				},
			});
			const body = JSON.parse(createResponse.body);
			faqId = body.id;
		});

		it('should get FAQ by id', async () => {
			const response = await app.inject({
				method: 'GET',
				url: `/api/v1/faqs/${faqId}`,
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body.id).toBe(faqId);
		});

		it('should return 404 for non-existent FAQ', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/faqs/550e8400-e29b-41d4-a716-446655440000',
			});

			expect(response.statusCode).toBe(404);
		});

		it('should cache individual FAQ', async () => {
			const response1 = await app.inject({
				method: 'GET',
				url: `/api/v1/faqs/${faqId}`,
			});

			const response2 = await app.inject({
				method: 'GET',
				url: `/api/v1/faqs/${faqId}`,
			});

			expect(response1.body).toBe(response2.body);
		});
	});

	describe('PUT /api/v1/faqs/:id', () => {
		let faqId: string;

		beforeEach(async () => {
			const createResponse = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'Original question?',
					answer: 'Original answer',
					topic: 'testing',
				},
			});
			const body = JSON.parse(createResponse.body);
			faqId = body.id;
		});

		it('should update FAQ with valid admin key', async () => {
			const response = await app.inject({
				method: 'PUT',
				url: `/api/v1/faqs/${faqId}`,
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'Updated question?',
					answer: 'Updated answer',
				},
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body.question).toBe('Updated question?');
		});

		it('should return 401 without admin key', async () => {
			const response = await app.inject({
				method: 'PUT',
				url: `/api/v1/faqs/${faqId}`,
				payload: {
					question: 'Updated?',
					answer: 'Updated',
				},
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe('DELETE /api/v1/faqs/:id', () => {
		let faqId: string;

		beforeEach(async () => {
			const createResponse = await app.inject({
				method: 'POST',
				url: '/api/v1/faqs',
				headers: { 'x-admin-key': adminKey },
				payload: {
					question: 'To be deleted?',
					answer: 'Will be deleted',
					topic: 'testing',
				},
			});
			const body = JSON.parse(createResponse.body);
			faqId = body.id;
		});

		it('should delete FAQ with valid admin key', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: `/api/v1/faqs/${faqId}`,
				headers: { 'x-admin-key': adminKey },
			});

			expect(response.statusCode).toBe(204);
		});

		it('should return 401 without admin key', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: `/api/v1/faqs/${faqId}`,
			});

			expect(response.statusCode).toBe(401);
		});
	});
});
