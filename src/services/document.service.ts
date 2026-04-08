import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import { JsonRepository } from '../repositories/json.repository.js';
import { Document, CreateDocumentInput } from '../types/document.types.js';
import { PaginatedResponse } from '../types/api.types.js';
import {
	NotFoundError,
	ValidationError,
} from '../middlewares/error-handler.middleware.js';
import { config } from '../config/env.js';

/**
 * Service para gerenciamento de documentos
 * Implementa a lógica de negócio relacionada a uploads e documentos
 *
 * Princípios SOLID:
 * - Single Responsibility: Apenas gerencia documentos
 * - Dependency Inversion: Depende de abstrações
 */
export class DocumentService {
	private repository: JsonRepository<Document>;
	private uploadsDir: string;

	constructor(repository?: JsonRepository<Document>, uploadsDir?: string) {
		this.repository =
			repository || new JsonRepository<Document>('documents.json');
		this.uploadsDir = uploadsDir || path.join(process.cwd(), 'uploads');
	}

	/**
	 * Lista documentos com paginação
	 * @param cursor - Cursor de paginação (ISO-8601 timestamp)
	 * @param limit - Limite de itens por página
	 * @returns Resposta paginada com documentos
	 */
	async listDocuments(
		cursor?: string,
		limit?: number,
	): Promise<PaginatedResponse<Document>> {
		const effectiveLimit = Math.min(
			limit || config.pagination.defaultLimit,
			config.pagination.maxLimit,
		);

		const result = await this.repository.findPaginated(cursor, effectiveLimit);

		return {
			data: result.items,
			next_cursor: result.nextCursor,
			has_more: result.hasMore,
		};
	}

	/**
	 * Busca um documento por ID
	 * @param id - ID do documento
	 * @returns Documento encontrado
	 * @throws NotFoundError se o documento não existir
	 */
	async getDocumentById(id: string): Promise<Document> {
		const document = await this.repository.findById(id);

		if (!document) {
			throw new NotFoundError('Document', id);
		}

		return document;
	}

	/**
	 * Obtém o caminho do arquivo físico de um documento
	 * @param id - ID do documento
	 * @returns Caminho completo do arquivo
	 * @throws NotFoundError se o documento não existir ou arquivo não for encontrado
	 */
	async getDocumentFilePath(id: string): Promise<string> {
		const document = await this.getDocumentById(id);

		// Verifica se o arquivo físico existe
		try {
			await fs.access(document.filepath);
			return document.filepath;
		} catch {
			throw new NotFoundError('Document file', id);
		}
	}

	/**
	 * Cria um novo documento com upload de arquivo
	 * @param input - Dados do documento
	 * @returns Documento criado
	 * @throws ValidationError se validação falhar
	 */
	async createDocument(input: CreateDocumentInput): Promise<Document> {
		// Valida o tipo MIME
		this.validateMimeType(input.mimetype);

		// Valida o tamanho do arquivo
		this.validateFileSize(input.size);

		// Garante que o diretório de uploads existe
		await this.ensureUploadsDir();

		const now = new Date().toISOString();

		const newDocument: Document = {
			id: uuidv4(),
			title: input.title.trim(),
			description: input.description.trim(),
			filename: input.filename,
			filepath: input.filepath,
			mimetype: input.mimetype,
			size: input.size,
			createdAt: now,
		};

		return await this.repository.create(newDocument);
	}

