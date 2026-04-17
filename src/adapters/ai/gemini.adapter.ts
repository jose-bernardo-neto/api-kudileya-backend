import { GoogleGenerativeAI } from '@google/generative-ai';
import {
	AIProvider,
	AIProviderError,
	AIProviderConfig,
} from './ai-provider.interface.js';

/**
 * Adapter para Google Gemini AI
 * Implementa o padrão Adapter para integração com a API do Gemini
 */
export class GeminiAdapter implements AIProvider {
	private client: GoogleGenerativeAI | null = null;
	private model: string;
	private timeout: number;
	private maxTokens: number;

	constructor(private config: AIProviderConfig) {
		this.model = config.model || 'gemini-pro';
		this.timeout = config.timeout || 30000;
		this.maxTokens = config.maxTokens || 1000;

		if (config.apiKey) {
			this.client = new GoogleGenerativeAI(config.apiKey);
			// Log da chave mascarada para debug
			const maskedKey = this.maskApiKey(config.apiKey);
			console.log(
				`[Gemini] Initialized with API Key: ${maskedKey}, Model: ${this.model}`,
			);
		} else {
			console.warn(
				'[Gemini] No API Key provided - provider will not be available',
			);
		}
	}

	/**
	 * Envia uma pergunta para o Gemini e retorna a resposta
	 */
	async ask(question: string): Promise<string> {
		if (!this.client) {
			throw new AIProviderError(
				'Gemini API key not configured',
				this.getProviderName(),
			);
		}

		try {
			const model = this.client.getGenerativeModel({ model: this.model });

			// Cria uma promise com timeout
			const response = await this.withTimeout(
				model.generateContent({
					contents: [{ role: 'user', parts: [{ text: question }] }],
					generationConfig: {
						maxOutputTokens: this.maxTokens,
					},
				}),
				this.timeout,
			);

			const result = await response.response;
			const text = result.text();

			if (!text) {
				throw new AIProviderError(
					'Empty response from Gemini',
					this.getProviderName(),
				);
			}

			return text;
		} catch (error) {
			if (error instanceof AIProviderError) {
				throw error;
			}

			throw new AIProviderError(
				`Failed to get response from Gemini: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
			const model = this.client.getGenerativeModel({ model: this.model });
			await this.withTimeout(
				model.generateContent({
					contents: [{ role: 'user', parts: [{ text: 'test' }] }],
				}),
				5000, // Timeout menor para check de disponibilidade
			);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Retorna o nome do provedor
	 */
	getProviderName(): string {
		return 'gemini';
	}

	/**
	 * Mascara a API key para logging seguro
	 */
	private maskApiKey(key: string): string {
		if (!key || key.length < 10) {
			return '****';
		}
		return `${key.slice(0, 6)}...${key.slice(-4)}`;
	}

	/**
	 * Wrapper para adicionar timeout em promises
	 */
	private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
		return Promise.race([
			promise,
			new Promise<T>((_, reject) =>
				setTimeout(
					() =>
						reject(
							new AIProviderError(
								`Request timeout after ${timeoutMs}ms`,
								this.getProviderName(),
							),
						),
					timeoutMs,
				),
			),
		]);
	}
}
