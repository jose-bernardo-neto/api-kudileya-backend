import { z } from 'zod';

/**
 * Schemas de validação usando Zod
 * Centraliza todas as regras de validação da API
 */

// ===== ASK SCHEMAS =====

export const contextMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z
		.string()
		.min(1, 'Message content cannot be empty')
		.max(4000, 'Message content must not exceed 4000 characters'),
});

export type ContextMessage = z.infer<typeof contextMessageSchema>;

export const askRequestSchema = z.object({
	question: z
		.string()
		.min(3, 'Question must be at least 3 characters')
		.max(500, 'Question must not exceed 500 characters')
		.trim(),
	context: z
		.array(contextMessageSchema)
		.max(10, 'Context must not exceed 10 messages')
		.default([]),
});

export type AskRequestBody = z.infer<typeof askRequestSchema>;

// ===== FAQ SCHEMAS =====

export const createFAQSchema = z.object({
	question: z
		.string()
		.min(5, 'Question must be at least 5 characters')
		.max(500, 'Question must not exceed 500 characters')
		.trim(),
	answer: z
		.string()
		.min(10, 'Answer must be at least 10 characters')
		.max(2000, 'Answer must not exceed 2000 characters')
		.trim(),
	topic: z
		.string()
		.min(2, 'Topic must be at least 2 characters')
		.max(100, 'Topic must not exceed 100 characters')
		.trim()
		.toLowerCase(),
});

export type CreateFAQBody = z.infer<typeof createFAQSchema>;

export const listFAQsQuerySchema = z.object({
	topic: z.string().optional(),
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListFAQsQuery = z.infer<typeof listFAQsQuerySchema>;

// ===== DOCUMENT SCHEMAS =====

export const uploadDocumentSchema = z.object({
	title: z
		.string()
		.min(3, 'Title must be at least 3 characters')
		.max(200, 'Title must not exceed 200 characters')
		.trim(),
	description: z
		.string()
		.min(10, 'Description must be at least 10 characters')
		.max(1000, 'Description must not exceed 1000 characters')
		.trim(),
});

export type UploadDocumentBody = z.infer<typeof uploadDocumentSchema>;

export const listDocumentsQuerySchema = z.object({
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().positive().max(100).optional(),
});

export type ListDocumentsQuery = z.infer<typeof listDocumentsQuerySchema>;

export const documentIdParamSchema = z.object({
	id: z.string().uuid('Invalid document ID format'),
});

export type DocumentIdParam = z.infer<typeof documentIdParamSchema>;

// ===== COMMON SCHEMAS =====

export const paginationQuerySchema = z.object({
	cursor: z.string().datetime().optional(),
	limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
