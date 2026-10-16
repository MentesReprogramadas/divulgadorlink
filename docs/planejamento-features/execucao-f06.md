# F06 — denúncias

Execução iniciada em 15/10/2026 na branch `codex/roadmap-features`, após implementação de F01 e regressão local de 54 E2E aprovada. F01 recebe ainda o fechamento de cache/rede e CI. Nenhuma implantação autorizada.

## S0 e decisão D07

Primeira versão exige conta ativa e sessão existente para enviar denúncia. O botão fica no detalhe público e conduz à área autenticada, conservando o link de origem ao entrar. A escolha permite deduplicação durável por conta sem introduzir fingerprint, IP persistido, captcha ou provedor novo. Não exigir compra, vaga de publicação ou condição comercial. Denúncia anônima não será anunciada.

Controle técnico de abuso: até dez novas denúncias por conta/tenant em janela móvel de 24 horas; repetição do mesmo motivo/link nessa janela retorna o protocolo existente e não consome nova entrada. Serialização no PostgreSQL impede contornar o limite com requisições concorrentes. O limite protege a operação, não é quota de publicação ou benefício de plano. Comentário opcional até 500 caracteres; a interface orienta a não enviar dados pessoais.

Preservar o histórico como os registros de moderação/auditoria existentes, sem criar expurgo por prazo inventado. Armazenar chave pseudônima HMAC do ator para deduplicação, sem nome, contato ou IP do denunciante no DTO. Comentário e motivos são privados para a administração; envio retorna somente protocolo, estado e data. Não publicar contagem ou identificação de denunciantes. Política de remoção de dados continua a existente; não ampliar retenção de analytics.

Motivos: convite expirado e destino indisponível são DISPONIBILIDADE; spam e conteúdo incompatível são CONTEÚDO. Estados RECEIVED → IN_REVIEW → RESOLVED, permitindo também resolver recebido diretamente. Sem reabertura nesta entrega. Toda decisão exige justificativa e versão esperada, com AuditLog na mesma transação. Conflito 409 não grava outra decisão. Resolver uma denúncia não altera LinkStatus; eventual intervenção no conteúdo permanece no fluxo de moderação existente. Nenhum volume provoca retirada automática.

## Reuso e fronteiras

`ModerationCase` e contestação do dono não representam denúncia de visitante. Modelo próprio `LinkReport` é necessário para motivo, estado, deduplicação e versão. Reusar AuditLogsRepository transacional, sessão/CSRF, resolveTenant, controles do formulário e layout administrativo. Regra pura no domínio; porta de reports e adapter Prisma com autorização atual no servidor; apresentação em features/moderation. Sem nova fila, SDK ou dependência.

Rotas: POST `/api/v1/links/:id/reports`; GET `/api/v1/admin/reports`; PATCH `/api/v1/admin/reports/:id/decision`. Fila com filtros de tipo/estado, cursor e limite controlado. ADMIN atual/ativo do tenant, sem confiar somente no papel do token. Erros e cache seguem o envelope e os padrões locais. Detalhe público não expõe a fila.

## Direção visual e referências

Manter o detalhe e a identidade atuais; denúncia é ação secundária após acesso ao link. Formulário curto com motivo, comentário e confirmação com protocolo. Fila administrativa separa contexto, relato e decisão, com filtros de conteúdo/disponibilidade e histórico de auditoria.

