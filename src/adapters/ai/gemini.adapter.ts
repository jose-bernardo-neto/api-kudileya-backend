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
	private systemPrompt: string;

	constructor(private config: AIProviderConfig) {
		this.model = config.model || 'gemini-pro';
		this.timeout = config.timeout || 30000;
		this.maxTokens = config.maxTokens || 1000;
		this.systemPrompt = config.systemPrompt || '';

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
			console.error('[Gemini] ask() called but client is null');
			throw new AIProviderError(
				'Gemini client not initialized. Please check your API key.',
				this.getProviderName(),
			);
		}

		try {
			console.log('[Gemini] Sending question to model:', this.model);
			console.log('[Gemini] Question length:', question.length);

			// Configura o modelo com system prompt se disponível
			const modelConfig: any = { model: this.model };
			if (this.systemPrompt) {
				modelConfig.systemInstruction = this.systemPrompt;
				console.log(
					'[Gemini] Using system prompt (length):',
					this.systemPrompt.length,
				);
			}

			const model = this.client.getGenerativeModel(modelConfig);

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

			console.log('[Gemini] Response received, length:', text.length);

			if (!text) {
				throw new AIProviderError(
					'Empty response from Gemini',
					this.getProviderName(),
				);
			}

			return text;
		} catch (error: any) {
			console.error('[Gemini] Error in ask()');
			console.error(
				'[Gemini] Error type:',
				error.constructor?.name || 'Unknown',
			);
			console.error('[Gemini] Error message:', error.message);
			console.error(
				'[Gemini] Full error:',
				JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
			);

			if (error instanceof AIProviderError) {
				throw error;
			}

			// Tratamento específico de erros do Gemini
			if (error.message?.includes('API key')) {
				throw new AIProviderError(
					'Invalid Gemini API key',
					this.getProviderName(),
				);
			}

			if (error.message?.includes('quota')) {
				throw new AIProviderError(
					'Gemini API quota exceeded',
					this.getProviderName(),
				);
			}

			if (error.name === 'AbortError' || error.message?.includes('timeout')) {
				throw new AIProviderError(
					`Gemini request timed out after ${this.timeout}ms`,
					this.getProviderName(),
				);
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
		if (!this.client) {
			console.log('[Gemini] isAvailable check: client is null');
			return false;
		}

		if (!this.config.apiKey) {
			console.log('[Gemini] isAvailable check: API key is missing');
			return false;
		}

		try {
			console.log('[Gemini] isAvailable check: testing with simple prompt...');
			const model = this.client.getGenerativeModel({ model: this.model });
			const result = await this.withTimeout(
				model.generateContent({
					contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
				}),
				5000, // Timeout menor para check de disponibilidade
			);
			const response = await result.response;
			const text = response.text();
			console.log(
				'[Gemini] isAvailable check: SUCCESS - got response:',
				text.substring(0, 50),
			);
			return true;
		} catch (error: any) {
			console.error('[Gemini] isAvailable check: FAILED');
			console.error(
				'[Gemini] Error type:',
				error.constructor?.name || 'Unknown',
			);
			console.error('[Gemini] Error message:', error.message);
			console.error(
				'[Gemini] Error details:',
				JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
			);
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
