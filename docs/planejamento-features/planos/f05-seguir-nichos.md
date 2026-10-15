# Plano de implementação F05 Seguir nichos

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 23.

**Estado:** NÃO INICIADO. Somente planejamento autorizado.  
**Spec vinculante:** [F05](../specs/f05-seguir-nichos.md).  
**Dependências:** G00, [F02](../specs/f02-lembrete-renovacao.md).  
**Onda:** 4. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

entregar novas descobertas alinhadas aos interesses do visitante.

Contrato a entregar: PUT/DELETE /api/v1/me/followed-niches/:nicheId; PATCH preferência de resumo; cancelamento com token de finalidade restrita.

Dados: NicheFollow único tenant/user/niche; cursor de resumo e itens enviados; preferências reutilizam F02. Não confundir seguir conteúdo com assinatura comercial.

Todos os itens abaixo são tarefas futuras. Não executar comandos, criar migration ou escrever aplicação só porque este plano existe. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/adapters/notifications/email/templates.ts`.
- `backend/src/worker.ts`.
- `backend/src/repositories/links-repository.ts`.
- `frontend/src/components/domain/facet-catalog.tsx`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Subscriptions/seguir-nichos.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Subscriptions/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/seguir-nichos-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/seguir-nichos.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/subscriptions/seguir-nichos.spec.ts`; C `frontend/src/components/domain/seguir-nichos.test.tsx`; I `backend/src/http/seguir-nichos.http.spec.ts`; PG `backend/src/http/seguir-nichos.pg.spec.ts`; E `frontend/e2e/seguir-nichos.spec.ts`.

## F05-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [ ] Confrontar fonte e todos os ACs F05-AC01, F05-AC02, F05-AC03, F05-AC04, F05-AC05; registrar mudanças de escopo sem apagar obrigações.
- [ ] Fechar: D06 frequência, consentimento, retenção do histórico de resumo e regras de conteúdo restrito.
- [ ] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [ ] Definir campos/tipos/validações reais de entrada `nicheId; digestEnabled:boolean; frequência conforme D06` e saída `follow{nicheId,createdAt},preferences; unsubscribe sem exposição de e-mail`; alinhar status/erros à aplicação.
- [ ] Desenhar a jornada Seguir nicho, escolher resumo semanal proposto; link de cancelamento desliga próximos envios.
- [ ] Definir fixture F05, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [ ] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F05-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [ ] Implementar em `backend/src/domain/subscriptions/seguir-nichos.spec.ts` cada cenário U da spec: Período sem novos links => não enviar; item já enviado => excluir; descadastro antes do worker => suprimir; item moderado após seleção => excluir no envio.
- [ ] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [ ] Em `frontend/src/components/domain/seguir-nichos.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [ ] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [ ] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório backend:** `npx vitest run src/domain/subscriptions/seguir-nichos.spec.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/seguir-nichos.test.tsx`.

## F05-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [ ] Implementar ou estender os contratos de repository e dados: NicheFollow único tenant/user/niche; cursor de resumo e itens enviados; preferências reutilizam F02. Não confundir seguir conteúdo com assinatura comercial.
- [ ] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [ ] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [ ] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [ ] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [ ] Comprovar unidade de tenant e regras específicas da spec: E-mail não deve expor no assunto ou corpo conteúdo que o destinatário não esteja autorizado a receber.

## F05-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [ ] Implementar o menor caso de uso que entregue PUT/DELETE /api/v1/me/followed-niches/:nicheId; PATCH preferência de resumo; cancelamento com token de finalidade restrita.
- [ ] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [ ] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [ ] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [ ] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [ ] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [ ] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F05-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [ ] Implementar Seguir nicho, escolher resumo semanal proposto; link de cancelamento desliga próximos envios.
- [ ] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [ ] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [ ] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [ ] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [ ] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [ ] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F05-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [ ] Implementar I01: Falhar entrega, repetir job e manter identidade do lote; janela de seleção não perde publicações em fronteiras; tenant e conteúdo restrito isolados.
- [ ] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [ ] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [ ] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [ ] Criar/estender `backend/src/http/seguir-nichos.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [ ] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [ ] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no backend:** `npx vitest run src/http/seguir-nichos.http.spec.ts`.  
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/seguir-nichos.pg.spec.ts`; registrar também na suíte completa.

## F05-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [ ] Registrar `frontend/e2e/seguir-nichos.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Esses projetos são propostos, não existentes na baseline.
- [ ] Implementar E01 sem mockar API interna: Seguir nicho, executar lote em fixture e ler outbox; cancelar por link real de e-mail; próximo lote não inclui usuário.
- [ ] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [ ] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [ ] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [ ] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [ ] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/seguir-nichos.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F05-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [ ] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: E-mail não deve expor no assunto ou corpo conteúdo que o destinatário não esteja autorizado a receber.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [ ] F05-AC01, F05-AC02, F05-AC03, F05-AC04, F05-AC05 aprovados, com testes Tnn rastreados.
- [ ] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [ ] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [ ] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro inicial:** responsável não atribuído; commit de implementação inexistente; resultados NÃO EXECUTADOS; liberação NÃO AUTORIZADA por este documento.

