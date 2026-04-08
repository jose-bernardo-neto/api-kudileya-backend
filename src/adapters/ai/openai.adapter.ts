import OpenAI from 'openai';
import {
	AIProvider,
	AIProviderError,
	AIProviderConfig,
} from './ai-provider.interface.js';

/**
 * Adapter para OpenAI API
 * Implementa o padrão Adapter para integração com a API da OpenAI
 */
export class OpenAIAdapter implements AIProvider {
	private client: OpenAI | null = null;
	private model: string;
	private timeout: number;
	private maxTokens: number;

	constructor(private config: AIProviderConfig) {
		this.model = config.model || 'gpt-3.5-turbo';
		this.timeout = config.timeout || 30000;
		this.maxTokens = config.maxTokens || 1000;

		if (config.apiKey) {
			this.client = new OpenAI({
				apiKey: config.apiKey,
				timeout: this.timeout,
			});
		}
	}

	/**
	 * Envia uma pergunta para o OpenAI e retorna a resposta
	 */
	async ask(question: string): Promise<string> {
		if (!this.client) {
			throw new AIProviderError(
				'OpenAI API key not configured',
				this.getProviderName(),
			);
		}

		try {
			const completion = await this.client.chat.completions.create({
				model: this.model,
				messages: [
					{
						role: 'user',
						content: question,
					},
				],
				max_tokens: this.maxTokens,
				temperature: 0.7,
			});

			const response = completion.choices[0]?.message?.content;

			if (!response) {
				throw new AIProviderError(
					'Empty response from OpenAI',
					this.getProviderName(),
				);
			}

			return response;
		} catch (error) {
			if (error instanceof AIProviderError) {
				throw error;
			}

			// Tratamento específico para erros da OpenAI
			if (error instanceof OpenAI.APIError) {
				throw new AIProviderError(
					`OpenAI API Error: ${error.message} (Status: ${error.status})`,
					this.getProviderName(),
					error,
				);
			}

			throw new AIProviderError(
				`Failed to get response from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`,
				this.getProviderName(),
				error,
			);
		}
	}

	/**
	 * Verifica se o provedor está configurado e disponível
	 */
	async isAvailable(): Promise<boolean> {
		if (!this.client || !this.config.apiKey) {
			return false;
		}

		try {
			// Tenta fazer uma chamada simples para verificar disponibilidade
			await this.client.chat.completions.create({
				model: this.model,
				messages: [{ role: 'user', content: 'test' }],
				max_tokens: 5,
			});
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Retorna o nome do provedor
	 */
	getProviderName(): string {
		return 'openai';
	}
}
