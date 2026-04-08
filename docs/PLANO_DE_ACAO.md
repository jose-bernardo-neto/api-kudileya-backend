# Plano de Ação - Implementação da API

## ✅ Decisões Técnicas Aprovadas

### 1. **Gerenciador de Pacotes**: pnpm

### 2. **Integração com IA**: Adapter Pattern com suporte a Gemini API e OpenAI API

### 3. **Estrutura JSON**: Aprovada conforme proposta

### 4. **Paginação**: Por timestamp (createdAt)

### 5. **Upload de Arquivos**:

- Formatos permitidos: PDF, DOCX
- Tamanho máximo: 30MB
- Sem scan de vírus

### 6. **Rate Limiting**: 10 req/h por IP no endpoint `/ask`

### 7. **Logging**: Pino (logger nativo do Fastify)

### 8. **Concorrência**: Lock de arquivo (proper-lockfile)

### 9. **CORS**: Configurável via variável de ambiente

### 10. **Formato de Erro**: Padronizado aprovado

---

## 📋 Checklist de Implementação

### Fase 1: Setup Inicial do Projeto

- [ ] Inicializar projeto Node.js com TypeScript
- [ ] Configurar `package.json` com scripts necessários
- [ ] Instalar dependências principais (usando pnpm):
  - Fastify + @fastify/cors + @fastify/rate-limit + tipos
  - TypeScript + tsx + ts-node
  - Jest + ts-jest + tipos
  - @fastify/multipart (para upload de arquivos)
  - node-cache (para caching)
  - dotenv (variáveis de ambiente)
  - zod (validação de schemas)
  - pino + pino-pretty (logging)
  - proper-lockfile (lock de arquivos)
  - @google/generative-ai (Gemini API)
  - openai (OpenAI API)
  - uuid (geração de IDs)
- [ ] Configurar `tsconfig.json`
- [ ] Configurar `jest.config.js`
- [ ] Criar estrutura de pastas
- [ ] Criar `.env.example`
- [ ] Adicionar `.gitignore`

### Fase 2: Estrutura Base

- [ ] Criar tipos TypeScript (`src/types/`)
  - [ ] FAQ type
  - [ ] Document type
  - [ ] AskRequest/Response types
  - [ ] PaginatedResponse type
  - [ ] Error types
- [ ] Criar classe `JsonRepository` (`src/repositories/`)
  - [ ] Métodos de leitura assíncrona com lock
  - [ ] Métodos de escrita assíncrona com lock
  - [ ] Lógica de paginação por timestamp (createdAt)
- [ ] Criar camada de Cache (`src/utils/cache.ts`)
  - [ ] Wrapper para node-cache
  - [ ] Configuração de TTL (5 minutos)
- [ ] Criar utilitário de lock (`src/utils/file-lock.ts`)
  - [ ] Wrapper para proper-lockfile

### Fase 3: Adapter Pattern para IA

- [ ] Criar interface `AIProvider` (`src/adapters/ai/ai-provider.interface.ts`)
- [ ] Implementar `GeminiAdapter` (`src/adapters/ai/gemini.adapter.ts`)
- [ ] Implementar `OpenAIAdapter` (`src/adapters/ai/openai.adapter.ts`)
- [ ] Criar `AIAdapterFactory` para selecionar provider
- [ ] Implementar Mock para testes

### Fase 4: Middlewares e Segurança

- [ ] Criar middleware de autenticação admin (`src/middlewares/auth.ts`)
  - [ ] Validação do header `x-admin-key`
  - [ ] Hook `preHandler` do Fastify
- [ ] Criar middleware de validação de schemas (Zod)
- [ ] Criar middleware de error handling padronizado
- [ ] Configurar rate limiting (10 req/h por IP no `/ask`)

### Fase 5: Implementação das Services

- [ ] `FAQService` (`src/services/faq.service.ts`)
  - [ ] `listFAQs(topic?, cursor?, limit?)`
  - [ ] `createFAQ(data)`
- [ ] `DocumentService` (`src/services/document.service.ts`)
  - [ ] `listDocuments(cursor?, limit?)`
  - [ ] `getDocumentById(id)`
  - [ ] `uploadDocument(file, metadata)` - validar PDF/DOCX e 30MB
- [ ] `AIService` (`src/services/ai.service.ts`)
  - [ ] `ask(question)` - usar adapter pattern
  - [ ] Seleção dinâmica de provider

### Fase 6: Implementação dos Controllers/Routes

- [ ] `askController` - POST `/api/v1/ask` (com rate limit)
- [ ] `faqController` - GET e POST `/api/v1/faqs`
- [ ] `documentController` - GET, GET/:id, POST `/api/v1/documents`
- [ ] Integrar cache nos endpoints GET
- [ ] Integrar validação de schemas

### Fase 7: Server Setup

- [ ] Criar `src/server.ts` com configuração do Fastify
- [ ] Registrar plugins e rotas
- [ ] Configurar CORS (via variável de ambiente)
- [ ] Configurar Pino para logging
- [ ] Configurar rate limiting global
- [ ] Criar `src/index.ts` como entry point

### Fase 8: Testes

- [ ] Testes unitários dos adapters de IA (Gemini e OpenAI)
- [ ] Testes unitários dos repositories (com mock de lock)
- [ ] Testes unitários dos services
- [ ] Testes de integração das rotas (usando `fastify.inject()`)
- [ ] Testes do middleware de autenticação
- [ ] Testes de cache
- [ ] Testes de rate limiting
- [ ] Configurar cobertura mínima (80%)

