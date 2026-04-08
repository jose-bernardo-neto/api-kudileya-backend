import { FastifyRequest, FastifyReply } from 'fastify';
import { AIService } from '../services/ai.service.js';
import { cache } from '../utils/cache.js';
import { AskRequestBody } from '../middlewares/validation.schemas.js';

/**
 * Controller para o endpoint /ask
 * Gerencia perguntas para a IA
 *
 * Princípios aplicados:
 * - Single Responsibility: Apenas lida com requisições /ask
 * - Dependency Injection: Recebe service como dependência
 */

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
		// Cria instância do service
		const aiService = new AIService();

		// Envia pergunta para IA
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
		},
		askQuestion,
	);

	// GET /api/v1/ask/health - Status da IA
	app.get('/api/v1/ask/health', checkAIHealth);

	// POST /api/v1/ask/suggestions - Sugestões de perguntas
	app.post(
		'/api/v1/ask/suggestions',
		{
			preHandler: [validateBody(askRequestSchema)],
		},
		getSuggestions,
	);
}
