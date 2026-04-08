import { JsonRepository } from '../../src/repositories/json.repository';
import { promises as fs } from 'fs';
import path from 'path';

// Mock do file-lock
jest.mock('../../src/utils/file-lock', () => ({
	fileLock: {
		withLock: jest.fn((_filePath: string, operation: () => any) => operation()),
	},
}));

describe('JsonRepository', () => {
	let repository: JsonRepository<TestItem>;
	let testFilePath: string;

	interface TestItem {
		id: string;
		name: string;
		createdAt: string;
	}

	beforeEach(async () => {
		// Setup test file path
		testFilePath = path.join(process.cwd(), 'data', 'test-items.json');
		repository = new JsonRepository<TestItem>('test-items.json');

		// Create test data directory
		const dataDir = path.join(process.cwd(), 'data');
		try {
			await fs.mkdir(dataDir, { recursive: true });
		} catch (error) {
			// Directory may already exist
		}

		// Initialize empty test file
		await fs.writeFile(
			testFilePath,
			JSON.stringify({ 'test-items': [] }),
			'utf-8',
		);
	});

	afterEach(async () => {
		// Cleanup test file
		try {
			await fs.unlink(testFilePath);
		} catch (error) {
			// File may not exist
		}
	});

	describe('findAll', () => {
		it('should return empty array for empty repository', async () => {
			const items = await repository.findAll();
			expect(items).toEqual([]);
		});

		it('should return all items', async () => {
			const testItems: TestItem[] = [
				{ id: '1', name: 'Item 1', createdAt: '2024-01-01T00:00:00Z' },
				{ id: '2', name: 'Item 2', createdAt: '2024-01-02T00:00:00Z' },
			];

			await fs.writeFile(
				testFilePath,
				JSON.stringify({ 'test-items': testItems }),
				'utf-8',
			);

			const items = await repository.findAll();
			expect(items).toHaveLength(2);
			expect(items).toEqual(testItems);
		});
	});

	describe('findById', () => {
		it('should return null for non-existent id', async () => {
			const item = await repository.findById('non-existent');
			expect(item).toBeNull();
		});

		it('should return item by id', async () => {
			const testItem: TestItem = {
				id: '123',
				name: 'Test Item',
				createdAt: '2024-01-01T00:00:00Z',
			};

			await fs.writeFile(
				testFilePath,
				JSON.stringify({ 'test-items': [testItem] }),
				'utf-8',
			);

			const item = await repository.findById('123');
			expect(item).toEqual(testItem);
		});
	});

	describe('create', () => {
		it('should create new item', async () => {
			const newItem: TestItem = {
				id: '456',
				name: 'New Item',
				createdAt: '2024-01-01T00:00:00Z',
			};

			const created = await repository.create(newItem);
			expect(created).toEqual(newItem);

			// Verify it was written to file
			const items = await repository.findAll();
			expect(items).toHaveLength(1);
			expect(items[0]).toEqual(newItem);
		});
	});

	describe('update', () => {
		it('should return null for non-existent item', async () => {
			const updated = await repository.update('non-existent', {
				name: 'Updated',
			});
			expect(updated).toBeNull();
		});

		it('should update existing item', async () => {
			const testItem: TestItem = {
				id: '789',
				name: 'Original Name',
				createdAt: '2024-01-01T00:00:00Z',
			};

			await fs.writeFile(
				testFilePath,
				JSON.stringify({ 'test-items': [testItem] }),
				'utf-8',
			);

			const updated = await repository.update('789', { name: 'Updated Name' });
			expect(updated?.name).toBe('Updated Name');
			expect(updated?.id).toBe('789');
		});
	});

	describe('delete', () => {
		it('should return false for non-existent item', async () => {
			const deleted = await repository.delete('non-existent');
			expect(deleted).toBe(false);
		});

		it('should delete existing item', async () => {
			const testItem: TestItem = {
				id: 'to-delete',
				name: 'Will be deleted',
				createdAt: '2024-01-01T00:00:00Z',
			};

			await fs.writeFile(
				testFilePath,
				JSON.stringify({ 'test-items': [testItem] }),
				'utf-8',
			);

			const deleted = await repository.delete('to-delete');
			expect(deleted).toBe(true);

			const items = await repository.findAll();
			expect(items).toHaveLength(0);
		});
	});

	describe('findPaginated', () => {
		beforeEach(async () => {
			const testItems: TestItem[] = [
				{ id: '1', name: 'Item 1', createdAt: '2024-01-05T00:00:00Z' },
				{ id: '2', name: 'Item 2', createdAt: '2024-01-04T00:00:00Z' },
				{ id: '3', name: 'Item 3', createdAt: '2024-01-03T00:00:00Z' },
				{ id: '4', name: 'Item 4', createdAt: '2024-01-02T00:00:00Z' },
				{ id: '5', name: 'Item 5', createdAt: '2024-01-01T00:00:00Z' },
			];

			await fs.writeFile(
				testFilePath,
				JSON.stringify({ 'test-items': testItems }),
				'utf-8',
			);
		});

		it('should return first page', async () => {
			const result = await repository.findPaginated(undefined, 2);

			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe('1'); // Most recent
			expect(result.items[1].id).toBe('2');
			expect(result.hasMore).toBe(true);
			expect(result.nextCursor).toBe('2024-01-04T00:00:00Z');
		});

		it('should return paginated results with cursor', async () => {
			const result = await repository.findPaginated('2024-01-04T00:00:00Z', 2);

			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe('3');
			expect(result.items[1].id).toBe('4');
			expect(result.hasMore).toBe(true);
		});

		it('should indicate no more results on last page', async () => {
			const result = await repository.findPaginated('2024-01-02T00:00:00Z', 2);

			expect(result.items).toHaveLength(1);
			expect(result.items[0].id).toBe('5');
			expect(result.hasMore).toBe(false);
			expect(result.nextCursor).toBeNull();
		});

		it('should apply filter when provided', async () => {
			const result = await repository.findPaginated(
				undefined,
				10,
				(item) => item.name.includes('Item 2') || item.name.includes('Item 3'),
			);

			expect(result.items).toHaveLength(2);
			expect(result.items[0].id).toBe('2');
			expect(result.items[1].id).toBe('3');
		});
	});
});
