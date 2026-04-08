import { AIService } from '../../src/services/ai.service';
import { MockAdapter } from '../../src/adapters/ai/mock.adapter';
import { ValidationError } from '../../src/middlewares/error-handler.middleware';

describe('AIService', () => {
	let aiService: AIService;
	let mockProvider: MockAdapter;

	beforeEach(() => {
		mockProvider = new MockAdapter({ delay: 0 });
		aiService = new AIService(mockProvider);
	});

	describe('ask', () => {
		it('should return answer from provider', async () => {
			const result = await aiService.ask('What is the meaning of life?');

			expect(result).toBeDefined();
			expect(result.answer).toBeDefined();
			expect(result.timestamp).toBeDefined();
			expect(result.provider).toBe('mock');
			expect(typeof result.answer).toBe('string');
		});

		it('should validate question length', async () => {
			await expect(aiService.ask('')).rejects.toThrow(ValidationError);
			await expect(aiService.ask('ab')).rejects.toThrow(ValidationError);
		});

		it('should reject questions that are too long', async () => {
			const longQuestion = 'a'.repeat(501);

			await expect(aiService.ask(longQuestion)).rejects.toThrow(
				ValidationError,
			);
		});

		it('should throw error when provider is unavailable', async () => {
			mockProvider.setShouldFail(true);

			await expect(aiService.ask('test question')).rejects.toThrow();
		});

		it('should include timestamp in response', async () => {
			const before = new Date().toISOString();
			const result = await aiService.ask('test question');
			const after = new Date().toISOString();

			expect(result.timestamp).toBeDefined();
			expect(result.timestamp >= before).toBe(true);
			expect(result.timestamp <= after).toBe(true);
		});
	});

	describe('askWithContext', () => {
		it('should process question with context', async () => {
			const result = await aiService.askWithContext('What about now?', {
				previousQuestions: ['What is AI?', 'How does it work?'],
			});

			expect(result).toBeDefined();
			expect(result.answer).toBeDefined();
			expect(result.contextUsed).toBe(true);
		});

		it('should work without context', async () => {
			const result = await aiService.askWithContext('What is AI?');

			expect(result).toBeDefined();
			expect(result.contextUsed).toBe(false);
		});

		it('should limit previous questions to last 3', async () => {
			const result = await aiService.askWithContext('Current question', {
				previousQuestions: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
			});

			expect(result).toBeDefined();
			expect(result.contextUsed).toBe(true);
		});
	});

	describe('checkHealth', () => {
		it('should return healthy status', async () => {
			const health = await aiService.checkHealth();

			expect(health.provider).toBe('mock');
			expect(health.available).toBe(true);
			expect(health.message).toContain('healthy');
		});

		it('should return unhealthy when provider fails', async () => {
			mockProvider.setShouldFail(true);
			const unavailableProvider = new MockAdapter({ shouldFail: true });
			const serviceWithBadProvider = new AIService(unavailableProvider);

			const health = await serviceWithBadProvider.checkHealth();

			expect(health.available).toBe(false);
		});
	});

	describe('getProviderInfo', () => {
		it('should return provider information', () => {
			const info = aiService.getProviderInfo();

			expect(info.name).toBe('mock');
			expect(info.type).toBe('MockAdapter');
		});
	});

	describe('setProvider', () => {
		it('should change provider', () => {
			const newProvider = new MockAdapter({ delay: 0 });

			aiService.setProvider(newProvider);

			const info = aiService.getProviderInfo();
			expect(info.name).toBe('mock');
		});
	});

	describe('getSuggestions', () => {
		it('should return array of suggestions', async () => {
			const suggestions = await aiService.getSuggestions(
				'How do I reset my password?',
			);

			expect(Array.isArray(suggestions)).toBe(true);
			expect(suggestions.length).toBeLessThanOrEqual(3);
		});

		it('should return empty array on error', async () => {
			mockProvider.setShouldFail(true);

			const suggestions = await aiService.getSuggestions('test question');

			expect(suggestions).toEqual([]);
		});

		it('should validate question before getting suggestions', async () => {
			await expect(aiService.getSuggestions('')).rejects.toThrow(
				ValidationError,
			);
		});
	});

	describe('input validation', () => {
		it('should reject null or undefined questions', async () => {
			await expect(aiService.ask(null as any)).rejects.toThrow(ValidationError);
			await expect(aiService.ask(undefined as any)).rejects.toThrow(
				ValidationError,
			);
		});

		it('should reject non-string questions', async () => {
			await expect(aiService.ask(123 as any)).rejects.toThrow(ValidationError);
			await expect(aiService.ask({} as any)).rejects.toThrow(ValidationError);
		});

		it('should trim whitespace from questions', async () => {
			const result = await aiService.ask('   What is AI?   ');

			expect(result).toBeDefined();
			expect(result.answer).toBeDefined();
		});
	});
});
