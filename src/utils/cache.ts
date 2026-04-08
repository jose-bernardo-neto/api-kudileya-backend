import NodeCache from 'node-cache';
import { config } from '../config/env.js';

/**
 * Wrapper para node-cache com configuração padronizada
 */
class CacheManager {
	private cache: NodeCache;

	constructor(ttlSeconds: number = config.cache.ttl) {
		this.cache = new NodeCache({
			stdTTL: ttlSeconds,
			checkperiod: ttlSeconds * 0.2,
			useClones: false,
		});
	}

	/**
	 * Obtém um valor do cache
	 */
	get<T>(key: string): T | undefined {
		return this.cache.get<T>(key);
	}

	/**
	 * Define um valor no cache
	 */
	set<T>(key: string, value: T, ttl?: number): boolean {
		if (ttl !== undefined) {
			return this.cache.set(key, value, ttl);
		}
		return this.cache.set(key, value);
	}

	/**
	 * Remove um valor do cache
	 */
	del(key: string): number {
		return this.cache.del(key);
	}

	/**
	 * Remove múltiplas chaves do cache
	 */
	delMany(keys: string[]): number {
		return this.cache.del(keys);
	}

	/**
	 * Remove todas as chaves que começam com um prefixo
	 */
	delByPrefix(prefix: string): number {
		const keys = this.cache.keys().filter((key) => key.startsWith(prefix));
		return this.cache.del(keys);
	}

	/**
	 * Limpa todo o cache
	 */
	flush(): void {
		this.cache.flushAll();
	}

	/**
	 * Verifica se uma chave existe no cache
	 */
	has(key: string): boolean {
		return this.cache.has(key);
	}

	/**
	 * Obtém ou define um valor no cache
	 * Se a chave não existir, executa a função e armazena o resultado
	 */
	async getOrSet<T>(
		key: string,
		fn: () => Promise<T>,
		ttl?: number,
	): Promise<T> {
		const cached = this.get<T>(key);
		if (cached !== undefined) {
			return cached;
		}

		const value = await fn();
		this.set(key, value, ttl);
		return value;
	}
}

// Instância singleton
export const cache = new CacheManager();