Referências primárias consultadas: [GitHub: reporting abuse](https://docs.github.com/en/communities/maintaining-your-safety-on-github/reporting-abuse-or-spam), para ação contextual e seleção de motivo, e [managing reported content](https://docs.github.com/en/communities/moderating-comments-and-conversations/managing-reported-content-in-your-organizations-repository), para separar triagem do conteúdo e resolução do relato. Não copiar identidade ou a regra de reabertura desse produto. Refero indisponível; a composição local de moderação é a referência dominante.

## Validação planejada

U01 motivo inválido; U02 janela/deduplicação; U03 cem relatos sem efeito em LinkStatus; U04 terminalidade/versionamento. C01 formulário/loading/erro/envio duplicado e fila vazia; C02 ausência de conteúdo privado/ações sem permissão. PG/HTTP: limite 429 concorrente, decisão+audit atômicos com rollback, versão concorrente, tenant cruzado, ator suspenso/despromovido, histórico preservado e classificação. E01 envio real → fila admin → decisão → reload, E02 acesso negado e payload privado, E03 mobile/teclado/rede offline real e recuperação. Registrar resultados antes de fechar os gates.

## Implementação e evidências locais

Domínio em `backend/src/domain/moderation/report.ts`, porta/caso de uso em `use-cases/@Moderation/link-reports.ts`, adapter em `repositories/link-reports-repository.ts` e controller em `http/controllers/@Moderation/reports.ts`. Interface em `frontend/src/features/moderation`, rotas `/painel/denunciar/[id]` e `/admin/denuncias`. Login reutiliza a sessão existente e aceita retorno somente para o caminho interno estrito de denúncia; suspensão e verificação conservam precedência.

Testes de domínio, formulário e retorno de autenticação falharam antes das implementações e passaram após a regra. Evidências em `evidencias/F06/2026-10-15/`. Resultados finais locais, sem skips:

- Backend: lint, typecheck e build aprovados; 372 unitários em 91 arquivos; 72 testes PostgreSQL em 9 arquivos, incluindo 11 novos de F06.
- Frontend: lint, typecheck e build aprovados; suíte de 165 testes em 47 arquivos. Após o ajuste final de composição, lint/typecheck e os quatro testes do formulário passaram novamente.
- Regressão Playwright completa: **60 testes aprovados** (48 baseline, seis F01 e seis F06). Após o ajuste de largura, **7 testes aprovados** na seleção F06 com setup, desktop e mobile.
- E2E usa API/BFF/PostgreSQL reais: envio, duplicata, decisão, reload, histórico, acesso negado, payload privado, teclado e recuperação offline. Sem interceptar a API interna. PG comprova 100 denunciantes sem alterar publicação, limite concorrente, deduplicação, decisão concorrente e rollback de auditoria.

As primeiras falhas E2E foram do helper tentando abrir login com sessão ativa e do cliente Node sem resolução de `reports.localhost` no Windows. Correções: sair pela interface antes da troca de ator e realizar a leitura de privacidade pelo fetch do navegador no mesmo host. Não mudar contrato ou relaxar asserções; execuções posteriores passaram. Logs da primeira falha permanecem no checkout, sem tokens publicados.

## Migração, consulta e reversão

`20261016100000_link_reports` cria modelo separado, FKs compostas por tenant, checks de classificação/estado/versão e índices de fila/janela. `20261016100100_report_key_comparison` muda CHAR para VARCHAR(64): o cast de comparação de CHAR com o parâmetro textual impedia o aproveitamento completo do índice. A segunda migration preserva a primeira já aplicada.

Ensaio em banco descartável preservou a projeção dos links antigos, recusou classificação incompatível e manteve histórico ao simular retorno à aplicação anterior. EXPLAIN/ANALYZE com 10.001 linhas sintéticas confirmou o índice tenant/reporterKey/data sem forçar o otimizador. Nenhum dado de produção usado. Log em `f06-migration-proof.log`.

Rollout futuro: aplicar migrations antes do código, conferir fila/limite/decisão e acompanhar falhas HTTP, 429 e conflitos 409. Reversão restaura a aplicação anterior e conserva tabelas, índices e registros; não executar DROP/reset. O retorno do login é opcional e não exige migração dos consumidores antigos. Não houve deploy nem alteração de main.

## Revisão visual e acessibilidade aplicável

Capturas desktop/mobile e 320px inspecionadas. Chrome DevTools confirmou a jornada real e `noindex, nofollow`, sem overflow em 390px com fonte a 200%. Labels, foco após erro/sucesso e teclado exercitados no runner. Texto secundário usa o token existente, rgb(92,107,127) sobre branco, contraste 5,43:1. Não equivale a auditoria completa de acessibilidade nem teste em aparelho físico.

A inspeção identificou a regra global `.panel-page form` removendo o limite de largura. A composição foi ajustada com wrapper de responsabilidade local, sem aumentar especificidade nem refatorar globals.css. Medição no build final: formulário de decisão com 760px no desktop e largura adaptada no mobile. Captura manual foi vista inline; o MCP negou gravação fora de suas raízes, portanto apenas capturas do runner estão persistidas.

## Mapa de aceitação

AC01/T01: PG duplicatas concorrentes, 12 envios com limite de dez, expiração da janela; domínio valida motivo e terminalidade. AC02/T02: 100 contas reais denunciam via HTTP e Link permanece PUBLISHED, sem ModerationCase. AC03/T03: decisão com versão e justificativa, audit atômico, concorrência e falha injetada; E01 confirma persistência e histórico. AC04/T04: classificação e filtros distintos com constraints PG. AC05/T05: histórico terminal preservado, leitura após recarga, recibo repetido sem sobrescrever comentário original.

S0–S6 aprovados localmente. S7 em revisão até CI do commit desta entrega passar; não presumir sucesso do CI de F01 como evidência da F06.
