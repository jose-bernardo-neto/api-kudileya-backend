import { AIProvider, AIProviderConfig } from './ai-provider.interface.js';

/**
 * Mock Adapter para testes e desenvolvimento
 * Simula respostas de IA sem fazer chamadas reais para APIs externas
 */
export class MockAdapter implements AIProvider {
	private delay: number;
	private shouldFail: boolean;

	constructor(
		config: AIProviderConfig & { delay?: number; shouldFail?: boolean } = {},
	) {
		this.delay = config.delay || 100; // Simula latência de rede
		this.shouldFail = config.shouldFail || false;
	}

	/**
	 * Simula uma resposta de IA
	 */
	async ask(question: string): Promise<string> {
		// Simula delay de rede
		await this.sleep(this.delay);

		if (this.shouldFail) {
			throw new Error('Mock adapter configured to fail');
		}

		// Retorna uma resposta mockada baseada na pergunta
		return this.generateMockResponse(question);
	}

	/**
	 * Verifica se o adapter está disponível
	 */
	async isAvailable(): Promise<boolean> {
		return !this.shouldFail;
	}

	/**
	 * Retorna o nome do provedor
	 */
	getProviderName(): string {
		return 'mock';
	}

	/**
	 * Gera uma resposta mockada inteligente baseada na pergunta
	 */
	private generateMockResponse(question: string): string {
		const lowerQuestion = question.toLowerCase();

		// Respostas específicas para perguntas comuns
		if (lowerQuestion.includes('password') || lowerQuestion.includes('senha')) {
			return 'Para resetar sua senha, acesse a página de recuperação de senha e siga as instruções enviadas para seu email.';
		}

		if (lowerQuestion.includes('login') || lowerQuestion.includes('entrar')) {
			return 'Para fazer login, acesse a página inicial e clique em "Entrar". Use seu email e senha cadastrados.';
		}

		if (
			lowerQuestion.includes('cadastro') ||
			lowerQuestion.includes('registro')
		) {
			return 'Para se cadastrar, clique em "Criar Conta" na página inicial e preencha o formulário com suas informações.';
		}

		if (lowerQuestion.includes('como') || lowerQuestion.includes('how')) {
			return `Para realizar "${question}", você pode seguir os seguintes passos: 1) Acesse a seção apropriada, 2) Siga as instruções na tela, 3) Confirme a operação.`;
		}

		if (lowerQuestion.includes('o que') || lowerQuestion.includes('what')) {
			return `"${question}" refere-se a uma funcionalidade do sistema que permite gerenciar recursos de forma eficiente.`;
		}

		// Resposta genérica para outras perguntas
		return `Esta é uma resposta simulada para: "${question}". Em produção, esta resposta seria gerada por uma IA real (Gemini ou OpenAI).`;
	}

	/**
	 * Utilitário para simular delay
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Método para configurar se o adapter deve falhar (útil para testes)
	 */
	setShouldFail(shouldFail: boolean): void {
		this.shouldFail = shouldFail;
	}
}