	/**
	 * Processa e salva um arquivo enviado
	 * @param file - Dados do arquivo (buffer, nome, tipo, tamanho)
	 * @param title - Título do documento
	 * @param description - Descrição do documento
	 * @returns Documento criado
	 */
	async uploadDocument(
		file: {
			buffer: Buffer;
			filename: string;
			mimetype: string;
			size: number;
		},
		title: string,
		description: string,
	): Promise<Document> {
		// Valida arquivo
		this.validateMimeType(file.mimetype);
		this.validateFileSize(file.size);

		// Gera nome único para o arquivo
		const fileExtension = path.extname(file.filename);
		const uniqueFilename = `${uuidv4()}${fileExtension}`;
		const filepath = path.join(this.uploadsDir, uniqueFilename);

		// Garante que o diretório existe
		await this.ensureUploadsDir();

		try {
			// Salva o arquivo no disco
			await fs.writeFile(filepath, file.buffer);

			// Cria registro no repositório
			const document = await this.createDocument({
				title,
				description,
				filename: file.filename,
				filepath,
				mimetype: file.mimetype,
				size: file.size,
			});

			return document;
		} catch (error) {
			// Se falhar, tenta limpar o arquivo se foi criado
			try {
				await fs.unlink(filepath);
			} catch {
				// Ignora erro de limpeza
			}

			throw new ValidationError('Failed to upload document', {
				originalError: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	/**
	 * Remove um documento e seu arquivo físico
	 * @param id - ID do documento
	 * @throws NotFoundError se o documento não existir
	 */
	async deleteDocument(id: string): Promise<void> {
		const document = await this.getDocumentById(id);

		// Remove arquivo físico
		try {
			await fs.unlink(document.filepath);
		} catch (error) {
			// Log mas não falha se arquivo não existir
			console.warn(`Failed to delete file: ${document.filepath}`, error);
		}

		// Remove registro do repositório
		const deleted = await this.repository.delete(id);

		if (!deleted) {
			throw new NotFoundError('Document', id);
		}
	}

	/**
	 * Busca documentos por título ou descrição
	 * @param keyword - Palavra-chave para buscar
	 * @returns Array de documentos que contêm a palavra-chave
	 */
	async searchDocuments(keyword: string): Promise<Document[]> {
		const allDocuments = await this.repository.findAll();
		const lowerKeyword = keyword.toLowerCase();

		return allDocuments.filter(
			(doc) =>
				doc.title.toLowerCase().includes(lowerKeyword) ||
				doc.description.toLowerCase().includes(lowerKeyword) ||
				doc.filename.toLowerCase().includes(lowerKeyword),
		);
	}

	/**
	 * Obtém estatísticas dos documentos
	 * @returns Estatísticas (total, tamanho total, tipos)
	 */
	async getStatistics(): Promise<{
		totalDocuments: number;
		totalSize: number;
		mimeTypes: Record<string, number>;
	}> {
		const allDocuments = await this.repository.findAll();

		const stats = {
			totalDocuments: allDocuments.length,
			totalSize: allDocuments.reduce((sum, doc) => sum + doc.size, 0),
			mimeTypes: allDocuments.reduce(
				(acc, doc) => {
					acc[doc.mimetype] = (acc[doc.mimetype] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>,
			),
		};

		return stats;
	}

	/**
	 * Valida se o tipo MIME é permitido
	 * @throws ValidationError se tipo não for permitido
	 */
	private validateMimeType(mimetype: string): void {
		const allowedTypes = config.upload.allowedMimeTypes;

		if (!allowedTypes.includes(mimetype)) {
			throw new ValidationError(
				`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
				{
					receivedType: mimetype,
					allowedTypes,
				},
			);
		}
	}

	/**
	 * Valida se o tamanho do arquivo está dentro do limite
	 * @throws ValidationError se arquivo for muito grande
	 */
	private validateFileSize(size: number): void {
		const maxSize = config.upload.maxFileSize;

		if (size > maxSize) {
			throw new ValidationError(
				`File too large. Maximum size: ${this.formatBytes(maxSize)}`,
				{
					receivedSize: size,
					maxSize,
					receivedSizeFormatted: this.formatBytes(size),
					maxSizeFormatted: this.formatBytes(maxSize),
				},
			);
		}
	}

	/**
	 * Garante que o diretório de uploads existe
	 */
	private async ensureUploadsDir(): Promise<void> {
		try {
			await fs.access(this.uploadsDir);
		} catch {
			await fs.mkdir(this.uploadsDir, { recursive: true });
		}
	}

	/**
	 * Formata bytes em formato legível
	 */
	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 Bytes';

		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));

		return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
	}
}
