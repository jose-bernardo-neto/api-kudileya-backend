import { MockAdapter } from '../../src/adapters/ai/mock.adapter';

describe('MockAdapter', () => {
	let mockAdapter: MockAdapter;

	beforeEach(() => {
		mockAdapter = new MockAdapter({ delay: 0 });
	});

	describe('ask', () => {
		it('should return a mock response', async () => {
			const question = 'How do I reset my password?';
			const response = await mockAdapter.ask(question);

			expect(response).toBeDefined();
			expect(typeof response).toBe('string');
			expect(response.length).toBeGreaterThan(0);
		});

		it('should return password-related response for password questions', async () => {
			const question = 'How do I reset my password?';
			const response = await mockAdapter.ask(question);

			expect(response.toLowerCase()).toMatch(/password|senha/);
		});

		it('should return login-related response for login questions', async () => {
			const question = 'How do I login?';
			const response = await mockAdapter.ask(question);

			expect(response.toLowerCase()).toContain('login');
		});

		it('should throw error when configured to fail', async () => {
			const failingAdapter = new MockAdapter({ shouldFail: true, delay: 0 });

			await expect(failingAdapter.ask('test question')).rejects.toThrow();
		});

		it('should handle empty questions gracefully', async () => {
			const response = await mockAdapter.ask('');

			expect(response).toBeDefined();
			expect(typeof response).toBe('string');
		});

		it('should simulate delay when configured', async () => {
			const delayAdapter = new MockAdapter({ delay: 50 });
			const start = Date.now();

			await delayAdapter.ask('test');

			const elapsed = Date.now() - start;
			expect(elapsed).toBeGreaterThanOrEqual(50);
		});
	});

	describe('isAvailable', () => {
		it('should always return true', async () => {
			const isAvailable = await mockAdapter.isAvailable();

			expect(isAvailable).toBe(true);
		});
	});

	describe('getProviderName', () => {
		it('should return "mock"', () => {
			const name = mockAdapter.getProviderName();

			expect(name).toBe('mock');
		});
	});

	describe('setShouldFail', () => {
		it('should toggle failure mode', async () => {
			mockAdapter.setShouldFail(true);
			await expect(mockAdapter.ask('test')).rejects.toThrow();

			mockAdapter.setShouldFail(false);
			const response = await mockAdapter.ask('test');
			expect(response).toBeDefined();
		});
	});
});
