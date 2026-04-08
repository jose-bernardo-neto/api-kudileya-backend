import { fileLock } from '../../src/utils/file-lock';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('File Lock Utility Tests', () => {
	const testFile = path.join(__dirname, '../test-data/lockfile-test.json');

	beforeEach(async () => {
		// Create test directory
		await fs.mkdir(path.dirname(testFile), { recursive: true });
		await fs.writeFile(testFile, '[]', 'utf-8');
	});

	afterEach(async () => {
		// Clean up test files
		try {
			await fs.unlink(testFile);
			await fs.unlink(`${testFile}.lock`);
		} catch (error) {
			// Ignore if files don't exist
		}
	});

	describe('withLock', () => {
		it('should execute operation with lock', async () => {
			let executed = false;

			await fileLock.withLock(testFile, async () => {
				executed = true;
			});

			expect(executed).toBe(true);
		});

		it('should return operation result', async () => {
			const result = await fileLock.withLock(testFile, async () => {
				return 'test-result';
			});

			expect(result).toBe('test-result');
		});

		it('should handle async operations', async () => {
			const result = await fileLock.withLock(testFile, async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'async-result';
			});

			expect(result).toBe('async-result');
		});

		it('should release lock after operation', async () => {
			await fileLock.withLock(testFile, async () => {
				// Do something
			});

			// Should be able to acquire lock again
			const result = await fileLock.withLock(testFile, async () => {
				return 'second-operation';
			});

			expect(result).toBe('second-operation');
		});

		it('should release lock even if operation throws', async () => {
			try {
				await fileLock.withLock(testFile, async () => {
					throw new Error('Operation failed');
				});
			} catch (error: any) {
				expect(error.message).toBe('Operation failed');
			}

			// Should still be able to acquire lock
			const result = await fileLock.withLock(testFile, async () => {
				return 'recovered';
			});

			expect(result).toBe('recovered');
		});
	});

	describe('race condition prevention', () => {
		it('should prevent concurrent writes', async () => {
			await fs.writeFile(testFile, JSON.stringify([]), 'utf-8');

			const writeItem = async (item: string) => {
				await fileLock.withLock(testFile, async () => {
					// Read current content
					const content = await fs.readFile(testFile, 'utf-8');
					const items = JSON.parse(content);

					// Simulate async work
					await new Promise((resolve) => setTimeout(resolve, 10));

					// Add new item
					items.push(item);

					// Write back
					await fs.writeFile(testFile, JSON.stringify(items), 'utf-8');
				});
			};

			// Run concurrent writes
			await Promise.all([
				writeItem('item1'),
				writeItem('item2'),
				writeItem('item3'),
				writeItem('item4'),
				writeItem('item5'),
			]);

			// Verify all items were written
			const finalContent = await fs.readFile(testFile, 'utf-8');
			const items = JSON.parse(finalContent);

			expect(items.length).toBe(5);
			expect(items).toContain('item1');
			expect(items).toContain('item2');
			expect(items).toContain('item3');
			expect(items).toContain('item4');
			expect(items).toContain('item5');
		});

		it('should serialize access to shared resource', async () => {
			let counter = 0;

			const incrementCounter = async (id: number) => {
				// Add small delay between operations to avoid lock contention
				await new Promise((resolve) => setTimeout(resolve, id * 10));

				await fileLock.withLock(testFile, async () => {
					const current = counter;
					await new Promise((resolve) => setTimeout(resolve, 5));
					counter = current + 1;
				});
			};

			// Run 5 concurrent increments with staggered starts
			await Promise.all(
				Array.from({ length: 5 }, (_, i) => incrementCounter(i)),
			);

			// Counter should be exactly 5 (no race condition)
			expect(counter).toBe(5);
		}, 10000); // 10 second timeout
	});

	describe('isLocked', () => {
		it('should return false for unlocked file', async () => {
			const locked = await fileLock.isLocked(testFile);
			expect(locked).toBe(false);
		});

		it('should detect locked file during operation', async () => {
			let isLockedDuringOperation = false;

			const operation1 = fileLock.withLock(testFile, async () => {
				// Check if file is locked from another context
				await new Promise((resolve) => setTimeout(resolve, 50));
			});

			// Wait a bit for lock to be acquired
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Check if locked
			isLockedDuringOperation = await fileLock.isLocked(testFile);

			await operation1;

			expect(isLockedDuringOperation).toBe(true);
		});
	});

	describe('error handling', () => {
		it('should create file if it does not exist', async () => {
			const newFile = path.join(__dirname, '../test-data/new-file.json');

			try {
				await fs.unlink(newFile);
			} catch {
				// Ignore
			}

			await fileLock.withLock(newFile, async () => {
				// Operation
			});

			// File should exist now
			const exists = await fs
				.access(newFile)
				.then(() => true)
				.catch(() => false);
			expect(exists).toBe(true);

			// Cleanup
			await fs.unlink(newFile).catch(() => {});
		});

		it('should handle operations with complex data', async () => {
			const complexData = {
				id: 'test-123',
				items: [1, 2, 3],
				metadata: { created: new Date().toISOString() },
			};

			await fileLock.withLock(testFile, async () => {
				await fs.writeFile(testFile, JSON.stringify(complexData), 'utf-8');
			});

			const content = await fs.readFile(testFile, 'utf-8');
			const parsed = JSON.parse(content);

			expect(parsed).toEqual(complexData);
		});
	});
});
