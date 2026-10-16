# Plano de implementação F01 Relatório de resultado do destaque

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 2.

**Estado:** EM IMPLEMENTAÇÃO na branch `codex/roadmap-features`. Ver [execução F01](../execucao-f01.md).
**Spec vinculante:** [F01](../specs/f01-resultado-destaque.md).  
**Dependências:** G00, base existente.  
**Onda:** 1. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

ajudar o divulgador a avaliar o desempenho da promoção e decidir sobre novas compras.

Contrato a entregar: GET /api/v1/analytics/links/:linkId/performance?from&to&promotionId retorna série, agregados, cobertura e comparação; leitura do dono, admin conforme política atual.

Dados: Estender consultas de AnalyticsEvent por dia e superfície; correlacionar Promotion e Order sem multiplicar eventos por JOIN. Nenhum novo evento pode ser inventado para preencher histórico ausente.

Todos os itens abaixo são tarefas futuras. Não executar comandos, criar migration ou escrever aplicação só porque este plano existe. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/repositories/analytics-repository.ts`.
- `backend/src/use-cases/@Analytics/record-event.ts`.
- `backend/src/http/controllers/@Analytics/routes.ts`.
- `frontend/src/components/domain/panel.tsx`.
- `frontend/src/domain/money.ts`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Analytics/resultado-destaque.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Analytics/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/resultado-destaque-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/resultado-destaque.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/analytics/performance.spec.ts`; C `frontend/src/features/promotions/components/performance-report.test.tsx`; I `backend/src/http/promotion-performance.pg.spec.ts`; PG `backend/src/http/promotion-performance.pg.spec.ts`; E `frontend/e2e/promotion-performance.spec.ts`.

## F01-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F01-AC01, F01-AC02, F01-AC03, F01-AC04, F01-AC05; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D01 atribuição entre promoções sobrepostas e rateio do investimento por superfície; D02 cobertura e retenção.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `from,to,promotionId opcionais; datas ISO YYYY-MM-DD` e saída `series[{day,surface,impressions,clicks}],totals{impressions,clicks,ctr,investmentCents,cpcCents|null},coverage,comparison`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Selecionar link e período no painel; comparar duração igual; separar investimento, exposição e cliques; ausência de dados tem mensagem própria.
- [x] Definir fixture F01, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F01-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/analytics/performance.spec.ts` cada cenário U da spec: 100 impressões e 10 cliques => CTR 10%; combinar 10/100 e 1/10 => 10%, não somar taxas; investimento 1000 centavos e 0 cliques => CPC nulo; limites de data inclusivos na agregação diária.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/promotions/components/performance-report.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório backend:** `npx vitest run src/domain/analytics/resultado-destaque.spec.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/resultado-destaque.test.tsx`.

## F01-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: Estender consultas de AnalyticsEvent por dia e superfície; correlacionar Promotion e Order sem multiplicar eventos por JOIN. Nenhum novo evento pode ser inventado para preencher histórico ausente.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Eventos atuais são deduplicados por sessão/link/superfície/dia/tipo; relatório não pode prometer cliques brutos nem causalidade.

## F01-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue GET /api/v1/analytics/links/:linkId/performance?from&to&promotionId retorna série, agregados, cobertura e comparação; leitura do dono, admin conforme política atual.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F01-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Selecionar link e período no painel; comparar duração igual; separar investimento, exposição e cliques; ausência de dados tem mensagem própria.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F01-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Semear dois pedidos e duas superfícies; GET não duplica cliques; usuário alheio recebe negação; período fora da retenção informa cobertura parcial.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/promotion-performance.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no backend:** `npx vitest run src/http/resultado-destaque.http.spec.ts`.  
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/resultado-destaque.pg.spec.ts`; registrar também na suíte completa.

## F01-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/promotion-performance.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Esses projetos são propostos, não existentes na baseline.
- [x] Implementar E01 sem mockar API interna: Abrir painel como dono; escolher campanha sem cliques e conferir CPC indisponível; trocar por campanha com 10 cliques e conferir valor; atualizar navegador e manter filtros na URL.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/resultado-destaque.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F01-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [x] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [x] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [x] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Eventos atuais são deduplicados por sessão/link/superfície/dia/tipo; relatório não pode prometer cliques brutos nem causalidade.
- [x] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [x] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [x] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [x] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [x] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F01-AC01, F01-AC02, F01-AC03, F01-AC04, F01-AC05 aprovados, com testes Tnn rastreados.
- [x] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [x] Roadmap e evidências completos; aceitação final registrada.

**Registro inicial:** responsável não atribuído; commit de implementação inexistente; resultados NÃO EXECUTADOS; liberação NÃO AUTORIZADA por este documento.


Fechamento na branch: d9dbffd, CI 38832840220 aprovado com 54 E2E. Deploy fora do escopo desta execução; ver execucao-f01.md.
