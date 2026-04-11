# ==================================
# Stage 1: Dependencies
# ==================================
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copiar apenas arquivos de dependências
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Instalar dependências de produção e desenvolvimento
RUN pnpm install --no-frozen-lockfile

# ==================================
# Stage 2: Builder
# ==================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=dependencies /app/node_modules ./node_modules

# Copiar código fonte e configurações
COPY . .

# Build da aplicação TypeScript
RUN npm run build

# Remover arquivos desnecessários
RUN rm -rf src tests *.md

# ==================================
# Stage 3: Runner (Produção)
# ==================================
FROM node:18-alpine AS runner

# Metadados
LABEL maintainer="support@kudileya.com"
LABEL version="1.0.0"
LABEL description="Kudileya AI Assistant API"

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 fastify

WORKDIR /app

# Copiar apenas arquivos necessários para produção
COPY --from=builder --chown=fastify:nodejs /app/dist ./dist
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=fastify:nodejs /app/package.json ./package.json

# Criar diretórios necessários
RUN mkdir -p data uploads \
    && chown -R fastify:nodejs data uploads

# Mudar para usuário não-root
USER fastify

# Expor porta
EXPOSE 3333

# Variáveis de ambiente padrão
ENV NODE_ENV=production \
    PORT=3333 \
    HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3333/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
