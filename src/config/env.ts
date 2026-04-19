import dotenv from 'dotenv';
import { z } from 'zod';

// Carrega variáveis de ambiente
dotenv.config();

// Schema de validação para ENV
const envSchema = z.object({
	// Server
	PORT: z.string().default('3000'),
	HOST: z.string().default('0.0.0.0'),
	NODE_ENV: z
		.enum(['development', 'production', 'test'])
		.default('development'),

	// Segurança
	ADMIN_KEY: z.string().min(1, 'ADMIN_KEY é obrigatório'),

	// CORS
	CORS_ORIGIN: z.string().default('*'),

	// IA Provider
	AI_PROVIDER: z
		.enum(['gemini', 'openai', 'openrouter', 'grok', 'mock'])
		.default('gemini'),

	// Gemini
	GEMINI_API_KEY: z.string().default('AIzaSyDA94FPQPb7fBT9ZbgtuPA9KC_C6B0dBLw'),
	GEMINI_MODEL: z.string().default('gemini-pro'),

	// OpenAI
	OPENAI_API_KEY: z.string().optional(),
	OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),

	// OpenRouter
	OPENROUTER_API_KEY: z.string().optional(),
	OPENROUTER_MODEL: z.string().default('anthropic/claude-3.5-sonnet'),

	// Grok (xAI)
	GROK_API_KEY: z.string().optional(),
	GROK_MODEL: z.string().default('grok-beta'),

	// IA Config
	AI_TIMEOUT: z.string().default('30000'),
	AI_MAX_TOKENS: z.string().default('1000'),
	AI_SYSTEM_PROMPT: z.string()
		.default(`Persona: Assistente Jurídico Kudileya (KudiChat). Missão: Democratizar o Direito em Angola. Traduza juridiquês para linguagem clara, acolhedora e direta.

Identidade/Origem: Criado por Donato Batila Barata, José Neto e Samuel Júnior João Katendi (TCC - IPP Smartbits). Mencione a origem se questionado.

Diretrizes:

Jurisdição: Exclusivamente leis de Angola (CRA, C. Civil, LGT). Contextualize com a realidade de Luanda e províncias.

Tom: Simples e acessível. Evite termos técnicos/latim sem explicação. Respeitoso, mas fluido para chat.

Atualização: Priorize reformas legislativas recentes.

Restrição Legal: Informativo apenas. Nunca se diga advogado. Recomende sempre a Ordem dos Advogados de Angola (OAA) para casos complexos.

Estrutura de Resposta (Máx. 2 parágrafos):

Acolhimento: Valide brevemente a dúvida.

Explicação: Resposta direta baseada na lei angolana.

Ação: Próximo passo prático ou documento necessário.`),

	// Cache
	CACHE_TTL: z.string().default('300'),

	// Upload
	MAX_FILE_SIZE: z.string().default('31457280'), // 30MB
	ALLOWED_MIME_TYPES: z
		.string()
		.default(
			'application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		),

	// Paginação
	DEFAULT_PAGE_LIMIT: z.string().default('20'),
	MAX_PAGE_LIMIT: z.string().default('100'),

	// Rate Limit
	RATE_LIMIT_ASK_MAX: z.string().default('10'),
	RATE_LIMIT_ASK_TIMEWINDOW: z.string().default('3600000'),

	LOG_LEVEL: z
		.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
		.default('info'),
});

// Valida e tipifica as variáveis de ambiente
const parsedEnv = envSchema.parse(process.env);

// Exporta configurações tipadas e convertidas
export const config = {
	server: {
		port: parseInt(parsedEnv.PORT, 10),
		host: parsedEnv.HOST,
		env: parsedEnv.NODE_ENV,
	},
	security: {
		adminKey: parsedEnv.ADMIN_KEY,
	},
	cors: {
		origin:
			parsedEnv.CORS_ORIGIN === '*'
				? '*'
				: parsedEnv.CORS_ORIGIN.split(',').map((o) => o.trim()),
	},
	ai: {
		provider: parsedEnv.AI_PROVIDER,
		timeout: parseInt(parsedEnv.AI_TIMEOUT, 10),
		maxTokens: parseInt(parsedEnv.AI_MAX_TOKENS, 10),
		systemPrompt: parsedEnv.AI_SYSTEM_PROMPT,
		gemini: {
			apiKey: parsedEnv.GEMINI_API_KEY,
			model: parsedEnv.GEMINI_MODEL,
		},
		openai: {
			apiKey: parsedEnv.OPENAI_API_KEY,
			model: parsedEnv.OPENAI_MODEL,
		},
		openrouter: {
			apiKey: parsedEnv.OPENROUTER_API_KEY,
			model: parsedEnv.OPENROUTER_MODEL,
		},
		grok: {
			apiKey: parsedEnv.GROK_API_KEY,
			model: parsedEnv.GROK_MODEL,
		},
	},
	cache: {
		ttl: parseInt(parsedEnv.CACHE_TTL, 10),
	},
	upload: {
		maxFileSize: parseInt(parsedEnv.MAX_FILE_SIZE, 10),
		allowedMimeTypes: parsedEnv.ALLOWED_MIME_TYPES.split(',').map((m) =>
			m.trim(),
		),
	},
	pagination: {
		defaultLimit: parseInt(parsedEnv.DEFAULT_PAGE_LIMIT, 10),
		maxLimit: parseInt(parsedEnv.MAX_PAGE_LIMIT, 10),
	},
	rateLimit: {
		ask: {
			max: parseInt(parsedEnv.RATE_LIMIT_ASK_MAX, 10),
			timeWindow: parseInt(parsedEnv.RATE_LIMIT_ASK_TIMEWINDOW, 10),
		},
	},
} as const;

export type Config = typeof config;
