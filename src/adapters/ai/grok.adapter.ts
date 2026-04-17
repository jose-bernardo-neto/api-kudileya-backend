import {
	AIProvider,
	AIProviderError,
	AIProviderConfig,
} from './ai-provider.interface.js';

/**
 * Adapter para xAI Grok API
 * Grok é o modelo de IA desenvolvido pela xAI (Elon Musk)
 * https://docs.x.ai/api
 */
export class GrokAdapter implements AIProvider {
	private model: string;
	private timeout: number;
	private maxTokens: number;
	private systemPrompt: string;
	private apiKey: string;
	private baseUrl: string;

	constructor(config: AIProviderConfig) {
		this.model = config.model || 'grok-beta';
		this.timeout = config.timeout || 30000;
		this.maxTokens = config.maxTokens || 1000;
		this.systemPrompt = config.systemPrompt || '';
		this.apiKey = config.apiKey || '';
		this.baseUrl = 'https://api.x.ai/v1';

		if (this.apiKey) {
			console.log(
				`[Grok] Initialized with API Key: ${this.maskApiKey(this.apiKey)}, Model: ${this.model}`,
			);
		} else {
			console.warn(
				'[Grok] No API Key provided - provider will not be available',
			);
		}
	}

	/**
	 * Envia uma pergunta para o Grok e retorna a resposta
	 */
	async ask(question: string): Promise<string> {
		if (!this.apiKey) {
			console.error('[Grok] ask() called but API key is missing');
			throw new AIProviderError(
				'Grok API key not configured',
				this.getProviderName(),
			);
		}

		try {
			console.log('[Grok] Sending question to model:', this.model);
			console.log('[Grok] Question length:', question.length);

			const messages: any[] = [];

			// Adiciona system prompt se disponível
			if (this.systemPrompt) {
				messages.push({
					role: 'system',
					content: this.systemPrompt,
				});
				console.log(
					'[Grok] Using system prompt (length):',
					this.systemPrompt.length,
				);
			}

			// Adiciona a pergunta do usuário
			messages.push({
				role: 'user',
				content: question,
			});

			const response = await this.withTimeout(
				fetch(`${this.baseUrl}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.apiKey}`,
					},
					body: JSON.stringify({
						model: this.model,
						messages,
						max_tokens: this.maxTokens,
						temperature: 0.7,
						stream: false,
					}),
				}),
				this.timeout,
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new AIProviderError(
					`Grok API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`,
					this.getProviderName(),
				);
			}

			const data = await response.json();
			const text = data.choices?.[0]?.message?.content;

			console.log('[Grok] Response received, length:', text?.length || 0);

			if (!text) {
				throw new AIProviderError(
					'Empty response from Grok',
					this.getProviderName(),
				);
			}

			return text;
		} catch (error: any) {
			console.error('[Grok] Error in ask()');
			console.error('[Grok] Error type:', error.constructor?.name || 'Unknown');
			console.error('[Grok] Error message:', error.message);
			console.error(
				'[Grok] Full error:',
				JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
			);

			if (error instanceof AIProviderError) {
				throw error;
			}

			// Tratamento específico de erros
			if (error.message?.includes('API key')) {
				throw new AIProviderError(
					'Invalid Grok API key',
					this.getProviderName(),
				);
			}

			if (error.message?.includes('quota') || error.message?.includes('429')) {
				throw new AIProviderError(
					'Grok API quota exceeded',
					this.getProviderName(),
				);
			}

			if (error.name === 'AbortError' || error.message?.includes('timeout')) {
				throw new AIProviderError(
					`Grok request timed out after ${this.timeout}ms`,
					this.getProviderName(),
				);
			}

			throw new AIProviderError(
				`Failed to get response from Grok: ${error instanceof Error ? error.message : 'Unknown error'}`,
				this.getProviderName(),
				error,
			);
		}
	}

	/**
	 * Verifica se o provedor está configurado e disponível
	 */
	async isAvailable(): Promise<boolean> {
		if (!this.apiKey) {
			console.log('[Grok] isAvailable check: API key is missing');
			return false;
		}

		try {
			console.log('[Grok] isAvailable check: testing with simple prompt...');

			const response = await this.withTimeout(
				fetch(`${this.baseUrl}/chat/completions`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${this.apiKey}`,
					},
					body: JSON.stringify({
						model: this.model,
						messages: [{ role: 'user', content: 'Hello' }],
						max_tokens: 10,
						stream: false,
					}),
				}),
				5000,
			);

			if (response.ok) {
				const data = await response.json();
				const text = data.choices?.[0]?.message?.content || '';
				console.log(
					'[Grok] isAvailable check: SUCCESS - got response:',
					text.substring(0, 50),
				);
				return true;
			}

			console.error(
				'[Grok] isAvailable check: FAILED -',
				response.status,
				response.statusText,
			);
			return false;
		} catch (error: any) {
			console.error('[Grok] isAvailable check: FAILED');
			console.error('[Grok] Error type:', error.constructor?.name || 'Unknown');
			console.error('[Grok] Error message:', error.message);
			console.error(
				'[Grok] Error details:',
				JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
			);
			return false;
		}
	}

	/**
	 * Retorna o nome do provedor
	 */
	getProviderName(): string {
		return 'grok';
	}

	/**
	 * Mascara a API key para logging seguro
	 */
	private maskApiKey(key: string): string {
		if (!key || key.length < 10) return '****';
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
					() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)),
					timeoutMs,
				),
			),
		]);
	}
}
