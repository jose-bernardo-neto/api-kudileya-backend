import { promises as fs } from 'fs';
import path from 'path';
import { fileLock } from '../utils/file-lock.js';

/**
 * Repositório genérico para persistência em JSON
 */
export class JsonRepository<T extends { createdAt: string }> {
	private filePath: string;

	constructor(filename: string) {
		this.filePath = path.join(process.cwd(), 'data', filename);
	}

	/**
	 * Lê todos os itens do arquivo JSON
	 */
	async findAll(): Promise<T[]> {
		return fileLock.withLock(this.filePath, async () => {
			try {
				const content = await fs.readFile(this.filePath, 'utf-8');
				const data = JSON.parse(content);

				// Assume que a estrutura é { [key]: T[] }
				const key = Object.keys(data)[0];
				return data[key] || [];
			} catch (error) {
				// Se erro de parse ou arquivo vazio, retorna array vazio
				return [];
			}
		});
	}

	/**
	 * Lista itens com paginação por timestamp
	 * @param cursor - ISO-8601 timestamp para iniciar a paginação
	 * @param limit - Número máximo de itens a retornar
	 * @param filter - Função de filtro opcional
	 */
	async findPaginated(
		cursor: string | undefined,
		limit: number,
		filter?: (item: T) => boolean,
	): Promise<{ items: T[]; nextCursor: string | null; hasMore: boolean }> {
		const allItems = await this.findAll();

		// Ordena por createdAt DESC (mais recentes primeiro)
		let sortedItems = allItems.sort(
			(a, b) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		// Aplica filtro se fornecido
		if (filter) {
			sortedItems = sortedItems.filter(filter);
		}

		// Se há cursor, pega apenas itens mais antigos que o cursor
		if (cursor) {
			const cursorTime = new Date(cursor).getTime();
			sortedItems = sortedItems.filter(
				(item) => new Date(item.createdAt).getTime() < cursorTime,
			);
		}

		// Pega limit + 1 para verificar se há mais itens
		const items = sortedItems.slice(0, limit + 1);
		const hasMore = items.length > limit;

		// Remove o item extra se houver
		const resultItems = hasMore ? items.slice(0, limit) : items;

		// Define o próximo cursor como o createdAt do último item
		const nextCursor =
			hasMore && resultItems.length > 0
				? resultItems[resultItems.length - 1].createdAt
				: null;

		return {
			items: resultItems,
			nextCursor,
			hasMore,
		};
	}

	/**
	 * Busca um item por ID
	 */
	async findById(id: string): Promise<T | null> {
		const items = await this.findAll();
		const item = items.find((item: any) => item.id === id);
		return item || null;
	}

	/**
	 * Cria um novo item
	 */
	async create(item: T): Promise<T> {
		return fileLock.withLock(this.filePath, async () => {
			const content = await fs.readFile(this.filePath, 'utf-8');
			const data = JSON.parse(content);

			const key = Object.keys(data)[0] || this.getDefaultKey();
			if (!data[key]) {
				data[key] = [];
			}

			data[key].push(item);

			await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');

			return item;
		});
	}

	/**
	 * Atualiza um item existente
	 */
	async update(id: string, updates: Partial<T>): Promise<T | null> {
		return fileLock.withLock(this.filePath, async () => {
			const content = await fs.readFile(this.filePath, 'utf-8');
			const data = JSON.parse(content);

			const key = Object.keys(data)[0];
			if (!data[key]) {
				return null;
			}

			const index = data[key].findIndex((item: any) => item.id === id);
			if (index === -1) {
				return null;
			}

			data[key][index] = { ...data[key][index], ...updates };

			await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');

			return data[key][index];
		});
	}

	/**
	 * Remove um item
	 */
	async delete(id: string): Promise<boolean> {
		return fileLock.withLock(this.filePath, async () => {
			const content = await fs.readFile(this.filePath, 'utf-8');
			const data = JSON.parse(content);

			const key = Object.keys(data)[0];
			if (!data[key]) {
				return false;
			}

			const initialLength = data[key].length;
			data[key] = data[key].filter((item: any) => item.id !== id);

			if (data[key].length === initialLength) {
				return false;
			}

			await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf-8');

			return true;
		});
	}

	/**
	 * Retorna a chave padrão baseada no nome do arquivo
	 */
	private getDefaultKey(): string {
		const filename = path.basename(this.filePath, '.json');
		return filename;
	}
}
