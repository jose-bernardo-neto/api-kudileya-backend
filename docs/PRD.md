Este documento foi estruturado para ser consumido por um Code Agent (GitHub Copilot). Ele
fornece o contexto técnico e as regras de negócio necessárias para gerar o código seguindo a
stack solicitada.
Product Requirements Document
(PRD) - AI Knowledge Base API
1. Visão Geral
Uma API REST leve para servir como base de conhecimento, permitindo consultas via IA,
gestão de FAQs segmentadas e armazenamento de documentos. O sistema é stateless em
relação a bancos de dados tradicionais, utilizando o sistema de arquivos para persistência.
2. Objetivos
● Prover uma interface de chat/pergunta simples via IA.
● Servir documentos e FAQs com alta performance (cache e paginação).
● Garantir segurança administrativa simples via Header Key.
3. User Stories
ID Usuário Desejo Motivo
US01 Visitante Fazer uma pergunta ao
endpoint /ask
Obter respostas
rápidas baseadas em
IA.
US02 Visitante Listar FAQs por tópicos
com paginação
Encontrar dúvidas
comuns sem
sobrecarregar a rede.
US03 Visitante Listar e baixar
documentos
Ter acesso a manuais
ou arquivos oficiais.
US04 Admin Registrar novas FAQs
e fazer upload de
arquivos
Manter a base de
conhecimento
atualizada.
4. Requisitos Funcionais (RF)
Gerenciamento de FAQ
● RF01: O sistema deve listar FAQs filtradas por tópico.
● RF02: O sistema deve suportar paginação baseada em cursor (ID ou timestamp) para
FAQs e Documentos.
● RF03: O sistema deve permitir o registro de FAQs apenas se o header x-admin-key for
válido.
IA e Documentos
● RF04: O endpoint /ask deve encaminhar a pergunta para um serviço de IA (integração
mockável).
● RF05: O sistema deve permitir upload de arquivos via multer salvando-os localmente.
● RF06: O sistema deve permitir o download de arquivos através de um ID único.
Cache e Persistência
● RF07: Endpoints de leitura (GET) devem implementar cache em memória (TTL de 5
min).
● RF08: Os dados (FAQs e Metadados de documentos) devem ser persistidos em arquivos
.json locais, já que não há DB.
5. Requisitos Não Funcionais (RNF)
● RNF01: Framework: Fastify (performance).
● RNF02: Linguagem: TypeScript.
● RNF03: Testes: Cobertura de testes unitários e de integração com Jest.
● RNF04: Segurança: Autenticação baseada estritamente em Header Token (x-admin-key).
● RNF05: Estilo de Código: Clean Architecture simples (Controller, Service, Repository).
6. Descrição Técnica da API
Base URL: /api/v1
Método Endpoint Proteção Descrição
POST /ask Livre Envia uma pergunta e
retorna resposta da IA.
GET /faqs Livre Lista FAQs (Query:
topic, cursor, limit).
POST /faqs Admin Registra uma nova
FAQ no arquivo JSON.
GET /documents Livre Lista metadados dos
docs (Query: cursor,
limit).
GET /documents/:id Livre Download do arquivo
físico.
POST /documents Admin Upload de arquivo
(Multipart/form-data).
Estrutura do Objeto de Resposta (Paginação)
{
"data": [...],
"next_cursor": "string | null",
"has_more": "boolean"
}
7. Instruções para o Code Agent (Prompt
Complementar)
1. Armazenamento: Crie uma pasta ./data para arquivos JSON e ./uploads para arquivos
físicos.
2. Repositórios: Implemente uma classe JsonRepository que lê/escreve nos arquivos
JSON usando o módulo fs/promises.
3. Middleware de Admin: Crie um hook preHandler no Fastify que valida se
request.headers['x-admin-key'] é igual à variável de ambiente ADMIN_KEY.
4. Paginação: No repositório, use .slice() e .findIndex() para simular o comportamento de
cursor no array de dados carregado do JSON.
5. Cache: Utilize a biblioteca node-cache ou um simples Map com lógica de expiração para
os endpoints GET.
6. Testes: Configure o Jest para rodar testes em arquivos .test.ts. Use fastify.inject() para
testar as rotas sem subir o servidor.
