# Plano de implementação F37 Botão com alternativas de acesso

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 21.

**Estado:** S0–S6 verificadas localmente em 18/10/2026; S7 em revisão.  
**Spec vinculante:** [F37](../specs/f37-alternativas-acesso.md).  
**Dependências:** G00, [F09](../specs/f09-perfil-publico.md), [F12](../specs/f12-link-permanente.md), [F19](../specs/f19-historico-versoes.md).  
**Onda:** 3. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

permitir que o visitante escolha o canal pelo qual deseja acessar uma comunidade.

Contrato a entregar: CRUD grupo/canais em /api/v1/me/profile/channel-groups/:id, com listagem própria e seleção em /api/v1/me/profile/channel-destinations; projeção pública retorna apenas canais elegíveis.

Dados: ChannelGroup tipado reutiliza ProfileItem e destinos versionados de F12; escolha humana, não algoritmo de distribuição.

As marcações registram a execução autorizada; gates remotos pendentes não autorizam deploy. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/domain/links/network-host.ts`.
- `frontend/src/components/ui/button.tsx`.
- `frontend/src/components/domain/link-meta.tsx`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos implementados e justificativa

- `backend/src/domain/profiles/profile-channels.ts` e `backend/src/repositories/profiles-repository.ts`.
- `backend/src/http/controllers/@Profiles/routes.ts` (ampliado).
- `backend/src/repositories/profile-channels-storage.ts` e `backend/src/repositories/profiles-repository.ts`.
- `frontend/src/features/profile-channels/channel-choices.tsx` e `frontend/src/features/profile-channels/channels-screen.tsx`.

Foram ampliados os módulos existentes de publicação, prévia, histórico e medição; novos módulos isolam somente domínio, metadata e composição dos canais. Testes: U `backend/src/domain/profiles/profile-channels.spec.ts`; C `frontend/src/features/profile-channels/channel-choices.test.tsx`; I `backend/src/http/profile-channels.pg.spec.ts`; PG `backend/src/http/profile-channels.pg.spec.ts`; E `frontend/e2e/profile-channels.spec.ts`.

## F37-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F37-AC01, F37-AC02, F37-AC03, F37-AC04, F37-AC05, F37-AC06; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D39 resolvida: até oito canais por grupo, fontes próprias F12 aprovadas, rede verificada, pausa a publicar, disponibilidade revalidada no clique e metadata associada a revisões F19.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `name,visible,channels[{id,label,networkId,destinationRevisionId,paused}],expectedVersion` e saída `channelGroups[{id,name,channels[{id,label,network,href}]}],publishedRevisionId`; href assinado tem propósito próprio, distinto de analytics/surfaceToken; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Mostrar alternativas rotuladas WhatsApp/Telegram/site; dono pode pausar cada canal.
- [x] Definir fixture F37, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F37-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/profiles/profile-channels.spec.ts` cada cenário U da spec: Canal pausado/indisponível ausente ou desabilitado conforme contrato; nome da rede combina com destino; nenhum canal => estado claro.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/profile-channels/channel-choices.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório backend:** `npx vitest run src/domain/profiles/alternativas-acesso.spec.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/alternativas-acesso.test.tsx`.

## F37-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: ChannelGroup tipado reutiliza ProfileItem e destinos versionados de F12; escolha humana, não algoritmo de distribuição.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Não assumir que comunidades em canais diferentes são equivalentes; responsabilidade de descrição do dono.

## F37-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue CRUD grupo/canais em /api/v1/me/profile/channel-groups/:id, com listagem própria e seleção em /api/v1/me/profile/channel-destinations; projeção pública retorna apenas canais elegíveis.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F37-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Mostrar alternativas rotuladas WhatsApp/Telegram/site; dono pode pausar cada canal.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F37-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Editar destino exige validação e não altera outros canais; cliques identificam canal com identidade estável; token não permite trocar destino.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/profile-channels.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no backend:** `npx vitest run src/http/alternativas-acesso.http.spec.ts`.  
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/alternativas-acesso.pg.spec.ts`; registrar também na suíte completa.

## F37-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/profile-channels.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Projetos existentes e teste registrado em ambos.
- [x] Implementar E01 sem mockar API interna: Navegar por teclado e escolher Telegram; conferir destino no stub; pausar Telegram e verificar opção inacessível; mobile mantém rótulos.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/alternativas-acesso.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F37-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [x] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [x] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Não assumir que comunidades em canais diferentes são equivalentes; responsabilidade de descrição do dono.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [x] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [x] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [x] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F37-AC01, F37-AC02, F37-AC03, F37-AC04, F37-AC05, F37-AC06 aprovados, com testes Tnn rastreados.
- [x] U/C/I/E e PG/Redis/revisão visual local aprovados; plataformas físicas pendentes em S7.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro atual:** Codex; sem commit novo. 539 backend/330 frontend/129 PG/81 E2E locais. Condicionais de novo worker/fila/exportação não aplicáveis; plataformas físicas/CI/liberação remotos permanecem S7. [Execução e limites](../execucao-f37.md).


Escolhas e alternativas de S0: [execução F37](../execucao-f37.md). Critérios locais aprovados; S7 global/remoto permanece em revisão.

Reconciliação técnica: F19 é dependência obrigatória porque a metadata publicada referencia suas revisões imutáveis e acompanha a retenção; F31 é reaproveitada condicionalmente para medição, sem conceder capacidade. Decisão D39 em execucao-f37.md. Autorização mais recente determina parar ao concluir F37; F38 e posteriores não iniciar.

[Fechamento local, contratos, escolhas, rollback e resultados](../execucao-f37.md). Pausa solicitada após F37; próxima F38 não iniciada.
