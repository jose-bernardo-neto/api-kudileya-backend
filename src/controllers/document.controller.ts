import { FastifyRequest, FastifyReply } from 'fastify';
import { DocumentService } from '../services/document.service.js';
import { cache } from '../utils/cache.js';
import { createReadStream } from 'fs';
import {
	ListDocumentsQuery,
	listDocumentsQuerySchema,
	uploadDocumentSchema,
	documentIdParamSchema,
} from '../middlewares/validation.schemas.js';

/**
 * Controller para o endpoint /documents
 * Gerencia operações de documentos e uploads
 */

/**
 * Interfaces para requests tipados
 */
interface ListDocumentsRequest extends FastifyRequest {
	query: ListDocumentsQuery;
}

interface DocumentIdRequest extends FastifyRequest {
	params: {
		id: string;
	};
}

/**
 * Handler para GET /api/v1/documents
 * Lista documentos com paginação
 */
export async function listDocuments(
	request: ListDocumentsRequest,
	reply: FastifyReply,
): Promise<void> {
	const { cursor, limit } = request.query;

	// Gera chave de cache
	const cacheKey = `documents:list:${cursor || 'first'}:${limit || 'default'}`;

	// Tenta buscar do cache
	const cached = cache.get<any>(cacheKey);
	if (cached) {
		request.log.info('Returning documents from cache');
		return reply.status(200).send(cached);
	}

	try {
		const documentService = new DocumentService();
		const result = await documentService.listDocuments(cursor, limit);

		// Cacheia o resultado
		cache.set(cacheKey, result);

		request.log.info(
			{
				count: result.data.length,
				hasMore: result.has_more,
			},
			'Documents listed successfully',
		);

		return reply.status(200).send(result);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para GET /api/v1/documents/:id
 * Busca metadados de um documento específico
 */
export async function getDocumentById(
	request: DocumentIdRequest,
	reply: FastifyReply,
): Promise<void> {
	const { id } = request.params;

	// Tenta buscar do cache
	const cacheKey = `document:${id}`;
	const cached = cache.get<any>(cacheKey);

	if (cached) {
		return reply.status(200).send(cached);
	}

	try {
		const documentService = new DocumentService();
		const document = await documentService.getDocumentById(id);

		// Cacheia o documento
		cache.set(cacheKey, document);

		return reply.status(200).send(document);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para GET /api/v1/documents/:id/download
 * Faz download do arquivo físico do documento
 */
export async function downloadDocument(
	request: DocumentIdRequest,
	reply: FastifyReply,
): Promise<void> {
	const { id } = request.params;

	try {
		const documentService = new DocumentService();
		const document = await documentService.getDocumentById(id);
		const filepath = await documentService.getDocumentFilePath(id);

		request.log.info(
			{
				id,
				filename: document.filename,
			},
			'Document download started',
		);

		// Define headers para download
		reply.header('Content-Type', document.mimetype);
		reply.header(
			'Content-Disposition',
			`attachment; filename="${document.filename}"`,
		);
		reply.header('Content-Length', document.size);

		// Envia o arquivo
		const stream = createReadStream(filepath);
		return reply.send(stream);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para POST /api/v1/documents
 * Upload de novo documento (requer autenticação admin)
 */
export async function uploadDocument(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	try {
		// Processa multipart data
		const data = await request.file();

		if (!data) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: 'No file uploaded',
			});
		}

		// Lê os campos do formulário
		const titleField: any = data.fields.title;
		const descField: any = data.fields.description;
		const title = titleField?.value as string;
		const description = descField?.value as string;

		// Valida campos obrigatórios
		if (!title || !description) {
			return reply.status(400).send({
				statusCode: 400,
				error: 'Bad Request',
				message: 'Title and description are required',
				details: {
					title: !title ? 'Title is required' : undefined,
					description: !description ? 'Description is required' : undefined,
				},
			});
		}

		// Valida com schema Zod
		const validatedFields = uploadDocumentSchema.parse({ title, description });

		// Converte o arquivo para buffer
		const buffer = await data.toBuffer();

		const documentService = new DocumentService();
		const document = await documentService.uploadDocument(
			{
				buffer,
				filename: data.filename,
				mimetype: data.mimetype,
				size: buffer.length,
			},
			validatedFields.title,
			validatedFields.description,
		);

		// Invalida cache de listagens
		cache.delByPrefix('documents:list');

		request.log.info(
			{
				id: document.id,
				filename: document.filename,
				size: document.size,
			},
			'Document uploaded successfully',
		);

		return reply.status(201).send(document);
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para DELETE /api/v1/documents/:id
 * Remove um documento e seu arquivo (requer autenticação admin)
 */
export async function deleteDocument(
	request: DocumentIdRequest,
	reply: FastifyReply,
): Promise<void> {
	const { id } = request.params;

	try {
		const documentService = new DocumentService();
		await documentService.deleteDocument(id);

		// Invalida caches relacionados
		cache.del(`document:${id}`);
		cache.delByPrefix('documents:list');
		cache.delByPrefix('documents:stats');

		request.log.info({ id }, 'Document deleted successfully');

		return reply.status(204).send();
	} catch (error) {
		throw error;
	}
}

/**
 * Handler para GET /api/v1/documents/search
 * Busca documentos por palavra-chave
 */
export async function searchDocuments(
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
	const cacheKey = `documents:search:${q.toLowerCase()}`;
	const cached = cache.get<any>(cacheKey);

	if (cached) {
		return reply.status(200).send(cached);
	}

	try {
		const documentService = new DocumentService();
		const results = await documentService.searchDocuments(q);

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
 * Handler para GET /api/v1/documents/stats
 * Obtém estatísticas dos documentos
 */
export async function getDocumentsStats(
	_request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const cacheKey = 'documents:stats';
	const cached = cache.get<any>(cacheKey);

	if (cached) {
		return reply.status(200).send(cached);
	}

	try {
		const documentService = new DocumentService();
		const stats = await documentService.getStatistics();

		// Cacheia por 5 minutos
		cache.set(cacheKey, stats, 300);

		return reply.status(200).send(stats);
	} catch (error) {
		throw error;
	}
}

/**
 * Registra as rotas do Document Controller
 */
export async function registerDocumentRoutes(app: any): Promise<void> {
	const { validateQuery, validateParams, authenticateAdmin } =
		await import('../middlewares/index.js');

	// GET /api/v1/documents - Listar documentos (público)
	app.get(
		'/api/v1/documents',
		{
			preHandler: [validateQuery(listDocumentsQuerySchema)],
		},
		listDocuments,
	);

	// GET /api/v1/documents/search - Buscar documentos (público)
	app.get('/api/v1/documents/search', searchDocuments);

	// GET /api/v1/documents/stats - Estatísticas (público)
	app.get('/api/v1/documents/stats', getDocumentsStats);

	// GET /api/v1/documents/:id - Buscar documento por ID (público)
	app.get(
		'/api/v1/documents/:id',
		{
			preHandler: [validateParams(documentIdParamSchema)],
		},
		getDocumentById,
	);

	// GET /api/v1/documents/:id/download - Download de arquivo (público)
	app.get(
		'/api/v1/documents/:id/download',
		{
			preHandler: [validateParams(documentIdParamSchema)],
		},
		downloadDocument,
	);

	// POST /api/v1/documents - Upload de documento (admin)
	app.post(
		'/api/v1/documents',
		{
			preHandler: [authenticateAdmin],
		},
		uploadDocument,
	);

	// DELETE /api/v1/documents/:id - Deletar documento (admin)
	app.delete(
		'/api/v1/documents/:id',
		{
			preHandler: [authenticateAdmin, validateParams(documentIdParamSchema)],
		},
		deleteDocument,
	);
}
