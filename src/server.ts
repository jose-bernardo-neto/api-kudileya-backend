import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import {
	errorHandler,
	notFoundHandler,
} from './middlewares/error-handler.middleware.js';
import { globalRateLimitOptions } from './middlewares/rate-limit.middleware.js';
import { registerAskRoutes } from './controllers/ask.controller.js';
import { registerFAQRoutes } from './controllers/faq.controller.js';
import { registerDocumentRoutes } from './controllers/document.controller.js';
import { setupSwagger } from './config/swagger.js';

/**
 * Cria e configura a instância do Fastify
 * Implementa todas as configurações necessárias para o servidor
 */
export async function buildServer(): Promise<FastifyInstance> {
	// Cria instância do Fastify com Pino logger
	const server = Fastify({
		logger: {
			level: config.server.env === 'production' ? 'info' : 'debug',
			transport:
				config.server.env === 'development'
					? {
							target: 'pino-pretty',
							options: {
								translateTime: 'HH:MM:ss Z',
								ignore: 'pid,hostname',
								colorize: true,
							},
						}
					: undefined,
		},
		requestIdLogLabel: 'requestId',
		disableRequestLogging: false,
		trustProxy: true, // Para rate limiting por IP real
	});

	// ===== PLUGINS =====

	// CORS - Configurável via ambiente
	await server.register(cors, {
		origin: config.cors.origin,
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
	});

	// Multipart/form-data para uploads
	await server.register(multipart, {
		limits: {
			fileSize: config.upload.maxFileSize,
			files: 1, // Apenas 1 arquivo por vez
		},
	});

	// Rate limiting global
	await server.register(rateLimit, globalRateLimitOptions);

	// Swagger/OpenAPI Documentation
	await setupSwagger(server);

	// ===== HOOKS =====

	// Hook de log para todas as requisições
	server.addHook('onRequest', async (request, _reply) => {
		request.log.info(
			{
				method: request.method,
				url: request.url,
				ip: request.ip,
				userAgent: request.headers['user-agent'],
			},
			'Incoming request',
		);
	});

	// Hook de log para todas as respostas
	server.addHook('onResponse', async (request, reply) => {
		request.log.info(
			{
				method: request.method,
				url: request.url,
				statusCode: reply.statusCode,
				responseTime: reply.getResponseTime(),
			},
			'Request completed',
		);
	});

	// ===== ERROR HANDLERS =====

	// Handler global de erros
	server.setErrorHandler(errorHandler);

	// Handler para rotas não encontradas
	server.setNotFoundHandler(notFoundHandler);

	// ===== HEALTH CHECK =====

	// Rota de health check
	server.get('/health', async (_request, reply) => {
		return reply.status(200).send({
			status: 'ok',
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			environment: config.server.env,
		});
	});

	// Rota raiz
	server.get('/', async (_request, reply) => {
		return reply.status(200).send({
			name: 'AI Knowledge Base API',
			version: '1.0.0',
			description:
				'REST API for AI-powered knowledge base with FAQs and document management',
			docs: '/api/v1',
			health: '/health',
		});
	});

	// ===== ROTAS DA API =====

	// Registra todas as rotas dos controllers
	await registerAskRoutes(server);
	await registerFAQRoutes(server);
	await registerDocumentRoutes(server);

	// Log das rotas registradas
	server.ready(() => {
		server.log.info('Routes registered:');
		server.log.info(server.printRoutes());
	});

	return server;
}

/**
 * Inicia o servidor
 */
export async function startServer(): Promise<FastifyInstance> {
	try {
		const server = await buildServer();

		// Inicia o servidor
		await server.listen({
			port: config.server.port,
			host: config.server.host,
		});

		// Log de sucesso
		server.log.info(
			`🚀 Server is running on http://${config.server.host}:${config.server.port}`,
		);
		server.log.info(`📝 Environment: ${config.server.env}`);
		server.log.info(`🤖 AI Provider: ${config.ai.provider}`);

		// Log the API key used by the selected AI provider for debugging purposes.
		// We redact the key by default to avoid leaking secrets in logs.
		// Full key will be logged only in non-production environments when logger level is 'debug'.
		try {
			const provider = config.ai.provider;
			let providerKey: string | undefined;
			switch (provider) {
				case 'gemini':
					providerKey = config.ai.gemini.apiKey;
					break;
				case 'openai':
					providerKey = config.ai.openai.apiKey;
					break;
				case 'openrouter':
					providerKey = config.ai.openrouter.apiKey;
					break;
				case 'grok':
					providerKey = config.ai.grok.apiKey;
					break;
				case 'mock':
					providerKey = undefined;
					break;
				default:
					providerKey = undefined;
			}

			if (providerKey) {
				const redact = (k: string) =>
					k.length > 10 ? `${k.slice(0, 6)}...${k.slice(-4)}` : '****';
				const redacted = redact(providerKey);
				server.log.info(
					{ provider, providerKey: redacted },
					'AI provider key (redacted)',
				);

				// If in debug mode and not production, log full key for debugging
				if (
					config.server.env !== 'production' &&
					server.log.level === 'debug'
				) {
					server.log.debug({ provider, providerKey }, 'AI provider key (full)');
				}
			} else {
				server.log.info({ provider }, 'No API key configured for AI provider');
			}
		} catch (e) {
			server.log.warn({ err: e }, 'Failed to log AI provider key for debug');
		}

		// Graceful shutdown
		const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
		signals.forEach((signal) => {
			process.on(signal, async () => {
				server.log.info(`Received ${signal}, closing server gracefully...`);
				await server.close();
				process.exit(0);
			});
		});

		return server;
	} catch (error) {
		console.error('Error starting server:', error);
		process.exit(1);
	}
}
