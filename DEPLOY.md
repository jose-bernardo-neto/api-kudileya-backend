# 🚀 Deploy em Produção - Kudileya API

## ⚠️ ERRO: "AI provider is not available"

Este erro acontece porque o **Gemini não está configurado corretamente**.

### 📋 Passos para Resolver

#### 1️⃣ **Obter API Key do Gemini**

```bash
# Acesse: https://makersuite.google.com/app/apikey
# Crie uma nova API key
# Copie a chave gerada
```

#### 2️⃣ **Configurar no Servidor de Produção**

**Opção A: Variáveis de Ambiente Diretas**

```bash
# No servidor onde está rodando o Docker
export GEMINI_API_KEY="sua-chave-real-aqui"
export AI_PROVIDER="gemini"
export ADMIN_KEY="sua-admin-key-segura"

# Reiniciar o container
docker-compose down
docker-compose up -d
```

**Opção B: Arquivo .env (Recomendado)**

```bash
# 1. Copie o arquivo .env.production para .env
cp .env.production .env

# 2. Edite o .env e adicione suas chaves reais
nano .env  # ou vim .env

# 3. Suba o container
docker-compose up -d
```

#### 3️⃣ **Usar Mock Provider (Temporário)**

Se você **não tem** a API key do Gemini ainda:

```bash
# No servidor
export AI_PROVIDER="mock"
export ADMIN_KEY="qualquer-chave-aqui"

# Reiniciar
docker-compose down
docker-compose up -d
```

O Mock Provider retorna respostas simuladas - útil para testes.

---

## 🔧 Verificar Configuração

```bash
# Ver logs do container
docker logs kudileya-api -f

# Deve mostrar:
# ✅ "🤖 AI Provider: gemini" (ou mock/openai)
# ✅ "🚀 Server is running on http://0.0.0.0:3333"
# ✅ "📝 Environment: production"

# Testar health check
curl http://localhost:3333/health

# Testar endpoint de IA
curl -X POST http://localhost:3333/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "O que é inteligência artificial?"}'
```

---

## 🎯 Exemplo de .env Completo

```bash
# ADMIN
ADMIN_KEY=minha-chave-admin-super-secreta-123

# AI PROVIDER (escolha um)
AI_PROVIDER=gemini

# GEMINI
GEMINI_API_KEY=AIzaSy...sua-chave-real-aqui
GEMINI_MODEL=gemini-2.0-flash-exp

# OPENAI (alternativa)
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...sua-chave-openai
# OPENAI_MODEL=gpt-3.5-turbo

# RATE LIMIT
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# LOG
LOG_LEVEL=info
```

---

## 🐛 Troubleshooting

### Erro: "AI provider is not available"

- ✅ Verifique se `GEMINI_API_KEY` está definida
- ✅ Verifique se a chave é válida (teste em https://makersuite.google.com/)
- ✅ Use `AI_PROVIDER=mock` temporariamente

### Erro: "503 Service Unavailable"

- ✅ Normal! Gemini tem alta demanda às vezes
- ✅ Aguarde alguns segundos e tente novamente
- ✅ API retorna mensagem clara: "This is a temporary issue"

### Erro: "Rate limit exceeded"

- ✅ Normal! Você atingiu o limite de 10 req/15min
- ✅ Ajuste `RATE_LIMIT_MAX` e `RATE_LIMIT_WINDOW` se necessário

---

## 📊 Monitoramento

```bash
# Ver logs em tempo real
docker logs -f kudileya-api

# Ver últimas 100 linhas
docker logs kudileya-api --tail 100

# Ver health status
docker inspect kudileya-api --format='{{.State.Health.Status}}'
```

---

**✨ Após configurar, teste:**

```bash
curl -X POST https://kudileya.ddns.net/api/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Olá! Como você pode me ajudar?"}'
```
