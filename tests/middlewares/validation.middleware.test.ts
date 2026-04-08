import { z } from 'zod';
import {
	validateBody,
	validateQuery,
	validateParams,
} from '../../src/middlewares/validation.middleware';
import { FastifyRequest, FastifyReply } from 'fastify';

describe('Validation Middleware', () => {
	let mockRequest: Partial<FastifyRequest>;
	let mockReply: Partial<FastifyReply>;

	beforeEach(() => {
		mockRequest = {
			body: {},
			query: {},
			params: {},
			url: '/test',
			method: 'POST',
			log: {
				warn: jest.fn(),
				error: jest.fn(),
			} as any,
		};

		mockReply = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
		};
	});

	describe('validateBody', () => {
		const schema = z.object({
			name: z.string().min(3),
			email: z.string().email(),
			age: z.number().min(18).optional(),
		});

		it('should pass validation with valid data', async () => {
			mockRequest.body = {
				name: 'John Doe',
				email: 'john@example.com',
				age: 25,
			};

			const validator = validateBody(schema);
			await validator(mockRequest as FastifyRequest, mockReply as FastifyReply);

			expect(mockReply.status).not.toHaveBeenCalled();
			expect(mockReply.send).not.toHaveBeenCalled();
		});

		it('should fail validation with invalid data', async () => {
			mockRequest.body = {
				name: 'Jo', // Too short
				email: 'invalid-email',
				age: 15, // Too young
			};

			const validator = validateBody(schema);
			await validator(mockRequest as FastifyRequest, mockReply as FastifyReply);

			expect(mockReply.status).toHaveBeenCalledWith(400);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					statusCode: 400,
					error: 'Bad Request',
					message: 'Validation failed',
					details: expect.any(Array),
				}),
			);
		});

		it('should transform data according to schema', async () => {
			const transformSchema = z.object({
				name: z.string().trim().toLowerCase(),
			});

			mockRequest.body = { name: '  UPPERCASE  ' };

			const validator = validateBody(transformSchema);
			await validator(mockRequest as FastifyRequest, mockReply as FastifyReply);

			expect(mockRequest.body).toEqual({ name: 'uppercase' });
		});
	});

	describe('validateQuery', () => {
		const schema = z.object({
			page: z.coerce.number().int().positive().optional(),
			limit: z.coerce.number().int().max(100).optional(),
			search: z.string().optional(),
		});

		it('should pass validation with valid query params', async () => {
			mockRequest.query = {
				page: '1',
				limit: '20',
				search: 'test',
			};

			const validator = validateQuery(schema);
			await validator(mockRequest as FastifyRequest, mockReply as FastifyReply);

			expect(mockReply.status).not.toHaveBeenCalled();
			expect(mockRequest.query).toEqual({
				page: 1,
				limit: 20,
				search: 'test',
			});
		});

		it('should fail validation with invalid query params', async () => {
			mockRequest.query = {
				page: '-1',
				limit: '200', // Over max
			};

			const validator = validateQuery(schema);
			await validator(mockRequest as FastifyRequest, mockReply as FastifyReply);

			expect(mockReply.status).toHaveBeenCalledWith(400);
		});
	});

	describe('validateParams', () => {
		const schema = z.object({
			id: z.string().uuid(),
		});

		it('should pass validation with valid UUID', async () => {
			mockRequest.params = {
				id: '123e4567-e89b-12d3-a456-426614174000',
			};

			const validator = validateParams(schema);
			await validator(mockRequest as FastifyRequest, mockReply as FastifyReply);

			expect(mockReply.status).not.toHaveBeenCalled();
		});

		it('should fail validation with invalid UUID', async () => {
			mockRequest.params = {
				id: 'not-a-uuid',
			};

			const validator = validateParams(schema);
			await validator(mockRequest as FastifyRequest, mockReply as FastifyReply);

			expect(mockReply.status).toHaveBeenCalledWith(400);
			expect(mockReply.send).toHaveBeenCalledWith(
				expect.objectContaining({
					message: 'Validation failed',
				}),
			);
		});
	});
});
