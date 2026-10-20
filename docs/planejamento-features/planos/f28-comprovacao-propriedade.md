# Plano de implementação F28 Comprovação de propriedade

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 30.

**Estado:** IMPLEMENTADO LOCALMENTE. S7 remoto em revisão.
**Spec vinculante:** [F28](../specs/f28-comprovacao-propriedade.md).  
**Dependências:** G00, [F12](../specs/f12-link-permanente.md).  
**Onda:** 4. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

comprovar que um usuário controla um determinado destino divulgado.

Contrato a entregar: POST /api/v1/me/links/:id/ownership/challenges; POST verify; DELETE verification; projeção pública informa escopo e data.

Dados: OwnershipChallenge hash+expiração+escopo/destino; VerificationEvidence e revogação; métodos por capacidade, começando destino web controlável, redes sem método ficam não suportadas.

Todos os itens abaixo são tarefas futuras. Não executar comandos, criar migration ou escrever aplicação só porque este plano existe. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/adapters/http/safe-fetch.ts`.
- `backend/src/domain/links/network-host.ts`.
- `backend/src/repositories/audit-logs-repository.ts`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Verification/comprovacao-propriedade.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Verification/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/comprovacao-propriedade-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/comprovacao-propriedade.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/verification/comprovacao-propriedade.spec.ts`; C `frontend/src/components/domain/comprovacao-propriedade.test.tsx`; I `backend/src/http/comprovacao-propriedade.http.spec.ts`; PG `backend/src/http/comprovacao-propriedade.pg.spec.ts`; E `frontend/e2e/comprovacao-propriedade.spec.ts`.

## F28-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [ ] Confrontar fonte e todos os ACs F28-AC01, F28-AC02, F28-AC03, F28-AC04; registrar mudanças de escopo sem apagar obrigações.
- [ ] Fechar: D30 métodos viáveis por rede, validade, revalidação e retenção da evidência.
- [ ] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [ ] Definir campos/tipos/validações reais de entrada `linkId,destinationRevisionId,method; verify{challengeId}` e saída `challenge{id,instructions,expiresAt},verification{scope,method,verifiedAt,expiresAt,status}`; alinhar status/erros à aplicação.
- [ ] Desenhar a jornada Dono escolhe método disponível, cumpre desafio e verifica; público lê controle verificado do destino específico.
- [ ] Definir fixture F28, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [ ] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F28-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [ ] Implementar em `backend/src/domain/verification/comprovacao-propriedade.spec.ts` cada cenário U da spec: Token usado/expirado ou destinado a outra URL recusado; alteração de URL revoga selo; e-mail confirmado não comprova comunidade; rede não suportada não recebe selo.
- [ ] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [ ] Em `frontend/src/components/domain/comprovacao-propriedade.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [ ] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [ ] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório backend:** `npx vitest run src/domain/verification/comprovacao-propriedade.spec.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/comprovacao-propriedade.test.tsx`.

## F28-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [ ] Implementar ou estender os contratos de repository e dados: OwnershipChallenge hash+expiração+escopo/destino; VerificationEvidence e revogação; métodos por capacidade, começando destino web controlável, redes sem método ficam não suportadas.
- [ ] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [ ] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [ ] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [ ] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [ ] Comprovar unidade de tenant e regras específicas da spec: Não prometer verificação de grupos de WhatsApp/Telegram sem mecanismo comprovado; selo não é endosso de segurança.

## F28-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [ ] Implementar o menor caso de uso que entregue POST /api/v1/me/links/:id/ownership/challenges; POST verify; DELETE verification; projeção pública informa escopo e data.
- [ ] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [ ] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [ ] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [ ] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [ ] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [ ] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F28-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [ ] Implementar Dono escolhe método disponível, cumpre desafio e verifica; público lê controle verificado do destino específico.
- [ ] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [ ] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [ ] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [ ] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [ ] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [ ] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F28-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [ ] Implementar I01: Fetch do desafio usa DNS/redirects seguros e limite; duas verificações consomem um desafio; evidência e AuditLog transacionais.
- [ ] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [ ] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [ ] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [ ] Criar/estender `backend/src/http/comprovacao-propriedade.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [ ] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [ ] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no backend:** `npx vitest run src/http/comprovacao-propriedade.http.spec.ts`.  
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/comprovacao-propriedade.pg.spec.ts`; registrar também na suíte completa.

## F28-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [ ] Registrar `frontend/e2e/comprovacao-propriedade.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Esses projetos são propostos, não existentes na baseline.
- [ ] Implementar E01 sem mockar API interna: Verificar domínio em stub seguro, ver selo específico; alterar destino e conferir revogação; desafio vencido não mostra sucesso.
- [ ] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [ ] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [ ] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [ ] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [ ] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/comprovacao-propriedade.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F28-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [ ] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Não prometer verificação de grupos de WhatsApp/Telegram sem mecanismo comprovado; selo não é endosso de segurança.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [ ] F28-AC01, F28-AC02, F28-AC03, F28-AC04 aprovados, com testes Tnn rastreados.
- [ ] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [ ] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [ ] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro inicial:** responsável não atribuído; commit de implementação inexistente; resultados NÃO EXECUTADOS; liberação NÃO AUTORIZADA por este documento.



## Execução autorizada — 20/10/2026

[Contrato reconciliado, decisões, ACs, testes, desvio S1, evidências e reversão](../execucao-f28.md). Rotas usam /me/redirects/:id/ownership, recurso F12 existente; origem web e validade D30 resolvidas. Não repetir a proposta antiga como contrato implementado. Checklist original preservado como planejamento; conclusão comprovada pelo registro de execução, sem marcar liberação remota.
