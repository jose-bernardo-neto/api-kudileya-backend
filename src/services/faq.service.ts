import { v4 as uuidv4 } from 'uuid';
import { JsonRepository } from '../repositories/json.repository.js';
import { FAQ, CreateFAQInput } from '../types/faq.types.js';
import { PaginatedResponse } from '../types/api.types.js';
import {
	NotFoundError,
	ConflictError,
} from '../middlewares/error-handler.middleware.js';
import { config } from '../config/env.js';

/**
 * Service para gerenciamento de FAQs
 * Implementa a lógica de negócio relacionada a FAQs
 *
 * Princípios SOLID:
 * - Single Responsibility: Apenas gerencia FAQs
 * - Dependency Inversion: Depende de abstrações (Repository)
 */
export class FAQService {
	private repository: JsonRepository<FAQ>;

	constructor(repository?: JsonRepository<FAQ>) {
		// Permite injeção de dependência para testes (Dependency Injection)
		this.repository = repository || new JsonRepository<FAQ>('faqs.json');
	}

	/**
	 * Lista FAQs com paginação e filtro opcional por tópico
	 * @param topic - Filtro por tópico (opcional)
	 * @param cursor - Cursor de paginação (ISO-8601 timestamp)
	 * @param limit - Limite de itens por página
	 * @returns Resposta paginada com FAQs
	 */
	async listFAQs(
		topic?: string,
		cursor?: string,
		limit?: number,
	): Promise<PaginatedResponse<FAQ>> {
		// Usa limite padrão ou máximo configurado
		const effectiveLimit = Math.min(
			limit || config.pagination.defaultLimit,
			config.pagination.maxLimit,
		);

		// Define filtro por tópico se fornecido
		const filter = topic
			? (faq: FAQ) => faq.topic.toLowerCase() === topic.toLowerCase()
			: undefined;

		// Busca FAQs paginadas com filtro
		const result = await this.repository.findPaginated(
			cursor,
			effectiveLimit,
			filter,
		);

		return {
			data: result.items,
			next_cursor: result.nextCursor,
			has_more: result.hasMore,
		};
	}

	/**
	 * Busca uma FAQ por ID
	 * @param id - ID da FAQ
	 * @returns FAQ encontrada
	 * @throws NotFoundError se a FAQ não existir
	 */
	async getFAQById(id: string): Promise<FAQ> {
		const faq = await this.repository.findById(id);

		if (!faq) {
			throw new NotFoundError('FAQ', id);
		}

		return faq;
	}

	/**
	 * Cria uma nova FAQ
	 * @param input - Dados da nova FAQ
	 * @returns FAQ criada
	 * @throws ConflictError se já existir FAQ idêntica
	 */
	async createFAQ(input: CreateFAQInput): Promise<FAQ> {
		// Valida se já existe FAQ com mesma pergunta e tópico
		await this.validateUniqueFAQ(input.question, input.topic);

		const now = new Date().toISOString();

		const newFAQ: FAQ = {
			id: uuidv4(),
			question: input.question.trim(),
			answer: input.answer.trim(),
			topic: input.topic.trim().toLowerCase(),
			createdAt: now,
			updatedAt: now,
		};

		return await this.repository.create(newFAQ);
	}

	/**
	 * Atualiza uma FAQ existente
	 * @param id - ID da FAQ
	 * @param updates - Dados a atualizar
	 * @returns FAQ atualizada
	 * @throws NotFoundError se a FAQ não existir
	 */
	async updateFAQ(
		id: string,
		updates: Partial<Pick<FAQ, 'question' | 'answer' | 'topic'>>,
	): Promise<FAQ> {
		// Verifica se a FAQ existe
		const existingFAQ = await this.getFAQById(id);

		// Se a pergunta ou tópico mudaram, valida unicidade
		if (
			(updates.question && updates.question !== existingFAQ.question) ||
			(updates.topic && updates.topic !== existingFAQ.topic)
		) {
			await this.validateUniqueFAQ(
				updates.question || existingFAQ.question,
				updates.topic || existingFAQ.topic,
			);
		}

		// Prepara os updates
		const updateData: Partial<FAQ> = {
			...updates,
			updatedAt: new Date().toISOString(),
		};

		// Normaliza topic se fornecido
		if (updateData.topic) {
			updateData.topic = updateData.topic.trim().toLowerCase();
		}

		// Atualiza no repositório
		const updated = await this.repository.update(id, updateData);

		if (!updated) {
			throw new NotFoundError('FAQ', id);
		}

		return updated;
	}

	/**
	 * Remove uma FAQ
	 * @param id - ID da FAQ
	 * @throws NotFoundError se a FAQ não existir
	 */
	async deleteFAQ(id: string): Promise<void> {
		const deleted = await this.repository.delete(id);

		if (!deleted) {
			throw new NotFoundError('FAQ', id);
		}
	}

	/**
	 * Busca FAQs por palavra-chave na pergunta ou resposta
	 * @param keyword - Palavra-chave para buscar
	 * @returns Array de FAQs que contêm a palavra-chave
	 */
	async searchFAQs(keyword: string): Promise<FAQ[]> {
		const allFAQs = await this.repository.findAll();
		const lowerKeyword = keyword.toLowerCase();

		return allFAQs.filter(
			(faq) =>
				faq.question.toLowerCase().includes(lowerKeyword) ||
				faq.answer.toLowerCase().includes(lowerKeyword) ||
				faq.topic.toLowerCase().includes(lowerKeyword),
		);
	}

	/**
	 * Lista todos os tópicos disponíveis
	 * @returns Array de tópicos únicos
	 */
	async listTopics(): Promise<string[]> {
		const allFAQs = await this.repository.findAll();
		const topics = new Set(allFAQs.map((faq) => faq.topic));
		return Array.from(topics).sort();
	}

	/**
	 * Valida se já existe FAQ com a mesma pergunta e tópico
	 * @throws ConflictError se existir FAQ duplicada
	 */
	private async validateUniqueFAQ(
		question: string,
		topic: string,
	): Promise<void> {
		const allFAQs = await this.repository.findAll();
		const normalizedQuestion = question.trim().toLowerCase();
		const normalizedTopic = topic.trim().toLowerCase();

		const duplicate = allFAQs.find(
			(faq) =>
				faq.question.toLowerCase() === normalizedQuestion &&
				faq.topic.toLowerCase() === normalizedTopic,
		);

		if (duplicate) {
			throw new ConflictError(
				'A FAQ with the same question and topic already exists',
				{
					existingFAQId: duplicate.id,
					question: duplicate.question,
					topic: duplicate.topic,
				},
			);
		}
	}
}
