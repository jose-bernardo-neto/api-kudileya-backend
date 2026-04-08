import { FastifyRequest, FastifyReply } from 'fastify';
import { FAQService } from '../services/faq.service.js';
import { cache } from '../utils/cache.js';
import {
	CreateFAQBody,
	ListFAQsQuery,
	createFAQSchema,
	listFAQsQuerySchema,
} from '../middlewares/validation.schemas.js';

/**
 * Controller para o endpoint /faqs
 * Gerencia operações CRUD de FAQs
 */

/**
 * Interface para requests tipados
 */
interface ListFAQsRequest extends FastifyRequest {
	query: ListFAQsQuery;
}

interface CreateFAQRequest extends FastifyRequest {
	body: CreateFAQBody;
}

interface FAQIdRequest extends FastifyRequest {
	params: {
		id: string;
	};
}

/**
 * Handler para GET /api/v1/faqs
 * Lista FAQs com paginação e filtro por tópico
 */
export async function listFAQs(
	request: ListFAQsRequest,
	reply: FastifyReply,
): Promise<void> {
	const { topic, cursor, limit } = request.query;

	// Gera chave de cache baseada nos parâmetros
	const cacheKey = `faqs:list:${topic || 'all'}:${cursor || 'first'}:${limit || 'default'}`;

	// Tenta buscar do cache
	const cached = cache.get<any>(cacheKey);
	if (cached) {
		request.log.info('Returning FAQs from cache');
		return reply.status(200).send(cached);
	}

	try {
		const faqService = new FAQService();
		const result = await faqService.listFAQs(topic, cursor, limit);

		// Cacheia o resultado
		cache.set(cacheKey, result);

		request.log.info(
			{
				count: result.data.length,
				hasMore: result.has_more,
				topic,
			},
			'FAQs listed successfully',
		);

		return reply.status(200).send(result);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para GET /api/v1/faqs/:id
 * Busca uma FAQ específica por ID
 */
export async function getFAQById(
	request: FAQIdRequest,
	reply: FastifyReply,
): Promise<void> {
	const { id } = request.params;

	// Tenta buscar do cache
	const cacheKey = `faq:${id}`;
	const cached = cache.get<any>(cacheKey);

	if (cached) {
		return reply.status(200).send(cached);
	}

	try {
		const faqService = new FAQService();
		const faq = await faqService.getFAQById(id);

		// Cacheia a FAQ individual
		cache.set(cacheKey, faq);

		return reply.status(200).send(faq);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para POST /api/v1/faqs
 * Cria uma nova FAQ (requer autenticação admin)
 */
export async function createFAQ(
	request: CreateFAQRequest,
	reply: FastifyReply,
): Promise<void> {
	const data = request.body;

	try {
		const faqService = new FAQService();
		const faq = await faqService.createFAQ(data);

		// Invalida cache de listagens
		cache.delByPrefix('faqs:list');
		cache.delByPrefix('faqs:topics');

		request.log.info(
			{
				id: faq.id,
				topic: faq.topic,
			},
			'FAQ created successfully',
		);

		return reply.status(201).send(faq);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para PUT /api/v1/faqs/:id
 * Atualiza uma FAQ existente (requer autenticação admin)
 */
export async function updateFAQ(
	request: FastifyRequest<{
		Params: { id: string };
		Body: Partial<CreateFAQBody>;
	}>,
	reply: FastifyReply,
): Promise<void> {
	const { id } = request.params;
	const updates = request.body;

	try {
		const faqService = new FAQService();
		const faq = await faqService.updateFAQ(id, updates);

		// Invalida caches relacionados
		cache.del(`faq:${id}`);
		cache.delByPrefix('faqs:list');
		cache.delByPrefix('faqs:topics');

		request.log.info({ id }, 'FAQ updated successfully');

		return reply.status(200).send(faq);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para DELETE /api/v1/faqs/:id
 * Remove uma FAQ (requer autenticação admin)
 */
export async function deleteFAQ(
	request: FAQIdRequest,
	reply: FastifyReply,
): Promise<void> {
	const { id } = request.params;

	try {
		const faqService = new FAQService();
		await faqService.deleteFAQ(id);

		// Invalida caches relacionados
		cache.del(`faq:${id}`);
		cache.delByPrefix('faqs:list');
		cache.delByPrefix('faqs:topics');

		request.log.info({ id }, 'FAQ deleted successfully');

		return reply.status(204).send();
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para GET /api/v1/faqs/search
 * Busca FAQs por palavra-chave
 */
export async function searchFAQs(
	request: FastifyRequest<{
		Querystring: { q: string };
	}>,
	reply: FastifyReply,
): Promise<void> {
	const { q } = request.query;

	if (!q || q.trim().length === 0) {
		return reply.status(400).send({
			statusCode: 400,
			error: 'Bad Request',
			message: 'Search query parameter "q" is required',
		});
	}

	// Cache de busca
	const cacheKey = `faqs:search:${q.toLowerCase()}`;
	const cached = cache.get<any>(cacheKey);

	if (cached) {
		return reply.status(200).send(cached);
	}

	try {
		const faqService = new FAQService();
		const results = await faqService.searchFAQs(q);

		const response = {
			query: q,
			results,
			count: results.length,
		};

		// Cacheia por 2 minutos
		cache.set(cacheKey, response, 120);

		return reply.status(200).send(response);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para GET /api/v1/faqs/topics
 * Lista todos os tópicos disponíveis
 */
export async function listTopics(
	_request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const cacheKey = 'faqs:topics';
	const cached = cache.get<any>(cacheKey);

	if (cached) {
		return reply.status(200).send(cached);
	}

	try {
		const faqService = new FAQService();
		const topics = await faqService.listTopics();

		const response = {
			topics,
			count: topics.length,
		};

		cache.set(cacheKey, response);

		return reply.status(200).send(response);
	} catch (error) {
		throw error;
	}
}

/**
 * Registra as rotas do FAQ Controller
 */
export async function registerFAQRoutes(app: any): Promise<void> {
	const { validateBody, validateQuery, authenticateAdmin } =
		await import('../middlewares/index.js');

	// GET /api/v1/faqs - Listar FAQs (público)
	app.get(
		'/api/v1/faqs',
		{
			preHandler: [validateQuery(listFAQsQuerySchema)],
		},
		listFAQs,
	);

	// GET /api/v1/faqs/search - Buscar FAQs (público)
	app.get('/api/v1/faqs/search', searchFAQs);

	// GET /api/v1/faqs/topics - Listar tópicos (público)
	app.get('/api/v1/faqs/topics', listTopics);

	// GET /api/v1/faqs/:id - Buscar FAQ por ID (público)
	app.get('/api/v1/faqs/:id', getFAQById);

	// POST /api/v1/faqs - Criar FAQ (admin)
	app.post(
		'/api/v1/faqs',
		{
			preHandler: [authenticateAdmin, validateBody(createFAQSchema)],
		},
		createFAQ,
	);

	// PUT /api/v1/faqs/:id - Atualizar FAQ (admin)
	app.put(
		'/api/v1/faqs/:id',
		{
			preHandler: [authenticateAdmin],
		},
		updateFAQ,
	);

	// DELETE /api/v1/faqs/:id - Deletar FAQ (admin)
	app.delete(
		'/api/v1/faqs/:id',
		{
			preHandler: [authenticateAdmin],
		},
		deleteFAQ,
	);
}
