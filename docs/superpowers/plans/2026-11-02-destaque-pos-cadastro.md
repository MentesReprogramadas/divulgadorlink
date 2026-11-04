# Funil de destaque Implementation Plan
> For agentic workers: usar superpowers:subagent-driven-development conforme divisão abaixo; sem commits.
**Goal:** implementar contrato aprovado de oferta pós-cadastro no site real.
**Architecture:** campanha e preço pertencem ao servidor; frontend recebe catálogo/termos e apresenta seleção e feedback. Reusar checkout, confirmação e moderação existentes.
**Tech Stack:** Next15/React19/CSS Modules; Fastify/Prisma/PostgreSQL; Vitest/Playwright.
**Spec:** docs/superpowers/specs/2026-11-02-destaque-pos-cadastro.md

## Restrições
Não tocar nas alterações do workspace original; sem novas bibliotecas. Sem git commit/push/deploy. Gates de dono, tenant, sessão, suspensão e idade permanecem. Usuário mudou explicitamente comportamento de revisão na jornada comercial: aprovação automática com limiar0.

## Revisão de falhas
Validade e centavos no servidor; corrida de emissão por conta; cobrança duplicada/retries; Home proibida; alteração de seleção por card/teclado/fluxo responsivo.

## Tarefas
- [x] Backend: escrever e executar testes que falham para20%, expiração/cooldown, autorização e revisão automática; implementar domínio, persistência/migração, endpoints, preços e integração checkout/pagamento; rodar testes e checks backend.
- [x] Checkout frontend: testes para preços promocionais e seleção pelo card; implementar UI mobile/desktop, Home imediatamente acima dos botões, resumo dinâmico e captura de falhas sem perder seleção; preservar Pix/cartão/renovação.
- [x] Integração frontend: cadastro mostra convite sem redirecionamento automático; Meus links CTA52px com megafone; retenção e lembrete com expiração absoluta; não criar interrupções repetidas na sessão.
- [x] Verificação: E2E real com banco/cache próprios e gateway stub, screenshots desktop/mobile, teclado/320/zoom/semântica; lint/typecheck/test/build nos dois pacotes; revisão independente e corrigir achados.


## Registro de execução
- Ruling: branch da origin/main atualizada e worktree isolado — milhares de alterações no workspace original — preserva trabalho anterior.
- Ruling: campanha24h/cooldown30dias conforme proposta aprovada; servidor mantém prazo e preços.
- Ruling: aprovação automática com limiar0 segue política já existente, sem esperar fila; pagamento ativa superfícies. Não revoga outras proteções.
- Revisão independente: corrigidos retomada de cartão e resumo de cobrança pendente. Reavaliação sem bloqueadores.
- Checks/capturas e limites: docs/frontend-profissional/evidencias/destaque-pos-cadastro-implementacao-2026-11-02.md. Nenhum commit/push/deploy.
