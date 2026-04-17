import { FastifyRequest, FastifyReply } from 'fastify';
import { AIService } from '../services/ai.service.js';
import { AIAdapterFactory } from '../adapters/ai/index.js';
import { cache } from '../utils/cache.js';
import { AskRequestBody } from '../middlewares/validation.schemas.js';
import { authenticateAdmin } from '../middlewares/auth.middleware.js';

/**
 * Controller para o endpoint /ask
 * Gerencia perguntas para a IA
 *
 * Princípios aplicados:
 * - Single Responsibility: Apenas lida com requisições /ask
 * - Dependency Injection: Recebe service como dependência
 */

// Instância global do serviço (inicializada no startup)
let aiService: AIService;

/**
 * Inicializa o AIService
 * Deve ser chamado no startup do servidor
 */
export async function initializeAIService(): Promise<void> {
	const provider = AIAdapterFactory.createFromEnv();
	aiService = new AIService(provider, 5 * 60 * 1000); // Cache de 5 minutos
	await aiService.initialize();
}

/**
 * Interface para o body da requisição
 */
interface AskRequestType extends FastifyRequest {
	body: AskRequestBody;
}

/**
 * Handler para POST /api/v1/ask
 * Envia pergunta para IA e retorna resposta
 */
export async function askQuestion(
	request: AskRequestType,
	reply: FastifyReply,
): Promise<void> {
	const { question } = request.body;

	// Log da pergunta (sem dados sensíveis)
	request.log.info(
		{ questionLength: question.length },
		'Processing AI question',
	);

	try {
		// Usa a instância global do service (já inicializada)
		const result = await aiService.ask(question);

		// Log de sucesso
		request.log.info(
			{
				provider: result.provider,
				answerLength: result.answer.length,
			},
			'AI question answered successfully',
		);

		// Retorna resposta
		return reply.status(200).send({
			answer: result.answer,
			timestamp: result.timestamp,
			provider: result.provider,
		});
	} catch (error) {
		// Erro será tratado pelo error handler global
		throw error;
	}
}

/**
 * Handler para GET /api/v1/ask/health
 * Verifica o status do provider de IA
 */
