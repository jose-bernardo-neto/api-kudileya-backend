/**
 * Interface para provedores de IA
 * Define o contrato que todos os adapters devem seguir (Interface Segregation Principle)
 */
export interface AIProvider {
	/**
	 * Envia uma pergunta para o provedor de IA e retorna a resposta
	 * @param question - A pergunta do usuário
	 * @returns Promise com a resposta da IA
	 * @throws AIProviderError se houver erro na comunicação
	 */
	ask(question: string): Promise<string>;

	/**
	 * Verifica se o provedor está disponível e configurado corretamente
	 * @returns Promise<boolean> indicando se o provedor está pronto para uso
	 */
	isAvailable(): Promise<boolean>;

	/**
	 * Retorna o nome do provedor
	 * @returns Nome identificador do provedor
	 */
	getProviderName(): string;
}

/**
 * Erro customizado para problemas com provedores de IA
 */
export class AIProviderError extends Error {
	constructor(
		message: string,
		public readonly provider: string,
		public readonly originalError?: unknown,
	) {
		super(message);
		this.name = 'AIProviderError';

		// Mantém o stack trace correto
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AIProviderError);
		}
	}
}

/**
 * Configuração base para provedores de IA
 */
export interface AIProviderConfig {
	apiKey?: string;
	model?: string;
	timeout?: number;
	maxTokens?: number;
}
