import { FastifyRequest, FastifyReply } from 'fastify';
import { ZodSchema, ZodError } from 'zod';

/**
 * Tipos de validação suportados
 */
type ValidationType = 'body' | 'query' | 'params';

/**
 * Middleware factory para validação usando Zod schemas
 * Implementa o padrão Factory para criar validators específicos
 *
 * Benefícios:
 * - Validação centralizada e consistente
 * - Mensagens de erro padronizadas
 * - Type-safety com TypeScript
 * - Fácil reutilização em múltiplas rotas
 */

/**
 * Cria um middleware de validação para um schema específico
 * @param schema - Schema Zod para validação
 * @param type - Tipo de validação (body, query, params)
 * @returns Hook do Fastify para validação
 */
export function validateRequest<T>(
	schema: ZodSchema<T>,
	type: ValidationType = 'body',
) {
	return async (
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> => {
		try {
			// Seleciona a parte do request a ser validada
			const data =
				type === 'body'
					? request.body
					: type === 'query'
						? request.query
						: request.params;

			// Valida e transforma os dados
			const validated = schema.parse(data);

			// Substitui os dados originais pelos validados e transformados
			if (type === 'body') {
				request.body = validated;
			} else if (type === 'query') {
				request.query = validated as any;
			} else {
				request.params = validated as any;
			}

			// Continua para o próximo handler
		} catch (error) {
			if (error instanceof ZodError) {
				// Formata os erros do Zod em um formato mais legível
				const formattedErrors = error.errors.map((err) => ({
					field: err.path.join('.'),
					message: err.message,
					code: err.code,
				}));

				// Log do erro de validação
				request.log.warn(
					{
						type,
						errors: formattedErrors,
						url: request.url,
						method: request.method,
					},
					'Validation error',
				);

				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'Validation failed',
					details: formattedErrors,
				});
			}

			// Erro inesperado durante validação
			request.log.error(error, 'Unexpected validation error');

			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'An unexpected error occurred during validation',
			});
		}
	};
}

/**
 * Helpers específicos para cada tipo de validação
 * Facilitam o uso e melhoram a legibilidade
 */

export const validateBody = <T>(schema: ZodSchema<T>) =>
	validateRequest(schema, 'body');

export const validateQuery = <T>(schema: ZodSchema<T>) =>
	validateRequest(schema, 'query');

export const validateParams = <T>(schema: ZodSchema<T>) =>
	validateRequest(schema, 'params');

/**
 * Middleware para validar múltiplas partes do request
 * @param schemas - Objeto com schemas para cada parte
 */
export function validateMultiple(schemas: {
	body?: ZodSchema<any>;
	query?: ZodSchema<any>;
	params?: ZodSchema<any>;
}) {
	return async (
		request: FastifyRequest,
		reply: FastifyReply,
	): Promise<void> => {
		try {
			// Valida body se schema fornecido
			if (schemas.body) {
				request.body = schemas.body.parse(request.body);
			}

			// Valida query se schema fornecido
			if (schemas.query) {
				request.query = schemas.query.parse(request.query) as any;
			}

			// Valida params se schema fornecido
			if (schemas.params) {
				request.params = schemas.params.parse(request.params) as any;
			}
		} catch (error) {
			if (error instanceof ZodError) {
				const formattedErrors = error.errors.map((err) => ({
					field: err.path.join('.'),
					message: err.message,
					code: err.code,
				}));

				request.log.warn(
					{
						errors: formattedErrors,
						url: request.url,
						method: request.method,
					},
					'Multiple validation error',
				);

				return reply.status(400).send({
					statusCode: 400,
					error: 'Bad Request',
					message: 'Validation failed',
					details: formattedErrors,
				});
			}

			request.log.error(error, 'Unexpected validation error');

			return reply.status(500).send({
				statusCode: 500,
				error: 'Internal Server Error',
				message: 'An unexpected error occurred during validation',
			});
		}
	};
}