export async function checkAIHealth(
	_request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Tenta usar cache para não sobrecarregar verificações
	const cached = cache.get<any>('ai:health');

	if (cached) {
		return reply.status(200).send(cached);
	}

	try {
		const aiService = new AIService();
		const health = await aiService.checkHealth();

		// Cacheia por 30 segundos
		cache.set('ai:health', health, 30);

		const statusCode = health.available ? 200 : 503;

		return reply.status(statusCode).send(health);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para POST /api/v1/ask/suggestions
 * Obtém sugestões de perguntas relacionadas
 */
export async function getSuggestions(
	request: AskRequestType,
	reply: FastifyReply,
): Promise<void> {
	const { question } = request.body;

	try {
		const aiService = new AIService();
		const suggestions = await aiService.getSuggestions(question);

		return reply.status(200).send({
			suggestions,
			count: suggestions.length,
		});
	} catch (error) {
		// Se falhar, retorna array vazio ao invés de erro
		request.log.warn(error, 'Failed to get suggestions');

		return reply.status(200).send({
			suggestions: [],
			count: 0,
		});
	}
}

/**
 * Registra as rotas do Ask Controller
 */
export async function registerAskRoutes(app: any): Promise<void> {
	const { validateBody, askRequestSchema, askRateLimitOptions } =
		await import('../middlewares/index.js');

	// POST /api/v1/ask - Fazer pergunta (com rate limit)
	app.post(
		'/api/v1/ask',
		{
			preHandler: [validateBody(askRequestSchema)],
			config: {
				rateLimit: askRateLimitOptions,
			},
			schema: {
				description: 'Envia uma pergunta para o assistente de IA',
				tags: ['Ask'],
				body: {
					type: 'object',
					required: ['question'],
					properties: {
						question: {
							type: 'string',
							minLength: 5,
							maxLength: 500,
							description: 'Pergunta a ser enviada para a IA',
						},
					},
				},
				response: {
					200: {
						description: 'Resposta da IA',
						type: 'object',
						properties: {
							answer: { type: 'string', description: 'Resposta da IA' },
							timestamp: {
								type: 'string',
								format: 'date-time',
								description: 'Momento da resposta',
							},
							provider: {
								type: 'string',
								description: 'Provider de IA utilizado',
							},
						},
					},
					400: {
						description: 'Requisição inválida',
						type: 'object',
						properties: {
							statusCode: { type: 'number', example: 400 },
							error: { type: 'string', example: 'Bad Request' },
							message: { type: 'string', example: 'Validation failed' },
							details: { type: 'object' },
						},
					},
					429: {
						description: 'Limite de requisições excedido',
						type: 'object',
						properties: {
							statusCode: { type: 'number', example: 429 },
							error: { type: 'string', example: 'Too Many Requests' },
							message: {
								type: 'string',
								example: 'Rate limit exceeded. Please try again later.',
							},
						},
					},
					503: {
						description:
							'Serviço de IA temporariamente indisponível (alta demanda, timeout, etc)',
						type: 'object',
						properties: {
							statusCode: { type: 'number', example: 503 },
							error: { type: 'string', example: 'Service Unavailable' },
							message: {
								type: 'string',
								example:
									'AI service error: Failed to get response from Gemini: [503 Service Unavailable] This model is currently experiencing high demand',
							},
							details: {
								type: 'object',
								properties: {
									provider: { type: 'string', example: 'gemini' },
									suggestion: {
										type: 'string',
										example:
											'This is a temporary issue with the AI provider. Please try again in a few moments.',
									},
									retryable: { type: 'boolean', example: true },
								},
							},
						},
					},
				},
			},
		},
		askQuestion,
	);

	// POST /api/v1/ask/suggestions - Sugestões de perguntas
	app.post(
		'/api/v1/ask/suggestions',
		{
			preHandler: [validateBody(askRequestSchema)],
			schema: {
				description:
					'Obtém sugestões de perguntas relacionadas baseadas em uma pergunta inicial',
				tags: ['Ask'],
				body: {
					type: 'object',
					required: ['question'],
					properties: {
						question: {
							type: 'string',
							minLength: 5,
							maxLength: 500,
							description: 'Pergunta base para gerar sugestões',
						},
					},
				},
				response: {
					200: {
						description:
							'Lista de sugestões (pode retornar vazio em caso de falha)',
						type: 'object',
						properties: {
							suggestions: {
								type: 'array',
								items: { type: 'string' },
								description: 'Lista de perguntas sugeridas',
							},
							count: { type: 'number', description: 'Número de sugestões' },
						},
					},
				},
			},
		},
		getSuggestions,
	);

	// GET /api/v1/ask/health - Status do provedor com cache
	app.get(
		'/api/v1/ask/health',
		{
			schema: {
				description: 'Get AI provider health status with cache info',
				tags: ['AI'],
				response: {
					200: {
						type: 'object',
						properties: {
							provider: { type: 'string' },
							available: { type: 'boolean' },
							lastCheck: { type: 'string' },
							cacheExpiresInSeconds: { type: 'number' },
							timestamp: { type: 'string' },
						},
					},
				},
			},
		},
		async (_request: FastifyRequest, reply: FastifyReply) => {
			const status = aiService.getAvailabilityStatus();
			const provider = aiService.getProviderInfo().name;

			return reply.status(200).send({
				provider,
				available: status.isAvailable,
				lastCheck: status.lastCheck.toISOString(),
				cacheExpiresInSeconds: status.cacheExpiresIn,
				timestamp: new Date().toISOString(),
			});
		},
	);

	// POST /api/v1/ask/force-check - Força verificação (Admin)
	app.post(
		'/api/v1/ask/force-check',
		{
			preHandler: authenticateAdmin,
			schema: {
				description: 'Force AI provider availability check (Admin only)',
				tags: ['AI'],
				security: [{ adminKey: [] }],
				response: {
					200: {
						type: 'object',
						properties: {
							provider: { type: 'string' },
							available: { type: 'boolean' },
							lastCheck: { type: 'string' },
							cacheExpiresInSeconds: { type: 'number' },
							message: { type: 'string' },
							timestamp: { type: 'string' },
						},
					},
				},
			},
		},
		async (_request: FastifyRequest, reply: FastifyReply) => {
			const isAvailable = await aiService.forceAvailabilityCheck();
			const status = aiService.getAvailabilityStatus();
			const provider = aiService.getProviderInfo().name;

			return reply.status(200).send({
				provider,
				available: isAvailable,
				lastCheck: status.lastCheck.toISOString(),
				cacheExpiresInSeconds: status.cacheExpiresIn,
				message: 'Availability check completed',
				timestamp: new Date().toISOString(),
			});
		},
	);
}
