/**
 * Resposta paginada genérica
 */
export interface PaginatedResponse<T> {
	data: T[];
	next_cursor: string | null;
	has_more: boolean;
}

/**
 * Request para o endpoint /ask
 */
export interface AskRequest {
	question: string;
}

/**
 * Response do endpoint /ask
 */
export interface AskResponse {
	answer: string;
	timestamp: string;
}

/**
 * Estrutura padronizada de erro
 */
export interface StandardError {
	statusCode: number;
	error: string;
	message: string;
	details?: Record<string, any>;
}

/**
 * Query params para listagem de FAQs
 */
export interface ListFAQsQuery {
	topic?: string;
	cursor?: string;
	limit?: number;
}

/**
 * Query params para listagem de documentos
 */
export interface ListDocumentsQuery {
	cursor?: string;
	limit?: number;
}
