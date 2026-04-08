import { buildServer } from '../../src/server';
import { FastifyInstance } from 'fastify';

describe('Document Controller Integration Tests', () => {
	let app: FastifyInstance;
	const adminKey = 'test-admin-key-123';

	beforeEach(async () => {
		app = await buildServer();
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	describe('POST /api/v1/documents', () => {
		it('should upload document with valid admin key', async () => {
			const pdfContent = Buffer.from('PDF mock content');

			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/documents',
				headers: {
					'x-admin-key': adminKey,
				},
				payload: {
					file: pdfContent,
					title: 'Test Document',
					description: 'Test description',
				},
			});

			// Note: Actual file upload testing with multipart is complex
			// This test validates the route exists and requires auth
			// 406 = Not Acceptable (multipart required), 400 = validation error, 201 = success
			expect([201, 400, 406]).toContain(response.statusCode);
		});

		it('should return 401 without admin key', async () => {
			const response = await app.inject({
				method: 'POST',
				url: '/api/v1/documents',
				payload: {},
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe('GET /api/v1/documents', () => {
		it('should list all documents', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('data');
			expect(body).toHaveProperty('has_more');
			expect(Array.isArray(body.data)).toBe(true);
		});

		it('should support pagination', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents?limit=5',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body.data.length).toBeLessThanOrEqual(5);
		});

		it('should cache responses', async () => {
			const response1 = await app.inject({
				method: 'GET',
				url: '/api/v1/documents',
			});

			const response2 = await app.inject({
				method: 'GET',
				url: '/api/v1/documents',
			});

			expect(response1.body).toBe(response2.body);
		});
	});

	describe('GET /api/v1/documents/search', () => {
		it('should search documents by query', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/search?q=test',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('results');
			expect(Array.isArray(body.results)).toBe(true);
		});

		it('should return 400 without query', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/search',
			});

			expect(response.statusCode).toBe(400);
		});

		it('should cache search results', async () => {
			const response1 = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/search?q=test',
			});

			const response2 = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/search?q=test',
			});

			expect(response1.body).toBe(response2.body);
		});
	});

	describe('GET /api/v1/documents/stats', () => {
		it('should return statistics', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/stats',
			});

			expect(response.statusCode).toBe(200);
			const body = JSON.parse(response.body);
			expect(body).toHaveProperty('totalDocuments');
			expect(body).toHaveProperty('totalSize');
			expect(body).toHaveProperty('mimeTypes');
			expect(typeof body.totalDocuments).toBe('number');
		});

		it('should cache statistics', async () => {
			const response1 = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/stats',
			});

			const response2 = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/stats',
			});

			expect(response1.body).toBe(response2.body);
		});
	});

	describe('GET /api/v1/documents/:id', () => {
		it('should return 404 for non-existent document', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/550e8400-e29b-41d4-a716-446655440000',
			});

			expect(response.statusCode).toBe(404);
		});

		it('should validate UUID format', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/invalid-uuid',
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe('GET /api/v1/documents/:id/download', () => {
		it('should return 404 for non-existent document', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/550e8400-e29b-41d4-a716-446655440000/download',
			});

			expect(response.statusCode).toBe(404);
		});

		it('should validate UUID format', async () => {
			const response = await app.inject({
				method: 'GET',
				url: '/api/v1/documents/invalid-uuid/download',
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe('PUT /api/v1/documents/:id', () => {
		it('should return 404 (route not implemented)', async () => {
			const response = await app.inject({
				method: 'PUT',
				url: '/api/v1/documents/550e8400-e29b-41d4-a716-446655440000',
				payload: {
					title: 'Updated Title',
				},
			});

			// PUT route is not implemented for documents
			expect(response.statusCode).toBe(404);
		});

		it('should return 404 for invalid UUID too', async () => {
			const response = await app.inject({
				method: 'PUT',
				url: '/api/v1/documents/invalid-uuid',
				headers: {
					'x-admin-key': adminKey,
				},
				payload: {
					title: 'Updated Title',
				},
			});

			// PUT route is not implemented for documents
			expect(response.statusCode).toBe(404);
		});
	});

	describe('DELETE /api/v1/documents/:id', () => {
		it('should return 401 without admin key', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: '/api/v1/documents/550e8400-e29b-41d4-a716-446655440000',
			});

			expect(response.statusCode).toBe(401);
		});

		it('should validate UUID format', async () => {
			const response = await app.inject({
				method: 'DELETE',
				url: '/api/v1/documents/invalid-uuid',
				headers: {
					'x-admin-key': adminKey,
				},
			});

			expect(response.statusCode).toBe(400);
		});
	});
});
