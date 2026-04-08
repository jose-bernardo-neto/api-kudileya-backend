# 🤖 Kudileya AI Knowledge Base API

> API REST robusta para base de conhecimento alimentada por IA, com gerenciamento de FAQs, documentos e integração com modelos de linguagem (Gemini/OpenAI).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.29-black.svg)](https://fastify.io/)
[![Tests](https://img.shields.io/badge/tests-183%20passed-success.svg)](./tests)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

## 📋 Índice

- [Características](#-características-principais)
- [Stack Tecnológica](#️-stack-tecnológica)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#️-configuração)
- [Uso](#-uso)
- [API Reference](#-api-reference)
- [Testes](#-testes)
- [Docker](#-docker)
- [Segurança](#-segurança)
- [Contribuindo](#-contribuindo)

## ✨ Características Principais

### 🎯 Core Features

- **🤖 Assistente de IA**: Integração com Gemini AI e OpenAI para respostas inteligentes
- **📚 Gestão de FAQs**: Sistema completo de perguntas frequentes com busca e categorização
- **📄 Gerenciamento de Documentos**: Upload, busca e download de arquivos
- **⚡ Cache Inteligente**: Sistema de cache em memória com TTL configurável (5min padrão)
- **🔒 Segurança**: Autenticação via API Key para operações administrativas
- **🚦 Rate Limiting**: Proteção contra abuso (10 req/min no endpoint /ask)
- **📊 Estatísticas**: Métricas de documentos e uso da API
- **📖 Swagger/OpenAPI**: Documentação interativa da API em `/docs`

### 🏗️ Arquitetura & Padrões

- **Clean Architecture**: Separação clara de responsabilidades (Controller → Service → Repository)
- **Adapter Pattern**: Abstração de provedores de IA (fácil adicionar novos)
- **Repository Pattern**: Camada de persistência desacoplada
- **File Locking**: Concorrência segura em operações de arquivo
- **Dependency Injection**: Facilita testes e manutenção
- **Error Handling**: Sistema centralizado de tratamento de erros

### 📈 Performance & Confiabilidade

- **Stateless**: Fácil escalabilidade horizontal
- **Persistência em Arquivos**: Sem dependência de banco de dados
- **Cache Estratégico**: Reduz latência e carga do servidor
- **Paginação Cursor-based**: Eficiente para grandes volumes de dados
- **Validação com Zod**: Schemas tipados e validados em tempo de execução
- **Logging Estruturado**: Pino para logs de alta performance
- **183 Testes**: 100% de cobertura nos testes de integração

## 🛠️ Stack Tecnológica

### Core

- **Runtime**: Node.js 18+
- **Linguagem**: TypeScript 5.9
- **Framework**: Fastify 4.29
- **Validação**: Zod

### IA & Integrações

- **Gemini AI**: @google/generative-ai
- **OpenAI**: openai
- **Mock Adapter**: Para desenvolvimento/testes

### Infraestrutura

- **Logger**: Pino + Pino-pretty
- **Cache**: node-cache
- **File Lock**: proper-lockfile
- **Upload**: @fastify/multipart
- **CORS**: @fastify/cors
- **Rate Limit**: @fastify/rate-limit
- **Docs**: @fastify/swagger + @fastify/swagger-ui

### Desenvolvimento

- **Testes**: Jest + ts-jest
- **Build**: TSC
- **Hot Reload**: tsx

## 🏛️ Arquitetura

```
src/
├── adapters/              # Adapter Pattern para provedores de IA
│   ├── ai-adapter.interface.ts
│   ├── gemini-adapter.ts
│   ├── openai-adapter.ts
│   ├── mock-adapter.ts
│   └── ai-adapter.factory.ts
├── config/                # Configurações centralizadas
│   ├── env.ts             # Variáveis de ambiente
│   └── swagger.ts         # Configuração OpenAPI
├── controllers/           # Camada de apresentação (HTTP handlers)
│   ├── ask.controller.ts
│   ├── faq.controller.ts
│   └── document.controller.ts
├── middlewares/           # Middlewares Fastify
│   ├── auth.middleware.ts
│   ├── validation.middleware.ts
│   ├── error-handler.middleware.ts
│   └── rate-limit.middleware.ts
├── repositories/          # Camada de persistência
│   └── json.repository.ts
├── services/              # Lógica de negócio
│   ├── ai.service.ts
│   ├── faq.service.ts
│   └── document.service.ts
├── types/                 # Definições TypeScript
│   └── index.ts
├── utils/                 # Utilitários
│   ├── cache.ts
│   └── file-lock.ts
├── server.ts              # Setup do Fastify
└── index.ts               # Entry point

data/                      # Arquivos JSON de persistência
uploads/                   # Arquivos enviados pelos usuários
tests/                     # Testes unitários e integração
```

## 🚀 Instalação

### Pré-requisitos

- Node.js >= 18.0.0
- npm ou pnpm
- Git

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/api-kudileya-backend.git
cd api-kudileya-backend

# 2. Instale as dependências
npm install
# ou
pnpm install

# 3. Configure as variáveis de ambiente
cp .env.example .env

# 4. Edite o .env com suas configurações
nano .env

# 5. Execute em desenvolvimento
npm run dev

# O servidor estará rodando em http://localhost:3000
# Swagger UI: http://localhost:3000/docs
```

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Security
ADMIN_KEY=your-secure-admin-key-here

# AI Configuration
AI_PROVIDER=mock              # mock | gemini | openai
GEMINI_API_KEY=your-gemini-key-here
OPENAI_API_KEY=your-openai-key-here

# Cache
CACHE_TTL=300                 # 5 minutes

# Rate Limiting
RATE_LIMIT_MAX=10            # requests per timeWindow
RATE_LIMIT_TIME_WINDOW=60000 # 1 minute in ms

# Logging
LOG_LEVEL=info               # fatal | error | warn | info | debug | trace
```

### Provedores de IA

#### Mock (Desenvolvimento)
```env
AI_PROVIDER=mock
```
Retorna respostas mockadas, ideal para testes e desenvolvimento.

#### Google Gemini
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-api-key
```

#### OpenAI
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-api-key
```

## 💻 Uso

### Desenvolvimento

```bash
# Modo desenvolvimento (hot reload)
npm run dev

# Build do projeto
npm run build

# Executar versão de produção
npm start

# Lint (verificação de tipos)
npm run lint

# Formatação de código
npm run format
```

### Produção

```bash
# Build
npm run build

# Iniciar servidor
NODE_ENV=production npm start
```

## 📡 API Reference

### Base URL

```
http://localhost:3000/api/v1
```

### Documentação Interativa

Acesse a documentação Swagger em: `http://localhost:3000/docs`

### Endpoints Públicos (Sem Autenticação)

#### Health Check
```http
GET /health
```

#### Perguntar à IA
```http
POST /api/v1/ask
Content-Type: application/json

{
  "question": "Como faço para resetar minha senha?"
}
```

**Response:**
```json
{
  "answer": "Para resetar sua senha...",
  "question": "Como faço para resetar minha senha?",
  "relatedFAQs": [...]
}
```

#### Listar FAQs
```http
GET /api/v1/faqs?limit=10&cursor=2024-01-01T00:00:00.000Z&topic=autenticacao
```

**Response:**
```json
{
  "data": [...],
  "next_cursor": "2024-01-02T00:00:00.000Z",
  "has_more": true
}
```

#### Buscar FAQs
```http
GET /api/v1/faqs/search?q=senha
```

#### Listar Tópicos de FAQs
```http
GET /api/v1/faqs/topics
```

#### Buscar FAQ por ID
```http
GET /api/v1/faqs/:id
```

#### Listar Documentos
```http
GET /api/v1/documents?limit=10
```

#### Buscar Documento por ID
```http
GET /api/v1/documents/:id
```

#### Download de Documento
```http
GET /api/v1/documents/:id/download
```

#### Buscar Documentos
```http
GET /api/v1/documents/search?q=manual
```

#### Estatísticas de Documentos
```http
GET /api/v1/documents/stats
```

### Endpoints Administrativos (Requer `x-admin-key`)

#### Criar FAQ
```http
POST /api/v1/faqs
Content-Type: application/json
x-admin-key: your-admin-key

{
  "question": "Como faço login?",
  "answer": "Acesse a página de login...",
  "topic": "autenticacao",
  "keywords": ["login", "acesso", "senha"]
}
```

#### Atualizar FAQ
```http
PUT /api/v1/faqs/:id
Content-Type: application/json
x-admin-key: your-admin-key

{
  "question": "Como faço login? (Atualizado)",
  "answer": "Nova resposta..."
}
```

#### Deletar FAQ
```http
DELETE /api/v1/faqs/:id
x-admin-key: your-admin-key
```

#### Upload de Documento
```http
POST /api/v1/documents
Content-Type: multipart/form-data
x-admin-key: your-admin-key

file: <binary>
title: "Manual do Usuário"
description: "Guia completo"
```

#### Deletar Documento
```http
DELETE /api/v1/documents/:id
x-admin-key: your-admin-key
```

### Códigos de Status

- `200` - Sucesso
- `201` - Criado
- `204` - Sem conteúdo (sucesso em deleção)
- `400` - Requisição inválida
- `401` - Não autorizado (falta header de autenticação)
- `403` - Proibido (chave de admin inválida)
- `404` - Não encontrado
- `409` - Conflito (recurso duplicado)
- `429` - Muitas requisições (rate limit excedido)
- `500` - Erro interno do servidor

### Rate Limiting

O endpoint `/api/v1/ask` tem rate limiting de **10 requisições por minuto** por IP.

## 🧪 Testes

```bash
# Todos os testes
npm test

# Com coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Teste específico
npm test -- ask.service.test.ts
```

### Estatísticas de Testes

- **Total de Testes**: 183
- **Suites**: 14
- **Coverage**: 100% dos casos de integração
- **Tempo de Execução**: ~8-12s

### Estrutura de Testes

```
tests/
├── adapters/              # Testes dos adapters de IA
├── controllers/           # Testes dos controllers
├── integration/           # Testes de integração end-to-end
├── middlewares/           # Testes de middlewares
├── repositories/          # Testes de repositórios
├── services/              # Testes de serviços
└── utils/                 # Testes de utilitários
```

## 🐳 Docker

### Dockerfile (Multistage Build)

O projeto inclui um Dockerfile otimizado com multistage build:

```bash
# Build da imagem
docker build -t kudileya-api .

# Executar container
docker run -p 3000:3000 --env-file .env kudileya-api
```

### Docker Compose

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### Características da Imagem Docker

- **Multistage Build**: Imagem final minimalista (~150MB)
- **Alpine Linux**: Base leve
- **Non-root User**: Executa com usuário node para segurança
- **Health Check**: Verifica se a API está respondendo
- **Variáveis de Ambiente**: Configurável via .env

## 🔒 Segurança

### Autenticação Admin

Todas as operações de escrita (POST, PUT, DELETE) requerem o header:

```http
x-admin-key: your-secure-admin-key
```

### Boas Práticas

1. **Nunca commite** o arquivo `.env` com chaves reais
2. Use **chaves fortes** para `ADMIN_KEY` (mínimo 32 caracteres)
3. Configure **CORS** adequadamente para produção
4. Use **HTTPS** em produção
5. Mantenha as **dependências atualizadas**
6. Monitore os **logs** regularmente
7. Configure **rate limiting** apropriado para seu caso de uso

### Headers de Segurança

A API já inclui:
- CORS configurável
- Rate limiting
- Validação de entrada com Zod
- Sanitização de erros (não expõe stack traces em produção)

## 📝 REST Client (doc.http)

O projeto inclui um arquivo `doc.http` com exemplos de todas as requisições. Para usar:

1. Instale a extensão **REST Client** no VS Code
2. Abra o arquivo `doc.http`
3. Clique em "Send Request" acima de cada requisição

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

### Guidelines

- Mantenha os testes em 100%
- Siga os padrões de código (use `npm run format`)
- Documente novas features
- Adicione testes para novos recursos

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🙏 Agradecimentos

- [Fastify](https://fastify.io/) - Framework web de alta performance
- [Zod](https://zod.dev/) - Validação de schemas TypeScript-first
- [Pino](https://getpino.io/) - Logger extremamente rápido
- [Jest](https://jestjs.io/) - Framework de testes delicioso

## 📧 Contato

Para dúvidas ou sugestões, abra uma [issue](https://github.com/seu-usuario/api-kudileya-backend/issues).

---

**Desenvolvido com ❤️ e TypeScript**
