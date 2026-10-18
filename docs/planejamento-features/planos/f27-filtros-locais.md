# Plano de implementação F27 Filtros por cidade idioma e modalidade

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 18.

**Estado:** S0–S6 validadas localmente; S7 EM REVISÃO por regressão compartilhada/CI/liberação pendentes. [Execução F27](../execucao-f27.md).
**Spec vinculante:** [F27](../specs/f27-filtros-locais.md).  
**Dependências:** G00, base existente.  
**Onda:** 3. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

tornar a descoberta mais específica para comunidades e atividades em que localização, idioma ou formato importem.

Contrato a entregar: Estender GET /api/v1/search e catálogo com city/language/modality; edição autorizada desses campos.

Dados: Metadados opcionais normalizados de localidade/idioma/modalidade em Link; migração nullable preserva catálogo atual; extensão a Profile só quando F09 existir.

Implementação autorizada posteriormente em 18/10/2026. S0–S6 foram executadas e verificadas localmente; S7 continua em revisão. A autorização não inclui Git/push/deploy: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `backend/src/http/catalog-query.ts`.
- `backend/src/http/controllers/@Search/routes.ts`.
- `frontend/src/components/domain/facet-filters.tsx`.
- `frontend/src/domain/facets.ts`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.
- `backend/prisma/schema.prisma`, migrations e registro de testes PG, somente se o delta da feature exigir.

### Caminhos propostos e justificativa

- `backend/src/use-cases/@Catalog/filtros-locais.ts (ou ampliar use case equivalente após confirmar inventário)`.
- `backend/src/http/controllers/@Catalog/routes.ts (ampliar existente se módulo já possuir registro)`.
- `backend/src/repositories/filtros-locais-repository.ts (somente se contrato novo não couber em repository existente)`.
- `frontend/src/components/domain/filtros-locais.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `backend/src/domain/catalog/discovery-metadata.spec.ts`; C `frontend/src/features/catalog/discovery/discovery-controls.test.tsx`; I `backend/src/http/discovery-filters.pg.spec.ts`; PG `backend/src/http/discovery-filters.pg.spec.ts`; E `frontend/e2e/discovery-filters.spec.ts`.

## F27-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [x] Confrontar fonte e todos os ACs F27-AC01, F27-AC02, F27-AC03, F27-AC04, F27-AC05; registrar mudanças de escopo sem apagar obrigações.
- [x] Fechar: D29 origem do catálogo de localidades, semântica de ausentes e migração de metadados.
- [x] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [x] Definir campos/tipos/validações reais de entrada `cityId opcional,languageTag opcional,modality opcional,q,cursor` e saída `items,activeFilters,facets,nextCursor; metadados ausentes preservados quando sem filtro`; alinhar status/erros à aplicação.
- [x] Desenhar a jornada Visitante combina filtros e vê filtros ativos e estado vazio; dono escolhe metadados opcionais.
- [x] Definir fixture F27, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [x] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F27-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [x] Implementar em `backend/src/domain/catalog/discovery-metadata.spec.ts` cada cenário U da spec: Idioma normalizado; cidade sem inferência por IP; online não exige cidade; ausente permanece em resultados sem filtro, sem fingir correspondência quando filtro é específico.
- [x] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [x] Em `frontend/src/features/catalog/discovery/discovery-controls.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [x] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [x] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório backend:** `npx vitest run src/domain/catalog/filtros-locais.spec.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/filtros-locais.test.tsx`.

## F27-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [x] Implementar ou estender os contratos de repository e dados: Metadados opcionais normalizados de localidade/idioma/modalidade em Link; migração nullable preserva catálogo atual; extensão a Profile só quando F09 existir.
- [x] Definir índices de acesso, unicidade e FKs do tenant; usar transação para publicação/mutação composta; validar no PostgreSQL real. Não substituir a prova por repository em memória.
- [x] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [x] Testar migration em banco descartável com dados anteriores, conferir query plan nas consultas novas e registrar estratégia expand/contract. Não apagar conteúdo em downgrade.
- [x] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [x] Comprovar unidade de tenant e regras específicas da spec: Não exigir cadastro de cidade de todos nem adicionar geolocalização/GIS sem requisito.

## F27-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [x] Implementar o menor caso de uso que entregue Estender GET /api/v1/search e catálogo com city/language/modality; edição autorizada desses campos.
- [x] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [x] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [x] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [x] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [x] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [x] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F27-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [x] Implementar Visitante combina filtros e vê filtros ativos e estado vazio; dono escolhe metadados opcionais.
- [x] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [x] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [x] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [x] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [x] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [x] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F27-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [x] Implementar I01: Combinações query/filtros/cursor não vazam dados nem duplicam; valores inválidos retornam 400; índices medidos por plano de consulta.
- [x] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [x] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [x] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [x] Criar/estender `backend/src/http/discovery-filters.pg.spec.ts`, registrar na suíte PG/CI e comprovar constraints, consultas e concorrência com dados reais.
- [x] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [x] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no backend:** `npx vitest run src/http/filtros-locais.http.spec.ts`.  
**PG futuro, backend:** com PG_SPECS=1 e URLs descartáveis configuradas, `npx vitest run --no-file-parallelism src/http/filtros-locais.pg.spec.ts`; registrar também na suíte completa.

## F27-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [x] Registrar `frontend/e2e/discovery-filters.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Esses projetos são propostos, não existentes na baseline.
- [x] Implementar E01 sem mockar API interna: Combinar cidade/idioma/modalidade e conferir fixture; limpar tudo recupera itens sem metadados; reload mantém filtros e teclado funciona.
- [x] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [x] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [x] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [x] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [x] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/filtros-locais.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F27-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [ ] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Não exigir cadastro de cidade de todos nem adicionar geolocalização/GIS sem requisito.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [x] F27-AC01, F27-AC02, F27-AC03, F27-AC04, F27-AC05 aprovados localmente, com testes Tnn rastreados.
- [x] U/C/I/E e PG exigidos da feature aprovados localmente; emulação/limites registrados e regressão global S7 separada.
- [x] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [x] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro inicial:** responsável não atribuído; commit de implementação inexistente; resultados NÃO EXECUTADOS; liberação NÃO AUTORIZADA por este documento.


## Contrato reconciliado e comprovação local

Ver execução D29: Link do catálogo recebe metadados opcionais; Minha Página/F09 continua permitida sem esses campos, sem duplicar metadados no Profile antes de haver descoberta F24. Preservados arrays sponsored/organic, target, facetas e cursor existentes; busca não ganha paginação artificial. Referência IBGE/IANA local. I/PG reunidos no teste real de PostgreSQL; caminhos acima reconciliados com os módulos entregues, sem criar arquivos vazios.

S0–S6 e cinco ACs verificados localmente: domínio 4 U, componentes/contratos 5 C, 7 PG próprios incluídos em 246 PG/26 arquivos; 520 U backend e 311 U frontend nas suítes completas, lint/typecheck/build dos pacotes aprovados. Seis E2E finais desktop/mobile, 18 capturas inspecionadas, igualdade de dimensões do skeleton/formulário e Salvar visível após erro. Registros separados de rodadas amplas/falhas em execucao-f27.md. S7 não é encerrada por testes locais nem por aceitação parcial de regressões compartilhadas.
