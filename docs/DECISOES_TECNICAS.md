# 🎯 Decisões Técnicas Aprovadas

## Resumo das Decisões

| # | Tópico | Decisão |
|---|--------|---------|
| 1 | **Gerenciador de Pacotes** | pnpm |
| 2 | **Integração com IA** | Adapter Pattern com Gemini API e OpenAI API |
| 3 | **Estrutura JSON** | Aprovada (ver estrutura abaixo) |
| 4 | **Paginação** | Por timestamp (createdAt) |
| 5 | **Formatos de Upload** | PDF e DOCX apenas |
| 6 | **Tamanho Máximo** | 30MB |
| 7 | **Scan de Vírus** | Não implementar |
| 8 | **Rate Limiting** | 10 req/h por IP no endpoint `/ask` |
| 9 | **Logging** | Pino (logger nativo do Fastify) |
| 10 | **Concorrência** | Lock de arquivo (proper-lockfile) |
| 11 | **CORS** | Configurável via ENV |
| 12 | **Formato de Erro** | Padronizado (aprovado) |

---

## 📄 Estrutura dos Arquivos JSON (Aprovada)

### data/faqs.json
```json
{
  "faqs": [
    {
      "id": "uuid-v4",
      "question": "string",
      "answer": "string",
      "topic": "string",
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ]
}
```

### data/documents.json
```json
{
  "documents": [
    {
      "id": "uuid-v4",
      "title": "string",
      "description": "string",
      "filename": "string",
      "filepath": "string",
      "mimetype": "string",
      "size": "number",
      "createdAt": "ISO-8601"
    }
  ]
}
```

---

## ⚙️ Variáveis de Ambiente Definidas

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Segurança
ADMIN_KEY=your-secure-admin-key-here

# CORS
CORS_ORIGIN=*
# ou CORS_ORIGIN=http://localhost:3000,https://example.com

# IA Providers (Adapter Pattern)
AI_PROVIDER=gemini
# Opções: gemini, openai

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro

# OpenAI API
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-3.5-turbo

# IA Config
AI_TIMEOUT=30000
AI_MAX_TOKENS=1000

# Cache
CACHE_TTL=300

# Upload
MAX_FILE_SIZE=31457280
# 30MB = 30 * 1024 * 1024 = 31457280 bytes
ALLOWED_MIME_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Paginação
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100

# Rate Limit (para /ask)
RATE_LIMIT_ASK_MAX=10
RATE_LIMIT_ASK_TIMEWINDOW=3600000
# 10 requisições por hora (3600000ms)
```

---

## 📋 Formato de Erro Padronizado (Aprovado)

### Interface TypeScript
```typescript
interface StandardError {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, any>;
}
```

### Exemplo de Resposta
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": {
    "field": "question",
    "issue": "Required field missing"
  }
}
```

---

## 🏗️ Arquitetura de Adapters para IA

### Estrutura de Pastas
```
src/adapters/ai/
├── ai-provider.interface.ts    # Interface comum
├── gemini.adapter.ts            # Implementação Gemini
├── openai.adapter.ts            # Implementação OpenAI
├── mock.adapter.ts              # Mock para testes
└── ai-adapter.factory.ts        # Factory para selecionar provider
```

### Interface AIProvider
```typescript
interface AIProvider {
  ask(question: string): Promise<string>;
  isAvailable(): Promise<boolean>;
}
```

### Factory Pattern
```typescript
class AIAdapterFactory {
  static create(provider: 'gemini' | 'openai' | 'mock'): AIProvider {
    // Lógica de seleção baseada em ENV
  }
}
```

---

## 📦 Dependências Principais (pnpm)

### Produção
- `fastify` - Framework web
- `@fastify/cors` - CORS
- `@fastify/rate-limit` - Rate limiting
- `@fastify/multipart` - Upload de arquivos
- `dotenv` - Variáveis de ambiente
- `pino` - Logging
- `pino-pretty` - Pretty print logs (dev)
- `node-cache` - Cache em memória
- `proper-lockfile` - Lock de arquivos
- `@google/generative-ai` - Gemini API
- `openai` - OpenAI API
- `uuid` - Geração de IDs
- `zod` - Validação de schemas

### Desenvolvimento
- `typescript` - TypeScript
- `tsx` - Executar TS diretamente
- `@types/node` - Tipos Node.js
- `jest` - Framework de testes
- `ts-jest` - Jest para TypeScript
- `@types/jest` - Tipos Jest

---

## 🎯 Decisões de Implementação

### 1. Paginação por Timestamp
- Usar `createdAt` como cursor
- Ordenação DESC (mais recentes primeiro)
- Retornar `next_cursor` como ISO-8601 string

### 2. Rate Limiting
- Apenas no endpoint `/ask`
- 10 requisições por hora por IP
- Usar `@fastify/rate-limit`

### 3. Validação de Upload
- Mime types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Tamanho máximo: 30MB (31457280 bytes)
- Sanitização de nome de arquivo
- Salvar em `./uploads/` com nome único (UUID)

### 4. Lock de Arquivo
- Usar `proper-lockfile` para lock exclusivo
- Lock antes de ler/escrever JSON
- Unlock em finally block
- Timeout de 10 segundos

### 5. Cache
- TTL de 5 minutos (300 segundos)
- Apenas em endpoints GET
- Cache por chave: `${endpoint}:${queryParams}`
- Invalidar cache após POST

### 6. Logging com Pino
- Development: pretty print
- Production: JSON estruturado
- Níveis: info, warn, error
- Log de requisições (request/response)

### 7. CORS
- Configurável via `CORS_ORIGIN`
- Suporte a múltiplas origens (separadas por vírgula)
- Wildcard `*` para desenvolvimento

---

## 🚀 Próxima Etapa: IMPLEMENTAÇÃO

Todas as decisões foram aprovadas. Pronto para iniciar a Fase 1! 🎯
