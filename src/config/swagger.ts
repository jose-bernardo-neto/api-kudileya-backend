import { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUI from '@fastify/swagger-ui';

export async function setupSwagger(app: FastifyInstance): Promise<void> {
	await app.register(fastifySwagger, {
		openapi: {
			info: {
				title: 'Kudileya AI Assistant API',
				description:
					'API REST para assistente de IA com perguntas e respostas, gerenciamento de FAQs e documentos',
				version: '1.0.0',
				contact: {
					name: 'API Support',
					email: 'support@kudileya.com',
				},
				license: {
					name: 'MIT',
					url: 'https://opensource.org/licenses/MIT',
				},
			},
			servers: [
				{
					url: `http://localhost:${process.env.PORT || 3000}`,
					description: 'Development server',
				},
				{
					url: 'https://api.kudileya.com',
					description: 'Production server',
				},
			],
			tags: [
				{
					name: 'Ask',
					description: 'Endpoints para perguntas ao assistente de IA',
				},
				{
					name: 'FAQs',
					description: 'Gerenciamento de perguntas frequentes',
				},
				{
					name: 'Documents',
					description: 'Gerenciamento de documentos',
				},
				{
					name: 'Health',
					description: 'Health checks',
				},
			],
			components: {
				securitySchemes: {
					adminKey: {
						type: 'apiKey',
						name: 'x-admin-key',
						in: 'header',
						description: 'Chave de administrador para operações protegidas',
					},
				},
				schemas: {
					Error: {
						type: 'object',
						properties: {
							error: {
								type: 'string',
								description: 'Nome do erro',
							},
							message: {
								type: 'string',
								description: 'Mensagem de erro detalhada',
							},
							statusCode: {
								type: 'number',
								description: 'Código de status HTTP',
							},
							details: {
								type: 'object',
								description: 'Detalhes adicionais do erro',
							},
						},
						required: ['error', 'message', 'statusCode'],
					},
					FAQ: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								format: 'uuid',
								description: 'ID único da FAQ',
							},
							question: {
								type: 'string',
								minLength: 5,
								description: 'Pergunta',
							},
							answer: {
								type: 'string',
								minLength: 10,
								description: 'Resposta',
							},
							topic: {
								type: 'string',
								description: 'Tópico/categoria da FAQ',
							},
							keywords: {
								type: 'array',
								items: { type: 'string' },
								description: 'Palavras-chave para busca',
							},
							createdAt: {
								type: 'string',
								format: 'date-time',
								description: 'Data de criação',
							},
							updatedAt: {
								type: 'string',
								format: 'date-time',
								description: 'Data de atualização',
							},
						},
						required: [
							'id',
							'question',
							'answer',
							'topic',
							'createdAt',
							'updatedAt',
						],
					},
					Document: {
						type: 'object',
						properties: {
							id: {
								type: 'string',
								format: 'uuid',
								description: 'ID único do documento',
							},
							title: {
								type: 'string',
								description: 'Título do documento',
							},
							description: {
								type: 'string',
								description: 'Descrição do documento',
							},
							filename: {
								type: 'string',
								description: 'Nome original do arquivo',
							},
							path: {
								type: 'string',
								description: 'Caminho do arquivo no servidor',
							},
							mimeType: {
								type: 'string',
								description: 'Tipo MIME do arquivo',
							},
							size: {
								type: 'number',
								description: 'Tamanho do arquivo em bytes',
							},
							createdAt: {
								type: 'string',
								format: 'date-time',
								description: 'Data de upload',
							},
							updatedAt: {
								type: 'string',
								format: 'date-time',
								description: 'Data de atualização',
							},
						},
						required: [
							'id',
							'title',
							'filename',
							'path',
							'mimeType',
							'size',
							'createdAt',
							'updatedAt',
						],
					},
					PaginatedResponse: {
						type: 'object',
						properties: {
							data: {
								type: 'array',
								items: {},
								description: 'Lista de itens',
							},
							next_cursor: {
								type: 'string',
								nullable: true,
								description: 'Cursor para próxima página',
							},
							has_more: {
								type: 'boolean',
								description: 'Indica se há mais itens',
							},
						},
						required: ['data', 'next_cursor', 'has_more'],
					},
				},
			},
		},
	});

	await app.register(fastifySwaggerUI, {
		routePrefix: '/docs',
		uiConfig: {
			docExpansion: 'list',
			deepLinking: true,
			displayRequestDuration: true,
		},
		staticCSP: true,
		transformStaticCSP: (header) => header,
	});
}
