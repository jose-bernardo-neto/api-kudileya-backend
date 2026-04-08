import lockfile from 'proper-lockfile';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Utilitário para gerenciar locks de arquivo
 */
export class FileLock {
	private lockOptions = {
		stale: 10000, // 10 segundos
		retries: {
			retries: 5,
			minTimeout: 100,
			maxTimeout: 1000,
		},
	};

	/**
	 * Executa uma operação com lock no arquivo
	 */
	async withLock<T>(filePath: string, operation: () => Promise<T>): Promise<T> {
		// Garante que o diretório existe
		await this.ensureDir(filePath);

		// Garante que o arquivo existe
		await this.ensureFile(filePath);

		let release: (() => Promise<void>) | null = null;

		try {
			// Adquire o lock
			release = await lockfile.lock(filePath, this.lockOptions);

			// Executa a operação
			const result = await operation();

			return result;
		} finally {
			// Libera o lock
			if (release) {
				await release();
			}
		}
	}

	/**
	 * Garante que o diretório existe
	 */
	private async ensureDir(filePath: string): Promise<void> {
		const dir = path.dirname(filePath);
		try {
			await fs.access(dir);
		} catch {
			await fs.mkdir(dir, { recursive: true });
		}
	}

	/**
	 * Garante que o arquivo existe
	 */
	private async ensureFile(filePath: string): Promise<void> {
		try {
			await fs.access(filePath);
		} catch {
			// Se o arquivo não existe, cria com conteúdo vazio baseado na extensão
			const ext = path.extname(filePath);
			const defaultContent = ext === '.json' ? '{}' : '';
			await fs.writeFile(filePath, defaultContent, 'utf-8');
		}
	}

	/**
	 * Verifica se um arquivo está locked
	 */
	async isLocked(filePath: string): Promise<boolean> {
		try {
			return await lockfile.check(filePath);
		} catch {
			return false;
		}
	}
}

// Instância singleton
export const fileLock = new FileLock();
