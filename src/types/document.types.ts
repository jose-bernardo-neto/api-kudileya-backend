/**
 * Document entity
 */
export interface Document {
	id: string;
	title: string;
	description: string;
	filename: string;
	filepath: string;
	mimetype: string;
	size: number;
	createdAt: string; // ISO-8601
}

/**
 * Input para criar um novo documento
 */
export interface CreateDocumentInput {
	title: string;
	description: string;
	filename: string;
	filepath: string;
	mimetype: string;
	size: number;
}

/**
 * Estrutura do arquivo data/documents.json
 */
export interface DocumentsData {
	documents: Document[];
}
