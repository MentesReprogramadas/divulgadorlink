# Plano de implementação F09 Perfil público com categorias próprias

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 8.

**Estado:** CONCLUÍDO NA BRANCH; S0–S7 e ACs verificados; parada após F09.

[Execução F09](../execucao-f09.md) registra D10 resolvida pelo usuário, contratos reconciliados, reuso, testes, evidências, limites e reversão. Código aba5b14907ec5d4bb794266b768cd282470a3d20; CI 38940575906 aprovado. Parada após F09; F12 não iniciada.
**Spec vinculante:** [F09](../specs/f09-perfil-publico.md).  
**Dependências:** G00, base existente.  
**Onda:** 2. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

permitir que cada divulgador reúna sua presença em uma página compartilhável, no estilo Linktree.

Contrato entregue: GET/PATCH /api/v1/me/profile (identidade/grupos/itens em agregado atômico), preview/publish/unpublish/avatar e GET público /profiles/:slug; detalhes na spec reconciliada.

Dados: Profile, ProfileCategory e ProfileItem com tenantId e ownerId; categoria pessoal não é Niche/Network; ProfileItem pode referenciar Link do catálogo ou URL própria validada; versão mínima draft/published nasce aqui, histórico em F19. Avatar precisa de porta de mídia e limites, sem escolher provedor novo.

O usuário autorizou implementar F09, testar, documentar e parar. Checkboxes indicam obrigação aplicável comprovada ou condição explicitamente inaplicável no registro abaixo; não apenas teste escrito. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Reconciliação de execução

O registro de execução e a spec reconciliada prevalecem sobre nomes/rotas propostos abaixo. HTTP/I/PG compartilham profiles.pg.spec.ts com banco real; U02 está no domínio frontend usado pelos controles; C01/C02 cobrem renderer/editor/recuperação. Provas RED não significam que cada caso de integração foi escrito antes da persistência: a cronologia está explícita na execução.

F09 usa validação síncrona com portas externas, sem novo job. Reentrega/crash de fila, download/QR/TLS/PWA, histórico restaurável, serviço novo e autorização de deploy/cobrança são condicionais não aplicáveis a esta entrega. Checkboxes dessas condições não indicam execução. Traces de falha ficam locais; só JSON/PNG/logs sanitizados entram no Git. Rollout é futuro por ambientes, sem flag nova; reversão mantém os dados. Produção continua fora do escopo.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `frontend/src/components/domain/panel.tsx`.
- `frontend/src/components/ui/input.tsx`.
- `frontend/src/components/domain/age-gate.tsx`.
- `backend/src/domain/links/canonical-url.ts`.
- `backend/src/http/authorize.ts`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Profiles/perfil-publico.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Profiles/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/perfil-publico-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/perfil-publico.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/profiles/profile.spec.ts`; C `frontend/src/features/profiles/components/profile-view.test.tsx`; I `backend/src/http/profiles.pg.spec.ts`; PG `backend/src/http/profiles.pg.spec.ts`; E `frontend/e2e/profiles.spec.ts`.

## F09-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F09-AC01, F09-AC02, F09-AC03, F09-AC04, F09-AC05, F09-AC06; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D10 unicidade de slug por tenant, regras de URL privada no perfil, mídia/limites e conteúdo restrito.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `slug,name,bio,avatarAssetId,categories[{id,name,position}],items[{id,type,label,destination,visible,position}],expectedVersion` e saída `draft{version,validation},publicProfile{slug,publishedRevisionId,categories,items}; sem campos privados`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Aba Perfil edita foto, nome, bio, grupos, ordem e botão principal; prévia usa o mesmo renderer público em /p/:slug.
- [x] Definir fixture F09, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F09-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/profiles/profile.spec.ts` cada cenário U da spec: Slug normalizado e reservado é recusado; ordenar preserva todos os IDs uma vez; oculto não entra na projeção pública; categoria pessoal não altera Niche; URL própria não entra no catálogo automaticamente.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/profiles/components/profile-view.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando executado, diretório backend:** `npx vitest run src/domain/profiles/perfil-publico.spec.ts`.
**Comando executado, diretório frontend:** `npx vitest run src/components/domain/perfil-publico.test.tsx`.

## F09-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: Profile, ProfileCategory e ProfileItem com tenantId e ownerId; categoria pessoal não é Niche/Network; ProfileItem pode referenciar Link do catálogo ou URL própria validada; versão mínima draft/published nasce aqui, histórico em F19. Avatar precisa de porta de mídia e limites, sem escolher provedor novo.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Profile não é Tenant novo; usar projeção pública única para evitar vazar rascunhos.

## F09-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue GET/PATCH /api/v1/me/profile; CRUD /me/profile/categories e items; POST /me/profile/publish; GET /api/v1/profiles/:slug.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F09-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Aba Perfil edita foto, nome, bio, grupos, ordem e botão principal; prévia usa o mesmo renderer público em /p/:slug.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F09-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Publicação atômica com versão esperada; duas contas disputam slug => 409 para uma; avatar inválido não fica público; item externo passa validação/moderação sem consumir slot de catálogo indevido.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/profiles.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando executado no backend:** `npx vitest run src/http/perfil-publico.http.spec.ts`.
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/perfil-publico.pg.spec.ts`; registrar também na suíte completa.

## F09-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/profiles.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Os dois projetos existem e descobrem os testes F09, conforme relatório final.
- [x] Implementar E01 sem mockar API interna: Criar perfil com duas categorias e um link oculto; prévia, publicar, abrir como visitante e verificar ordem/ocultação; editar como outro dono deve falhar.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando executado, frontend:** `npx playwright test e2e/profiles.spec.ts --project=features`.
**Mobile executado:** mesmo arquivo com `--project=features-mobile`.

## F09-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [x] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [x] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [x] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Profile não é Tenant novo; usar projeção pública única para evitar vazar rascunhos.
- [x] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [x] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [x] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [x] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [x] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F09-AC01, F09-AC02, F09-AC03, F09-AC04, F09-AC05, F09-AC06 aprovados, com testes Tnn rastreados.
- [x] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [x] Roadmap e evidências completos; aceitação final registrada.

**Registro final:** Codex; código aba5b14907ec5d4bb794266b768cd282470a3d20; CI 38940575906 aprovado; evidências em execução F09. Parada após F09; sem main/deploy.

