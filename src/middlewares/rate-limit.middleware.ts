import { FastifyRequest, FastifyReply } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from '../config/env.js';

/**
 * Configurações de rate limiting para diferentes endpoints
 * Implementa proteção contra abuso e DDoS
 */

/**
 * Rate limiter para o endpoint /ask
 * Limita requisições por IP para economizar custos de API de IA
 */
export const askRateLimitOptions = {
	max: config.rateLimit.ask.max, // 10 requisições
	timeWindow: config.rateLimit.ask.timeWindow, // por hora (3600000ms)
	cache: 10000, // Número de IPs a manter em cache
	allowList: [] as string[], // IPs que não sofrem rate limit
	skipOnError: false, // Bloqueia se o rate limiter falhar

	// Mensagem customizada quando rate limit é excedido
	errorResponseBuilder: (_request: FastifyRequest, context: any) => {
		return {
			statusCode: 429,
			error: 'Too Many Requests',
			message: `Rate limit exceeded. You can make ${config.rateLimit.ask.max} requests per hour. Please try again later.`,
			details: {
				limit: config.rateLimit.ask.max,
				timeWindow: config.rateLimit.ask.timeWindow,
				retryAfter: Math.ceil(context.ttl / 1000), // em segundos
			},
		};
	},

	// Chave para identificar o cliente (baseada no IP)
	keyGenerator: (request: FastifyRequest) => {
		// Tenta obter o IP real considerando proxies
		const forwarded = request.headers['x-forwarded-for'];
		const realIp = request.headers['x-real-ip'];

		if (forwarded) {
			return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
		}

		if (realIp) {
			return Array.isArray(realIp) ? realIp[0] : realIp;
		}

		return request.ip;
	},

	// Hook executado quando rate limit é aplicado
	onExceeding: (request: FastifyRequest) => {
		request.log.warn(
			{
				ip: request.ip,
				url: request.url,
				method: request.method,
			},
			'Rate limit warning: approaching limit',
		);
	},

	// Hook executado quando rate limit é excedido
	onExceeded: (request: FastifyRequest) => {
		request.log.warn(
			{
				ip: request.ip,
				url: request.url,
				method: request.method,
			},
			'Rate limit exceeded',
		);
	},
};

/**
 * Opções de rate limiting para endpoints administrativos
 * Limites mais generosos mas ainda com proteção
 */
export const adminRateLimitOptions = {
	max: 100, // 100 requisições
	timeWindow: '1 minute', // por minuto
	skipOnError: false,

	errorResponseBuilder: () => ({
		statusCode: 429,
		error: 'Too Many Requests',
		message: 'Admin rate limit exceeded. Please try again later.',
	}),

	keyGenerator: (request: FastifyRequest) => {
		// Para rotas admin, usa a chave admin como identificador
		const adminKey = request.headers['x-admin-key'];
		return Array.isArray(adminKey) ? adminKey[0] : adminKey || request.ip;
	},
};

/**
 * Opções de rate limiting global (para todas as outras rotas)
 * Proteção básica contra DDoS
 */
export const globalRateLimitOptions = {
	max: 200, // 200 requisições
	timeWindow: '1 minute', // por minuto
	skipOnError: true, // Não bloqueia se o rate limiter falhar

	errorResponseBuilder: () => ({
		statusCode: 429,
		error: 'Too Many Requests',
		message: 'Too many requests. Please slow down.',
	}),

	keyGenerator: (request: FastifyRequest) => {
		const forwarded = request.headers['x-forwarded-for'];
		if (forwarded) {
			return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
		}
		return request.ip;
	},
};

/**
 * Helper para criar um rate limiter configurado
 * Facilita a reutilização em diferentes rotas
 */
export function createRateLimiter(_options: typeof askRateLimitOptions) {
	return rateLimit;
}

/**
 * Middleware customizado para bypass de rate limit em desenvolvimento
 * Útil para testes locais
 */
export async function bypassRateLimitInDev(
	request: FastifyRequest,
	_reply: FastifyReply,
): Promise<void> {
	if (config.server.env === 'development') {
		// Em desenvolvimento, marca o request para bypass
		(request as any).skipRateLimit = true;
	}
}

/**
 * Adiciona headers de rate limit na resposta
 * Informa ao cliente sobre o status do rate limit
 */
export function addRateLimitHeaders(
	request: FastifyRequest,
	reply: FastifyReply,
): void {
	const rateLimit = (request as any).rateLimit;

	if (rateLimit) {
		reply.header('X-RateLimit-Limit', rateLimit.limit);
		reply.header('X-RateLimit-Remaining', rateLimit.remaining);
		reply.header('X-RateLimit-Reset', rateLimit.reset);
	}
}
