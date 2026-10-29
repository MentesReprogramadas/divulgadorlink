# Central de afiliados e WhatsApp Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Não criar commits, push ou deploy. Workspace C:/VSCODE/temlink-afiliados.

**Goal:** Central administrativa funcional para segmentações, grupos, ofertas Mercado Livre, broadcasts e convites com expansão.
**Architecture:** Fastify/Prisma existentes; adaptadores externos, domínio puro, fila durável drenada pelo worker e UI por feature.
**Tech Stack:** PostgreSQL, Prisma 6, Fastify 5, Next 15, React 19, CSS Modules, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-10-28-afiliados-whatsapp-design.md

## Global Constraints
Preservar alterações da árvore original, isolamento de tenant, admin ACTIVE, BFF/CSRF, marca e regras comerciais existentes. Sem custos, envio real ou novas bibliotecas de UI. Segredos cifrados e nunca serializados.

## Review Focus
Concorrência de expansão; falha após aceite remoto; retry parcial; revogação de admin/tenant; preço expirado/token OAuth inválido.

### Task 1: Persistência, Evolution, distribuição e convites (raiz)
- [x] Consultar grafo e confirmar consumidores atuais; registrar análise de VHG.
- [x] Escrever modelos/migration e testes de validação, transições, concorrência e autorização.
- [x] Adaptador Evolution com timeouts, respostas validadas e servidor fixo.
- [x] Serviços/rotas para dashboard, CRUD, importar/sincronizar grupos, envio agendado/idempotente, resolução explícita e convite público.
- [x] Integrar drain no worker, configurar env e documentação operacional.

### Task 2: Catálogo e afiliação (subagente)
- [x] Ler referência ML/affiliate e escrever testes de preços, OAuth, falhas e validação de URL.
- [x] Implementar conector, serviço de conexão e rotas catalog conforme spec; reusar AffiliateConnection e cipher existente. Não editar schema/worker/rotas raiz.
- [x] Testar conexão/status/search/link sem contas reais; documentar variáveis necessárias.

### Task 3: Painel e entrada pública (subagente)
- [x] Ler design system, skills visuais e contratos, integrar navegação admin com ícone exclusivo.
- [x] Implementar painel completo responsivo com estados reais/pendências, formulários e histórico, confirmação de envio e resolução incerta.
- [x] Criar entrada pública com POST explícito, noindex, URL copiável e integração via URL comum de Minha Página.
- [x] Testes unitários, E2E isolado e capturas desktop/mobile.

### Task 4: Revisão e fechamento
- [x] Revisão independente de segurança/contratos; corrigir problemas.
- [x] Executar checks backend/frontend, PostgreSQL/E2E e inspeção real. Registrar resultados e falhas prévias.
- [x] Atualizar grafo incremental code-only; registrar limites, configuração e reversão.
