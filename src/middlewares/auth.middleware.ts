import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config/env.js';

/**
 * Middleware de autenticação para rotas administrativas
 * Valida o header x-admin-key contra a chave configurada no ambiente
 *
 * Segue o princípio Single Responsibility: apenas valida autenticação
 */

/**
 * Hook do Fastify para validar autenticação admin
 * @throws 401 se o header x-admin-key não for fornecido
 * @throws 403 se o header x-admin-key for inválido
 */
export async function authenticateAdmin(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const adminKey = request.headers['x-admin-key'];

	// Verifica se o header foi fornecido
	if (!adminKey) {
		return reply.status(401).send({
			statusCode: 401,
			error: 'Unauthorized',
			message: 'Missing x-admin-key header',
		});
	}

	// Verifica se é um array (múltiplos headers com mesmo nome)
	const key = Array.isArray(adminKey) ? adminKey[0] : adminKey;

	// Valida a chave
	if (key !== config.security.adminKey) {
		// Log de tentativa de acesso não autorizado (sem expor a chave)
		request.log.warn(
			{
				ip: request.ip,
				url: request.url,
				method: request.method,
			},
			'Unauthorized admin access attempt',
		);

		return reply.status(403).send({
			statusCode: 403,
			error: 'Forbidden',
			message: 'Invalid admin key',
		});
	}

	// Autenticação bem-sucedida
	request.log.info(
		{
			ip: request.ip,
			url: request.url,
			method: request.method,
		},
		'Admin authenticated',
	);
}

/**
 * Decorator type para adicionar informações de autenticação ao request
 */
declare module 'fastify' {
	interface FastifyRequest {
		isAdmin?: boolean;
	}
}
