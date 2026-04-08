import { cache } from '../../src/utils/cache';

describe('Cache Utility Tests', () => {
	beforeEach(() => {
		// Clear cache before each test
		cache.flush();
	});

	afterEach(() => {
		cache.flush();
	});

	describe('get', () => {
		it('should return undefined for non-existent key', () => {
			const result = cache.get('non-existent');
			expect(result).toBeUndefined();
		});

		it('should return value for existing key', () => {
			cache.set('test-key', 'test-value');
			const result = cache.get('test-key');
			expect(result).toBe('test-value');
		});

		it('should return undefined for expired key', (done: any) => {
			cache.set('expiring-key', 'value', 1); // 1 second TTL

			setTimeout(() => {
				const result = cache.get('expiring-key');
				expect(result).toBeUndefined();
				done();
			}, 1100);
		});
	});

	describe('set', () => {
		it('should set value with default TTL', () => {
			const success = cache.set('key1', 'value1');
			expect(success).toBe(true);
			expect(cache.get('key1')).toBe('value1');
		});

		it('should set value with custom TTL', () => {
			const success = cache.set('key2', 'value2', 10);
			expect(success).toBe(true);
			expect(cache.get('key2')).toBe('value2');
		});

		it('should overwrite existing value', () => {
			cache.set('key3', 'old-value');
			cache.set('key3', 'new-value');
			expect(cache.get('key3')).toBe('new-value');
		});

		it('should handle complex objects', () => {
			const obj = { name: 'John', age: 30, tags: ['admin', 'user'] };
			cache.set('complex', obj);
			expect(cache.get('complex')).toEqual(obj);
		});
	});

	describe('del', () => {
		it('should delete existing key', () => {
			cache.set('to-delete', 'value');
			const count = cache.del('to-delete');
			expect(count).toBe(1);
			expect(cache.get('to-delete')).toBeUndefined();
		});

		it('should return 0 for non-existent key', () => {
			const count = cache.del('non-existent');
			expect(count).toBe(0);
		});

		it('should delete multiple keys with delMany', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.set('key3', 'value3');

			const count = cache.delMany(['key1', 'key2']);
			expect(count).toBe(2);
			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBeUndefined();
			expect(cache.get('key3')).toBe('value3');
		});
	});

	describe('has', () => {
		it('should return true for existing key', () => {
			cache.set('exists', 'value');
			expect(cache.has('exists')).toBe(true);
		});

		it('should return false for non-existent key', () => {
			expect(cache.has('does-not-exist')).toBe(false);
		});

		it('should return false for expired key', (done: any) => {
			cache.set('expiring', 'value', 1);

			setTimeout(() => {
				expect(cache.has('expiring')).toBe(false);
				done();
			}, 1100);
		});
	});

	describe('flushAll', () => {
		it('should delete all keys', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.set('key3', 'value3');

			cache.flush();

			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBeUndefined();
			expect(cache.get('key3')).toBeUndefined();
		});
	});

	describe('delByPrefix', () => {
		it('should delete keys by prefix', () => {
			cache.set('faqs:list:page1', 'data1');
			cache.set('faqs:list:page2', 'data2');
			cache.set('faqs:123', 'data3');
			cache.set('docs:list', 'data4');

			// Delete all FAQ list caches
			cache.delByPrefix('faqs:list');

			expect(cache.get('faqs:list:page1')).toBeUndefined();
			expect(cache.get('faqs:list:page2')).toBeUndefined();
			expect(cache.get('faqs:123')).toBe('data3');
			expect(cache.get('docs:list')).toBe('data4');
		});
	});

	describe('getOrSet', () => {
		it('should return cached value if exists', async () => {
			cache.set('key', 'cached-value');

			const fn = jest.fn().mockResolvedValue('new-value');
			const result = await cache.getOrSet('key', fn);

			expect(result).toBe('cached-value');
			expect(fn).not.toHaveBeenCalled();
		});

		it('should execute function and cache if not exists', async () => {
			const fn = jest.fn().mockResolvedValue('computed-value');
			const result = await cache.getOrSet('new-key', fn);

			expect(result).toBe('computed-value');
			expect(fn).toHaveBeenCalledTimes(1);
			expect(cache.get('new-key')).toBe('computed-value');
		});
	});

	describe('cache invalidation patterns', () => {
		it('should invalidate related keys by prefix pattern', () => {
			cache.set('faqs:list:page1', 'data1');
			cache.set('faqs:list:page2', 'data2');
			cache.set('faqs:123', 'data3');
			cache.set('docs:list', 'data4');

			// Delete all FAQ list caches using prefix
			cache.delByPrefix('faqs:list');

			expect(cache.get('faqs:list:page1')).toBeUndefined();
			expect(cache.get('faqs:list:page2')).toBeUndefined();
			expect(cache.get('faqs:123')).toBe('data3');
			expect(cache.get('docs:list')).toBe('data4');
		});

		it('should support specific prefix invalidation', () => {
			cache.set('v1:users:1', 'user1');
			cache.set('v1:users:2', 'user2');
			cache.set('v1:posts:1', 'post1');

			// Invalidate all user caches
			cache.delByPrefix('v1:users');

			expect(cache.get('v1:users:1')).toBeUndefined();
			expect(cache.get('v1:users:2')).toBeUndefined();
			expect(cache.get('v1:posts:1')).toBe('post1');
		});
	});

	describe('concurrent access', () => {
		it('should handle concurrent reads', () => {
			cache.set('shared', 'value');

			const reads = Array.from({ length: 100 }, () => cache.get('shared'));

			expect(reads.every((val) => val === 'value')).toBe(true);
		});

		it('should handle concurrent writes', () => {
			const writes = Array.from({ length: 100 }, (_, i) => {
				cache.set(`key${i}`, `value${i}`);
				return cache.get(`key${i}`);
			});

			expect(writes.every((val, i) => val === `value${i}`)).toBe(true);
		});
	});
});
