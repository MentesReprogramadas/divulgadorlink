# Plano de implementação F14 Agendamento de links

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 14.

**Estado:** S0–S6 validadas localmente; S7 EM REVISÃO por CI/liberação remotos pendentes.
**Spec vinculante:** [F14](../specs/f14-agendamento.md).  
**Dependências:** G00, [F09](../specs/f09-perfil-publico.md), [F11](../specs/f11-planos-perfis.md).
**Onda:** 3. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

controlar a exibição de botões em eventos, inscrições e campanhas.

Contrato reconciliado: PATCH `/api/v1/me/profile` com `items[].schedule`, reaproveitando versão/autosave; GET privado informa capacidade/relógio, prévia privada aceita `at`, público filtra no servidor e informa próxima fronteira. Nenhuma rota paralela por item. Ver spec e [execução F14](../execucao-f14.md).

Dados: startsAt/endsAt UTC e timezone IANA no item; função de elegibilidade usada pelo renderer, busca, exportações públicas e resolvers; jobs apenas quando necessários à invalidação.

Checklist original preservado como obrigações a validar; as propostas de caminhos foram reconciliadas na spec. A implementação atual foi autorizada pelo usuário. Sem push/deploy nesta continuação; provas remotas e liberação seguem separadas.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/domain/state/transition.ts`.
- `frontend/src/domain/format.ts`.
- `frontend/src/components/ui/input.tsx`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Profiles/agendamento.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Profiles/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/agendamento-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/agendamento.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/profiles/agendamento.spec.ts`; C `frontend/src/components/domain/agendamento.test.tsx`; I `backend/src/http/agendamento.http.spec.ts`; PG `backend/src/http/agendamento.pg.spec.ts`; E `frontend/e2e/agendamento.spec.ts`.

## F14-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F14-AC01, F14-AC02, F14-AC03, F14-AC04; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D16 convenção de intervalo e comportamento de datas ambíguas em fuso.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `startsAt UTC|null,endsAt UTC|null,timeZone,paused,expectedVersion` e saída `schedule,serverNow,effectiveVisibility,nextBoundary`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Definir início/fim no fuso visível, pausar e pré-visualizar agora/antes/depois.
- [x] Definir fixture F14, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F14-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/profiles/agendamento.spec.ts` cada cenário U da spec: Janela [início,fim): exato início visível e exato fim oculto; fim anterior ao início inválido; pausa prevalece; ocultar botão não revoga handle permanente.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/components/domain/agendamento.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório backend:** `npx vitest run src/domain/profiles/agendamento.spec.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/agendamento.test.tsx`.

## F14-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: startsAt/endsAt UTC e timezone IANA no item; função de elegibilidade usada pelo renderer, busca, exportações públicas e resolvers; jobs apenas quando necessários à invalidação.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: page.clock só controla browser, não worker/Postgres; testar fronteira servidor com tempo injetável.

## F14-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue PATCH /api/v1/me/profile/items/:id/schedule; resposta inclui horário efetivo; público não recebe itens fora da janela.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F14-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Definir início/fim no fuso visível, pausar e pré-visualizar agora/antes/depois.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F14-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Mesmo relógio de servidor decide SSR e API; cache expira no próximo limite; schedule de outro tenant negado.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/agendamento.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no backend:** `npx vitest run src/http/agendamento.http.spec.ts`.  
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/agendamento.pg.spec.ts`; registrar também na suíte completa.

## F14-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/agendamento.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Esses projetos são propostos, não existentes na baseline.
- [x] Implementar E01 sem mockar API interna: Agendar item com fixture de relógio servidor; antes ausente, início visível, fim ausente; recarregar não traz botão de cache; handle continua conforme política.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/agendamento.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F14-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [ ] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: page.clock só controla browser, não worker/Postgres; testar fronteira servidor com tempo injetável.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [ ] F14-AC01, F14-AC02, F14-AC03, F14-AC04 aprovados, com testes Tnn rastreados.
- [ ] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [ ] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [ ] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro inicial:** responsável não atribuído; commit de implementação inexistente; resultados NÃO EXECUTADOS; liberação NÃO AUTORIZADA por este documento.


## Resultado local reconciliado

S0–S6 atendidas pelo contrato e caminhos reais da spec: sem escritor paralelo por item, sem fila nova, preservando autosave/publicação e histórico. 494 U backend, 287 U frontend, 219 PG, 85 E2E de regressão e 6 finais sobrepostos; 18 capturas inspecionadas. Evidências/alternativas/reversão em [execução F14](../execucao-f14.md). Checklists remotos S7 permanecem pendentes; nenhuma sugestão histórica de arquivo implica criar módulo vazio.
