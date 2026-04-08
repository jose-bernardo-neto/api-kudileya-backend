import {
	AIProvider,
	AIProviderError,
} from '../adapters/ai/ai-provider.interface.js';
import { AIAdapterFactory } from '../adapters/ai/ai-adapter.factory.js';
import { ValidationError } from '../middlewares/error-handler.middleware.js';

/**
 * Service para interação com IA
 * Implementa a lógica de negócio relacionada a perguntas e respostas via IA
 *
 * Princípios SOLID:
 * - Single Responsibility: Apenas gerencia interações com IA
 * - Dependency Inversion: Depende da abstração AIProvider
 * - Open/Closed: Fácil adicionar novos providers sem modificar este código
 */
export class AIService {
	private provider: AIProvider;

	constructor(provider?: AIProvider) {
		// Permite injeção de dependência (útil para testes)
		// Se não fornecido, cria a partir do ambiente
		this.provider = provider || AIAdapterFactory.createFromEnv();
	}

	/**
	 * Envia uma pergunta para a IA e retorna a resposta
	 * @param question - Pergunta do usuário
	 * @returns Resposta da IA com timestamp
	 * @throws ValidationError se a pergunta for inválida
	 * @throws AIProviderError se houver erro na comunicação com IA
	 */
	async ask(question: string): Promise<{
		answer: string;
		timestamp: string;
		provider: string;
	}> {
		// Valida a pergunta
		this.validateQuestion(question);

		try {
			// Verifica se o provider está disponível
			const isAvailable = await this.provider.isAvailable();

			if (!isAvailable) {
				throw new AIProviderError(
					'AI provider is not available. Please check configuration.',
					this.provider.getProviderName(),
				);
			}

			// Envia a pergunta e obtém resposta
			const answer = await this.provider.ask(question);

			return {
				answer,
				timestamp: new Date().toISOString(),
				provider: this.provider.getProviderName(),
			};
		} catch (error) {
			// Se for erro de provider, relança
			if (error instanceof AIProviderError) {
				throw error;
			}

			// Encapsula outros erros
			throw new AIProviderError(
				`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
				this.provider.getProviderName(),
				error,
			);
		}
	}

	/**
	 * Processa uma pergunta de forma mais elaborada
	 * Adiciona contexto e pré-processamento antes de enviar para IA
	 * @param question - Pergunta do usuário
	 * @param context - Contexto adicional (opcional)
	 * @returns Resposta processada
	 */
	async askWithContext(
		question: string,
		context?: {
			previousQuestions?: string[];
			userPreferences?: Record<string, any>;
			metadata?: Record<string, any>;
		},
	): Promise<{
		answer: string;
		timestamp: string;
		provider: string;
		contextUsed: boolean;
	}> {
		this.validateQuestion(question);

		// Constrói pergunta com contexto se fornecido
		let enhancedQuestion = question;

		if (context?.previousQuestions && context.previousQuestions.length > 0) {
			const previousContext = context.previousQuestions
				.slice(-3) // Últimas 3 perguntas
				.map((q, i) => `Previous question ${i + 1}: ${q}`)
				.join('\n');

			enhancedQuestion = `Context:\n${previousContext}\n\nCurrent question: ${question}`;
		}

		try {
			const answer = await this.provider.ask(enhancedQuestion);

			return {
				answer,
				timestamp: new Date().toISOString(),
				provider: this.provider.getProviderName(),
				contextUsed: !!context,
			};
		} catch (error) {
			if (error instanceof AIProviderError) {
				throw error;
			}

			throw new AIProviderError(
				`Failed to get AI response with context: ${error instanceof Error ? error.message : 'Unknown error'}`,
				this.provider.getProviderName(),
				error,
			);
		}
	}

	/**
	 * Verifica o status do provider de IA
	 * @returns Status detalhado do provider
	 */
	async checkHealth(): Promise<{
		provider: string;
		available: boolean;
		message: string;
	}> {
		const providerName = this.provider.getProviderName();

		try {
			const isAvailable = await this.provider.isAvailable();

			return {
				provider: providerName,
				available: isAvailable,
				message: isAvailable
					? 'AI provider is healthy and ready'
					: 'AI provider is configured but not responding',
			};
		} catch (error) {
			return {
				provider: providerName,
				available: false,
				message: `AI provider error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	/**
	 * Obtém informações sobre o provider atual
	 * @returns Informações do provider
	 */
	getProviderInfo(): {
		name: string;
		type: string;
	} {
		return {
			name: this.provider.getProviderName(),
			type: this.provider.constructor.name,
		};
	}

	/**
	 * Troca o provider de IA em tempo de execução
	 * Útil para fallback ou testes
	 * @param provider - Novo provider
	 */
	setProvider(provider: AIProvider): void {
		this.provider = provider;
	}

	/**
	 * Valida se a pergunta é válida
	 * @throws ValidationError se a pergunta for inválida
	 */
	private validateQuestion(question: string): void {
		if (!question || typeof question !== 'string') {
			throw new ValidationError('Question is required and must be a string');
		}

		const trimmed = question.trim();

		if (trimmed.length === 0) {
			throw new ValidationError('Question cannot be empty');
		}

		if (trimmed.length < 3) {
			throw new ValidationError('Question must be at least 3 characters long');
		}

		if (trimmed.length > 500) {
			throw new ValidationError('Question must not exceed 500 characters');
		}
	}

	/**
	 * Sanitiza a entrada do usuário
	 * Remove caracteres perigosos e normaliza
	 * @todo Implementar sanitização em versão futura
	 */
	// private sanitizeInput(input: string): string {
	// 	return input
	// 		.trim()
	// 		.replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
	// 		.replace(/\s+/g, ' '); // Normaliza espaços
	// }

	/**
	 * Obtém sugestões de perguntas relacionadas
	 * Baseado em uma pergunta inicial
	 * @param question - Pergunta inicial
	 * @returns Array de sugestões
	 */
	async getSuggestions(question: string): Promise<string[]> {
		this.validateQuestion(question);

		const enhancedQuestion = `Based on this question: "${question}", suggest 3 related questions that a user might want to ask. Return only the questions, one per line.`;

		try {
			const response = await this.provider.ask(enhancedQuestion);

			// Processa a resposta em um array de sugestões
			const suggestions = response
				.split('\n')
				.map((line) => line.trim())
				.filter((line) => line.length > 0 && line.length < 200)
				.slice(0, 3); // Máximo 3 sugestões

			return suggestions;
		} catch (error) {
			// Se falhar, retorna array vazio ao invés de lançar erro
			console.warn('Failed to get suggestions:', error);
			return [];
		}
	}
}
