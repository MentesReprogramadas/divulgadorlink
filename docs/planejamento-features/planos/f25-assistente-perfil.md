# Plano de implementação F25 Assistente de criação de perfil

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 29.

**Estado:** implementado e verificado localmente até S6; S7 remoto em revisão. Parada após F25.
**Spec vinculante:** [F25](../specs/f25-assistente-perfil.md).  
**Dependências:** G00, [F09](../specs/f09-perfil-publico.md), [F16](../specs/f16-templates.md), [F17](../specs/f17-importacao-lote.md).  
**Onda:** 4. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

facilitar a publicação do primeiro perfil.

Contrato a entregar: POST /api/v1/me/profile/suggestions; POST /suggestions/:id/apply com campos escolhidos e versão de draft.

Dados: ProfileSuggestion temporária, baseada apenas nos dados fornecidos; porta de geração separada dos adapters de moderação/embedding, sem fingir que fazem geração; limites de tokens/custo.

Execução autorizada pelo pedido F22 → F23 → F25. Os requisitos abaixo foram conferidos conforme registro de execução; a existência deste plano não autoriza liberação remota. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Evidência e implementação efetiva

[Registro auditável](../execucao-f25.md). GET/POST /api/v1/me/profile/suggestions; GET/DELETE /:id; POST /:id/preview e /:id/apply. Entrada: name/slug (iguais ao rascunho existente), activity, providedFacts, linkIds, linksText, expectedVersion, requestKey. Saída schemaVersion 1, provenance, validation, content e quota; aplicação devolve rascunho com versão. Campos selecionáveis bio/groups/order/appearance, bio manual e template existente opcionais. Geração/descarte não salvam página nem publicam. Aplicação transacional, idempotente e com versão esperada, preservando campos omitidos. Reutiliza parser F17, modelos F16, renderer de prévia existente e writeDraft. Porta própria de geração; não reutiliza moderação como gerador. Seção global assistant permite consultar/aplicar rascunho, sem conceder editor manual/publicação. Cinco tentativas/dia UTC, reserva técnica e tokens/custo estimado; sugestões 24h, uso agregado 180 dias. Modelo/limites/dados e alternativas em D27 no registro de execução. Chave/acesso reais da conta e cobrança do provedor não foram ensaiados.

Arquivos efetivos: backend/src/domain/profiles/profile-suggestion.ts, backend/src/repositories/profile-suggestions.ts, frontend/src/features/profile-assistant/, frontend/e2e/profile-assistant.spec.ts. HTTP/PG: backend/src/http/profile-suggestions.pg.spec.ts. Migrations aditivas: 20261019150000_profile_suggestions. Nomes sugeridos anteriormente abaixo são referências do inventário, sem obrigação de duplicar arquivos.

Domain RED comportamental registrado, GREEN e componentes/PG/E2E reais. Casos sem fila não criam worker artificial; expurgo usa worker existente. CI e publicação não executados. Banco pessoal/ambiente externo preservados. Migrações exercitadas em bancos descartáveis; conferir/aplicar no ambiente alvo durante liberação autorizada.

## Arquivos e pontos de integração

- Domínio: backend/src/domain/profiles/profile-suggestion.ts e .spec.ts.
- Persistência: backend/src/repositories/profile-suggestions.ts; schema Prisma e migration aditiva.
- API: backend/src/http/controllers/@Profiles/suggestion-routes.ts.
- UI: frontend/src/features/profile-assistant/, CSS Module local, rota do painel, navegação e skeleton compartilhados.
- HTTP com PG real: backend/src/http/profile-suggestions.pg.spec.ts.
- E2E: frontend/e2e/profile-assistant.spec.ts nos projetos features e features-mobile.
- Reúso e lacunas concretas: consultar o registro S0 da execução, incluindo prévia/publicação existentes, F12/F16/F17 e a separação de dados pessoais ou de geração conforme a feature.

## F25-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F25-AC01, F25-AC02, F25-AC03, F25-AC04, F25-AC05; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D27 provedor/modelo, orçamento, política de dados e validação de fatos; seleção externa antes de integrar.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `activity,providedFacts,linkIds; apply{suggestionId,selectedFields,expectedVersion}` e saída `suggestion{schemaVersion,fields,provenance,validation},quota; apply retorna draftVersion`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Informar atividade/URLs, gerar sugestão, editar/descartar e aplicar ao rascunho; publicar sempre explícito.
- [x] Definir fixture F25, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F25-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/profiles/profile-suggestion.spec.ts` cada cenário U da spec: Saída fora do schema recusada; credencial/número não informado não aceito como fato; campos omitidos não sobrescrevem conteúdo; limite excedido bloqueia chamada.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/profile-assistant/assistant-review.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando local, diretório backend:** `npx vitest run src/domain/profiles/profile-suggestion.spec.ts`.
**Comando local, diretório frontend:** `npx vitest run src/features/profile-assistant/assistant-review.test.tsx`.

## F25-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: ProfileSuggestion temporária, baseada apenas nos dados fornecidos; porta de geração separada dos adapters de moderação/embedding, sem fingir que fazem geração; limites de tokens/custo.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Novo adapter é justificado por capacidade de geração diferente; reutilizar padrão de porta sem acoplar IA ao controller.

## F25-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue POST /api/v1/me/profile/suggestions; POST /suggestions/:id/apply com campos escolhidos e versão de draft.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F25-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Informar atividade/URLs, gerar sugestão, editar/descartar e aplicar ao rascunho; publicar sempre explícito.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F25-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Provedor simulado retorna JSON inválido/timeout e mantém draft; quota debitada de forma definida; aprovar sugestão não publica nem aprova catálogo.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/profile-suggestions.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando local no backend:** `npx vitest run src/http/profile-suggestions.pg.spec.ts`.
**PG local, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/profile-suggestions.pg.spec.ts`; registrar também na suíte completa.

## F25-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/profile-assistant.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Ambos os projetos existentes foram usados.
- [x] Implementar E01 sem mockar API interna: Solicitar sugestão com adapter determinístico local, editar bio e aplicar; conferir visitante sem mudança; descartar segunda sugestão mantém draft.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando local, frontend:** `npx playwright test e2e/profile-assistant.spec.ts --project=features`.
**Mobile local:** mesmo arquivo com `--project=features-mobile`.

## F25-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [x] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Novo adapter é justificado por capacidade de geração diferente; reutilizar padrão de porta sem acoplar IA ao controller.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F25-AC01, F25-AC02, F25-AC03, F25-AC04, F25-AC05 aprovados, com testes Tnn rastreados.
- [x] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro atual:** responsável Codex; alterações locais sem novo commit. S0–S6 verificadas; ver [execucao-f25.md](../execucao-f25.md) e evidências JSON. S7/CI/liberação remota pendentes. Não confundir prontidão local com produção.



## Delta autorizado de UX — 19/10/2026

[Refinamento executado e validação](../refinamento-f22-f23-f25.md): novos pontos de entrada, configuração integrada, seleção guiada/revisão e prévia reutilizada. Este delta prevalece sobre instruções antigas de navegação. Preserva os ACs e contratos comerciais/de acesso existentes; sem backend ou migração novos. Provas históricas permanecem nos JSONs originais; o refinamento tem evidência própria. S7 remoto continua pendente.
