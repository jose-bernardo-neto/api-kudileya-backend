import { AIProvider, AIProviderConfig } from './ai-provider.interface.js';
import { GeminiAdapter } from './gemini.adapter.js';
import { OpenAIAdapter } from './openai.adapter.js';
import { OpenRouterAdapter } from './openrouter.adapter.js';
import { GrokAdapter } from './grok.adapter.js';
import { MockAdapter } from './mock.adapter.js';
import { config } from '../../config/env.js';

/**
 * Tipos de provedores suportados
 */
export type AIProviderType =
	| 'gemini'
	| 'openai'
	| 'openrouter'
	| 'grok'
	| 'mock';

/**
 * Factory para criar instâncias de AIProvider
 * Implementa o padrão Factory e segue o Dependency Inversion Principle
 *
 * Benefícios:
 * - Centraliza a lógica de criação de providers
 * - Facilita a adição de novos providers (Open/Closed Principle)
 * - Permite injeção de dependência de providers
 */
export class AIAdapterFactory {
	/**
	 * Cria uma instância de AIProvider baseado no tipo
	 * @param type - Tipo do provider (gemini, openai, openrouter, grok, mock)
	 * @param customConfig - Configuração customizada (opcional)
	 * @returns Instância do AIProvider
	 * @throws Error se o tipo não for suportado
	 */
	static create(
		type: AIProviderType = config.ai.provider as AIProviderType,
		customConfig?: Partial<AIProviderConfig>,
	): AIProvider {
		const providerConfig = this.getProviderConfig(type, customConfig);

		switch (type) {
			case 'gemini':
				return new GeminiAdapter(providerConfig);

			case 'openai':
				return new OpenAIAdapter(providerConfig);

			case 'openrouter':
				return new OpenRouterAdapter(providerConfig);

			case 'grok':
				return new GrokAdapter(providerConfig);

			case 'mock':
				return new MockAdapter(providerConfig);

			default:
				// TypeScript garante exhaustiveness check
				const exhaustiveCheck: never = type;
				throw new Error(`Unsupported AI provider type: ${exhaustiveCheck}`);
		}
	}

	/**
	 * Cria o provider configurado no ambiente
	 * @returns Instância do AIProvider configurado
	 */
	static createFromEnv(): AIProvider {
		return this.create(config.ai.provider as AIProviderType);
	}

	/**
	 * Obtém a configuração para um provider específico
	 */
	private static getProviderConfig(
		type: AIProviderType,
		customConfig?: Partial<AIProviderConfig>,
	): AIProviderConfig {
		const baseConfig: AIProviderConfig = {
			timeout: config.ai.timeout,
			maxTokens: config.ai.maxTokens,
			systemPrompt: config.ai.systemPrompt,
			...customConfig,
		};

		switch (type) {
			case 'gemini':
				return {
					...baseConfig,
					apiKey: customConfig?.apiKey || config.ai.gemini.apiKey,
					model: customConfig?.model || config.ai.gemini.model,
				};

			case 'openai':
				return {
					...baseConfig,
					apiKey: customConfig?.apiKey || config.ai.openai.apiKey,
					model: customConfig?.model || config.ai.openai.model,
				};

			case 'openrouter':
				return {
					...baseConfig,
					apiKey: customConfig?.apiKey || config.ai.openrouter.apiKey,
					model: customConfig?.model || config.ai.openrouter.model,
				};

			case 'grok':
				return {
					...baseConfig,
					apiKey: customConfig?.apiKey || config.ai.grok.apiKey,
					model: customConfig?.model || config.ai.grok.model,
				};

			case 'mock':
				return baseConfig;

			default:
				return baseConfig;
		}
	}

	/**
	 * Valida se um provider está configurado corretamente
	 * @param type - Tipo do provider
	 * @returns true se o provider está configurado
	 */
	static isProviderConfigured(type: AIProviderType): boolean {
		switch (type) {
			case 'gemini':
				return !!config.ai.gemini.apiKey;

			case 'openai':
				return !!config.ai.openai.apiKey;

			case 'openrouter':
				return !!config.ai.openrouter.apiKey;

			case 'grok':
				return !!config.ai.grok.apiKey;

			case 'mock':
				return true; // Mock sempre está disponível

			default:
				return false;
		}
	}

	/**
	 * Lista todos os providers disponíveis e configurados
	 * @returns Array de providers configurados
	 */
	static getAvailableProviders(): AIProviderType[] {
		const providers: AIProviderType[] = [
			'gemini',
			'openai',
			'openrouter',
			'grok',
			'mock',
		];
		return providers.filter((provider) => this.isProviderConfigured(provider));
	}
}
