import { authenticateAdmin } from '../../src/middlewares/auth.middleware';
import { FastifyRequest, FastifyReply } from 'fastify';

// Mock config
jest.mock('../../src/config/env', () => ({
	config: {
		security: {
			adminKey: 'test-admin-key-123',
		},
	},
}));

describe('Auth Middleware', () => {
	let mockRequest: Partial<FastifyRequest>;
	let mockReply: Partial<FastifyReply>;

	beforeEach(() => {
		mockRequest = {
			headers: {},
			ip: '127.0.0.1',
			url: '/api/v1/faqs',
			method: 'POST',
			log: {
				warn: jest.fn(),
				info: jest.fn(),
			} as any,
		};

		mockReply = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};
	});

	describe('authenticateAdmin', () => {
		it('should return 401 if x-admin-key header is missing', async () => {
			await authenticateAdmin(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(401);
			expect(mockReply.send).toHaveBeenCalledWith({
				statusCode: 401,
				error: 'Unauthorized',
				message: 'Missing x-admin-key header',
			});
		});

		it('should return 403 if x-admin-key is invalid', async () => {
			mockRequest.headers = { 'x-admin-key': 'wrong-key' };

			await authenticateAdmin(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(403);
			expect(mockReply.send).toHaveBeenCalledWith({
				statusCode: 403,
				error: 'Forbidden',
				message: 'Invalid admin key',
			});
			expect(mockRequest.log?.warn).toHaveBeenCalled();
		});

		it('should pass authentication with correct key', async () => {
			mockRequest.headers = { 'x-admin-key': 'test-admin-key-123' };

			await authenticateAdmin(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).not.toHaveBeenCalled();
			expect(mockReply.send).not.toHaveBeenCalled();
			expect(mockRequest.log?.info).toHaveBeenCalled();
		});

		it('should handle array of keys (multiple headers)', async () => {
			mockRequest.headers = {
				'x-admin-key': ['test-admin-key-123', 'another-key'],
			};

			await authenticateAdmin(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).not.toHaveBeenCalled();
			expect(mockReply.send).not.toHaveBeenCalled();
		});
	});
});
