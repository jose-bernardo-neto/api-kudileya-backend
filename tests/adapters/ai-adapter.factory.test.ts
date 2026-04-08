import { AIAdapterFactory } from '../../src/adapters/ai/ai-adapter.factory';
import { MockAdapter } from '../../src/adapters/ai/mock.adapter';
import { GeminiAdapter } from '../../src/adapters/ai/gemini.adapter';
import { OpenAIAdapter } from '../../src/adapters/ai/openai.adapter';

describe('AIAdapterFactory', () => {
	describe('create', () => {
		it('should create MockAdapter when type is "mock"', () => {
			const adapter = AIAdapterFactory.create('mock');

			expect(adapter).toBeInstanceOf(MockAdapter);
			expect(adapter.getProviderName()).toBe('mock');
		});

		it('should create GeminiAdapter when type is "gemini"', () => {
			const adapter = AIAdapterFactory.create('gemini', { apiKey: 'test-key' });

			expect(adapter).toBeInstanceOf(GeminiAdapter);
			expect(adapter.getProviderName()).toBe('gemini');
		});

		it('should create OpenAIAdapter when type is "openai"', () => {
			const adapter = AIAdapterFactory.create('openai', { apiKey: 'test-key' });

			expect(adapter).toBeInstanceOf(OpenAIAdapter);
			expect(adapter.getProviderName()).toBe('openai');
		});

		it('should apply custom config', () => {
			const customConfig = {
				timeout: 5000,
				maxTokens: 500,
			};

			const adapter = AIAdapterFactory.create('mock', customConfig);

			expect(adapter).toBeInstanceOf(MockAdapter);
		});

		it('should throw error for unsupported provider type', () => {
			expect(() => {
				AIAdapterFactory.create('invalid' as any);
			}).toThrow();
		});
	});

	describe('isProviderConfigured', () => {
		it('should return true for mock provider', () => {
			const isConfigured = AIAdapterFactory.isProviderConfigured('mock');

			expect(isConfigured).toBe(true);
		});

		it('should check configuration for gemini', () => {
			const isConfigured = AIAdapterFactory.isProviderConfigured('gemini');

			expect(typeof isConfigured).toBe('boolean');
		});

		it('should check configuration for openai', () => {
			const isConfigured = AIAdapterFactory.isProviderConfigured('openai');

			expect(typeof isConfigured).toBe('boolean');
		});
	});

	describe('getAvailableProviders', () => {
		it('should return array of available providers', () => {
			const providers = AIAdapterFactory.getAvailableProviders();

			expect(Array.isArray(providers)).toBe(true);
			expect(providers.length).toBeGreaterThan(0);
			expect(providers).toContain('mock');
		});
	});
});
