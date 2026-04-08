import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AIProviderError } from '../adapters/ai/ai-provider.interface.js';

/**
 * Interface para erro padronizado da API
 */
export interface StandardError {
	statusCode: number;
	error: string;
	message: string;
	details?: Record<string, any>;
}

/**
 * Error handler global para a aplicação
 * Centraliza o tratamento de erros e fornece respostas padronizadas
 *
 * Princípios aplicados:
 * - Single Responsibility: apenas trata erros
 * - Open/Closed: fácil adicionar novos tipos de erro
 */

/**
 * Handler principal de erros do Fastify
 */
export async function errorHandler(
	error: FastifyError,
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Log do erro com contexto
	request.log.error(
		{
			err: error,
			url: request.url,
			method: request.method,
			ip: request.ip,
		},
		'Request error',
	);

	// Trata erro de validação do Zod
	if (error instanceof ZodError) {
		const formattedErrors = error.errors.map((err) => ({
			field: err.path.join('.'),
			message: err.message,
			code: err.code,
		}));

		return reply.status(400).send({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Validation failed',
			details: { errors: formattedErrors },
		} satisfies StandardError);
	}

	// Trata erro de provedor de IA
	if (error instanceof AIProviderError) {
		return reply.status(503).send({
			statusCode: 503,
			error: 'Service Unavailable',
			message: `AI service error: ${error.message}`,
			details: {
				provider: error.provider,
			},
		} satisfies StandardError);
	}

	// Trata erros do Fastify com status code
	if (error.statusCode) {
		return reply.status(error.statusCode).send({
			statusCode: error.statusCode,
			error: error.name || 'Error',
			message: error.message,
		} satisfies StandardError);
	}

	// Trata erro de validação de content-type
	if (error.code === 'FST_ERR_CTP_INVALID_MEDIA_TYPE') {
		return reply.status(415).send({
			statusCode: 415,
			error: 'Unsupported Media Type',
			message: 'Invalid content-type. Expected application/json',
		} satisfies StandardError);
	}

	// Trata erro de body muito grande
	if (error.code === 'FST_ERR_CTP_BODY_TOO_LARGE') {
		return reply.status(413).send({
			statusCode: 413,
			error: 'Payload Too Large',
			message: 'Request body is too large',
		} satisfies StandardError);
	}

	// Trata erro de rate limit
	if (error.statusCode === 429) {
		return reply.status(429).send({
			statusCode: 429,
			error: 'Too Many Requests',
			message: 'Rate limit exceeded. Please try again later.',
			details: {
				retryAfter: reply.getHeader('Retry-After'),
			},
		} satisfies StandardError);
	}

	// Erro genérico/inesperado - não expõe detalhes internos
	return reply.status(500).send({
		statusCode: 500,
		error: 'Internal Server Error',
		message: 'An unexpected error occurred',
		// Em desenvolvimento, pode incluir mais detalhes
		...(process.env.NODE_ENV === 'development' && {
			details: {
				message: error.message,
				stack: error.stack,
			},
		}),
	} satisfies StandardError);
}

/**
 * Handler para rotas não encontradas (404)
 */
export async function notFoundHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	request.log.warn(
		{
			url: request.url,
			method: request.method,
			ip: request.ip,
		},
		'Route not found',
	);

	return reply.status(404).send({
		statusCode: 404,
		error: 'Not Found',
		message: `Route ${request.method} ${request.url} not found`,
	} satisfies StandardError);
}

/**
 * Classe de erro customizada para erros de negócio
 * Facilita a criação de erros específicos da aplicação
 */
export class BusinessError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number = 400,
		public readonly details?: Record<string, any>,
	) {
		super(message);
		this.name = 'BusinessError';

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, BusinessError);
		}
	}
}

/**
 * Erros específicos de negócio
 */
export class NotFoundError extends BusinessError {
	constructor(resource: string, id?: string) {
		super(
			id ? `${resource} with id '${id}' not found` : `${resource} not found`,
			404,
		);
		this.name = 'NotFoundError';
	}
}

export class ConflictError extends BusinessError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 409, details);
		this.name = 'ConflictError';
	}
}

export class ValidationError extends BusinessError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 400, details);
		this.name = 'ValidationError';
	}
}

export class UnauthorizedError extends BusinessError {
	constructor(message: string = 'Unauthorized') {
		super(message, 401);
		this.name = 'UnauthorizedError';
	}
}

export class ForbiddenError extends BusinessError {
	constructor(message: string = 'Forbidden') {
		super(message, 403);
		this.name = 'ForbiddenError';
	}
}
