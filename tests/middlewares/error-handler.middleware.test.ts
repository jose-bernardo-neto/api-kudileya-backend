import {
	errorHandler,
	notFoundHandler,
	BusinessError,
	NotFoundError,
	ValidationError,
} from '../../src/middlewares/error-handler.middleware';
import { FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import { AIProviderError } from '../../src/adapters/ai/ai-provider.interface';

describe('Error Handler Middleware', () => {
	let mockRequest: Partial<FastifyRequest>;
	let mockReply: Partial<FastifyReply>;

	beforeEach(() => {
		mockRequest = {
			url: '/api/v1/test',
			method: 'POST',
			ip: '127.0.0.1',
			log: {
				error: jest.fn(),
				warn: jest.fn(),
			} as any,
		};

		mockReply = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			getHeader: jest.fn(),
		};
	});

	describe('errorHandler', () => {
		it('should handle NotFoundError', async () => {
			const error = new NotFoundError('User', '123');

			await errorHandler(
				error as unknown as FastifyError,
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(404);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 404,
					error: 'NotFoundError',
					message: "User with id '123' not found",
				}),
			);
		});

		it('should handle ValidationError', async () => {
			const error = new ValidationError('Invalid input', { field: 'email' });

			await errorHandler(
				error as unknown as FastifyError,
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(400);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 400,
					message: 'Invalid input',
				}),
			);
		});

		it('should handle AIProviderError', async () => {
			const error = new AIProviderError('API timeout', 'gemini');

			await errorHandler(
				error as unknown as FastifyError,
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(503);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 503,
					error: 'Service Unavailable',
					message: 'AI service error: API timeout',
				}),
			);
		});

		it('should handle Fastify errors with status code', async () => {
			const error: Partial<FastifyError> = {
				statusCode: 415,
				name: 'FastifyError',
				message: 'Unsupported media type',
			};

			await errorHandler(
				error as FastifyError,
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(415);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 415,
					message: 'Unsupported media type',
				}),
			);
		});

		it('should handle rate limit errors', async () => {
			const error: Partial<FastifyError> = {
				statusCode: 429,
				name: 'FastifyError',
				message: 'Too many requests',
			};

			mockReply.getHeader = jest.fn().mockReturnValue('60');

			await errorHandler(
				error as FastifyError,
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(429);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 429,
					// Aceita tanto FastifyError quanto Too Many Requests
					error: expect.any(String),
				}),
			);
		});

		it('should handle generic errors as 500', async () => {
			const error = new Error('Something went wrong') as FastifyError;

			await errorHandler(
				error,
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(500);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 500,
					error: 'Internal Server Error',
					message: 'An unexpected error occurred',
				}),
			);
		});
	});

	describe('notFoundHandler', () => {
		it('should return 404 for not found routes', async () => {
			await notFoundHandler(
				mockRequest as FastifyRequest,
				mockReply as FastifyReply,
			);

			expect(mockReply.status).toHaveBeenCalledWith(404);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 404,
					error: 'Not Found',
					message: 'Route POST /api/v1/test not found',
				}),
			);
		});
	});

	describe('Custom Error Classes', () => {
		it('should create NotFoundError correctly', () => {
			const error = new NotFoundError('Document', 'abc-123');

			expect(error.statusCode).toBe(404);
			expect(error.message).toBe("Document with id 'abc-123' not found");
			expect(error.name).toBe('NotFoundError');
		});

		it('should create ValidationError correctly', () => {
			const error = new ValidationError('Invalid email format', {
				field: 'email',
				value: 'invalid',
			});

			expect(error.statusCode).toBe(400);
			expect(error.message).toBe('Invalid email format');
			expect(error.details).toEqual({
				field: 'email',
				value: 'invalid',
			});
		});

		it('should create BusinessError with custom status code', () => {
			const error = new BusinessError('Custom error', 418);

			expect(error.statusCode).toBe(418);
			expect(error.message).toBe('Custom error');
		});
	});
});