### Fase 9: Documentação e Finalização

- [ ] Adicionar JSDoc nos métodos principais
- [ ] Criar exemplos de requisições (Postman/Thunder Client)
- [ ] Documentar formato dos arquivos JSON
- [ ] Criar scripts úteis no `package.json`
- [ ] Revisar README com decisões finais
- [ ] Criar arquivo `.env.example` completo

---

## 🎯 Resumo das Decisões Aprovadas

Todas as dúvidas foram respondidas. Aqui está o resumo:

- D) Webhook para serviço externo

**Decisão necessária**: Qual API de IA usar? Precisa de API key? Como tratar timeouts?

---

### 2. **Formato dos Arquivos JSON**

**Dúvida**: Estrutura exata dos arquivos de persistência

**Proposta**:

```json
// data/faqs.json
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

// data/documents.json
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

**Confirmar**: Esta estrutura está adequada?

---

### 3. **Paginação por Cursor**

**Dúvida**: Qual campo usar como cursor?

**Opções**:

- A) ID (UUID) - mais complexo para ordenar
- B) Timestamp (createdAt) - natural para ordenação temporal
- C) Índice numérico incremental

**Sugestão**: Usar `createdAt` como cursor para simplicidade e ordenação natural.

---

### 4. **Validação de Uploads**

**Dúvidas**:

- Quais tipos de arquivo são permitidos?
- Qual o tamanho máximo por arquivo?
- Precisa de scan de vírus/malware?

**Sugestões**:

- Limitar a 10MB por arquivo
- Permitir: PDF, DOC, DOCX, TXT, MD
- Usar sanitização de nomes de arquivo

---

### 5. **Rate Limiting**

**Dúvida**: Implementar rate limiting?

**Contexto**: O PRD não menciona explicitamente, mas seria importante para proteger o endpoint `/ask` (que chama IA) e os endpoints admin.

**Sugestão**:

- Endpoints públicos: 100 req/min por IP
- Endpoint `/ask`: 10 req/min por IP
- Endpoints admin: 50 req/min por token

**Decisão necessária**: Implementar agora ou deixar para v2?

---

### 6. **Logging e Monitoramento**

**Dúvida**: Nível de logging desejado?

**Opções**:

- A) Console simples (development)
- B) Pino (logger nativo do Fastify) com rotação de arquivos
- C) Integração com serviços externos (Sentry, LogRocket)

**Sugestão**: Usar Pino com diferentes níveis por ambiente.

---

### 7. **Tratamento de Concorrência**

**Dúvida**: Como lidar com escrita concorrente nos arquivos JSON?

**Problema**: Múltiplas requisições POST simultâneas podem causar race conditions.

**Opções**:

- A) Lock de arquivo (fs-extra com flock)
- B) Queue de operações de escrita
- C) Assumir baixa concorrência e documentar limitação

**Sugestão**: Implementar queue simples com Promise para serializar escritas.

---

### 8. **Backup e Recovery**

**Dúvida**: Estratégia de backup dos arquivos JSON?

**Sugestões**:

- Criar cópia timestamped antes de cada escrita
- Manter últimas 10 versões
- Script de recovery em caso de corrupção

**Decisão necessária**: Implementar agora ou documentar como responsabilidade do deploy?

---

### 9. **Variáveis de Ambiente Adicionais**

**Dúvidas sobre configurações**:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Segurança
ADMIN_KEY=your-secure-admin-key-here

# IA Service
AI_SERVICE_URL=http://localhost:8000/api/chat
AI_SERVICE_KEY=?
AI_TIMEOUT=30000

# Cache
CACHE_TTL=300

# Upload
MAX_FILE_SIZE=10485760
ALLOWED_MIME_TYPES=application/pdf,text/plain,text/markdown

# Paginação
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100

# Rate Limit
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
```

**Confirmar**: Quais dessas são realmente necessárias?

---

### 10. **Estrutura de Erros**

**Dúvida**: Formato padronizado de erro?

**Proposta**:

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

## 🎯 Decisões Recomendadas (Para Aprovação)

### Para MVP (Versão 1.0):

✅ **Incluir**:

1. Sistema básico de cache (node-cache)
2. Validação com Zod
3. Paginação por timestamp (createdAt)
4. Mock de IA para testes
5. Logging com Pino
6. Limite de upload: 10MB
7. Queue simples para escritas

⏳ **Deixar para v2**:

1. Rate limiting avançado
2. Sistema de backup automático
3. Scan de vírus
4. Métricas e analytics
5. Webhooks
6. Versionamento de FAQs

---

## 🚀 Próximos Passos

1. **Revisar e aprovar este plano**
2. **Responder às dúvidas técnicas**
3. **Definir prioridades** (MVP vs features futuras)
4. **Iniciar implementação fase por fase**
5. **Revisar após cada fase**

---

## 📝 Observações Finais

- O projeto é bem estruturado no PRD
- Arquitetura proposta é adequada para o escopo
- Sistema de arquivos para persistência é válido para MVPs
- Importante documentar limitações de concorrência
- Considerar migração para DB real se escalar

**Estimativa de tempo**: 3-5 dias de desenvolvimento para MVP completo com testes.
