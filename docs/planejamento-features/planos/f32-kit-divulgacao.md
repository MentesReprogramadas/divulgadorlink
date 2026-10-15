# Plano de implementação F32 Kit de divulgação

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 32.

**Estado:** NÃO INICIADO. Somente planejamento autorizado.  
**Spec vinculante:** [F32](../specs/f32-kit-divulgacao.md).  
**Dependências:** G00, [F09](../specs/f09-perfil-publico.md), [F13](../specs/f13-qr-permanente.md).  
**Onda:** 4. Etapas rastreadas no [roadmap](../roadmap-auditavel.md) e na [matriz](../matriz-aceitacao.csv).

## Resultado e fronteira de implementação

ajudar o usuário a divulgar o perfil depois da publicação.

Contrato a entregar: POST /api/v1/me/profile/share-kit/preview; download autenticado ou renderização no cliente conforme avaliação de custo, sem biblioteca nova por padrão.

Dados: ShareKitPreset com dimensões e campos permitidos; gerar da projeção publicada ou prévia explicitamente selecionada; QR vem de F13.

Todos os itens abaixo são tarefas futuras. Não executar comandos, criar migration ou escrever aplicação só porque este plano existe. Não acionar implantação automática via push na main: o projeto publica a main pelo Coolify.

## Arquivos e pontos de integração

### Existentes a conferir e reaproveitar

- `frontend/src/app/divulgar/opengraph-image.tsx`.
- `frontend/src/styles/tokens.css`.
- `frontend/src/domain/tracked-go.ts`.
- `frontend/src/styles/tokens.css` e componentes locais para manter aparência/comportamento.
- `frontend/playwright.config.ts`, harness E2E e CI: registrar testes novos.


### Caminhos propostos e justificativa

- `frontend/src/domain/kit-divulgacao.ts`: composição/geração reutilizável sobre as bibliotecas atuais.
- Backend novo somente se S0 demonstrar necessidade de geração no servidor; caso contrário, consumir APIs reais das dependências sem endpoint/repository adicional.
- `frontend/src/components/domain/kit-divulgacao.tsx (composição específica; extrair só comportamento realmente novo)`.

Esses nomes não são obrigação de criar arquivos vazios. Preferir ampliação do módulo atual quando mesma responsabilidade existir. Testes: U `frontend/src/domain/kit-divulgacao.test.ts`; C `frontend/src/components/domain/kit-divulgacao.test.tsx`; I `frontend/src/domain/kit-divulgacao.integration.test.ts`; E `frontend/e2e/kit-divulgacao.spec.ts`.

## F32-S0 Escopo contratos e revisão de reutilização

**Entrada:** dependências concluídas, spec revisada e autorização de implementação.  
**Saída auditável:** ADR/contrato revisado, ACs sem ambiguidade bloqueante, lista final de arquivos e fixtures.

- [ ] Confrontar fonte e todos os ACs F32-AC01, F32-AC02, F32-AC03, F32-AC04, F32-AC05; registrar mudanças de escopo sem apagar obrigações.
- [ ] Fechar: D34 formatos, dimensões, fontes, limite de texto e mecanismo de render suportado.
- [ ] Ler os pontos existentes acima; registrar o que será estendido e por que qualquer componente/porta/modelo novo é necessário.
- [ ] Definir campos/tipos/validações reais de entrada `presetId,publicProfileRevisionId,targetHandleId opcional,explicitDraftPreview:boolean` e saída `preview/download com dimensions,mime e arte; QR de endereço estável`; alinhar status/erros à aplicação.
- [ ] Desenhar a jornada Escolher post/story, revisar composição e baixar arte com QR/endereço.
- [ ] Definir fixture F32, permissões, relógio e adapters externos necessários. Não depender de serviços de produção.
- [ ] Registrar rollout e como a versão anterior continuará funcionando durante alteração de dados.

## F32-S1 Testes unitários e componentes antes da regra

**Entrada:** contratos e decisões S0 fechados.  
**Saída auditável:** testes que falham pelo comportamento ausente, não por erro de configuração.

- [ ] Implementar em `frontend/src/domain/kit-divulgacao.test.ts` cada cenário U da spec: Texto longo tem limite/quebra sem corte; payload QR usa URL estável; dados ocultos/draft não entram por padrão; parâmetros não permitem buscar imagem arbitrária.
- [ ] Confirmar falha esperada de cada comportamento ausente; guardar comando/saída/commit sem alterar regra para obter verde artificial.
- [ ] Em `frontend/src/components/domain/kit-divulgacao.test.tsx`, criar C01/C02 com interação real, estados vazio/erro/loading e fixture sentinela; não fazer snapshot espelhando implementação.
- [ ] Se extrair lógica compartilhada, adicionar regressão do consumidor anterior antes de movê-la.
- [ ] Preparar casos Tnn na camada correta e adicionar títulos com IDs; casos ainda não implementados ficam pendentes na matriz.

**Comando futuro, diretório frontend:** `npx vitest run src/domain/kit-divulgacao.test.ts`.  
**Comando futuro, diretório frontend:** `npx vitest run src/components/domain/kit-divulgacao.test.tsx`.

## F32-S2 Dados invariantes e migração

**Entrada:** S1 com falhas esperadas e esquema revisado.  
**Saída auditável:** persistência/DTO corretos, migration revisada se necessária e plano de recuperação.

- [ ] Implementar ou estender os contratos de repository e dados: ShareKitPreset com dimensões e campos permitidos; gerar da projeção publicada ou prévia explicitamente selecionada; QR vem de F13.
- [ ] Confirmar ausência de novo modelo persistido. Usar dados/identidades das dependências; se essa premissa mudar, revisar spec e acrescentar teste PG antes de criar tabela.
- [ ] Preservar campos e contratos antigos durante rollout; documentar backfill, validação, volume, erro e retomada quando aplicáveis.
- [ ] Testar geração/projeção a partir de dado legado e atual; não criar migration sem delta de schema.
- [ ] Registrar cache/invalidação, política de exclusão/retenção e impacto sobre dados pessoais.
- [ ] Comprovar unidade de tenant e regras específicas da spec: Reaproveitar render OG e qrcode antes de adicionar canvas/headless externo; conteúdo precisa de QA visual.

## F32-S3 Regra de negócio API e jobs

**Entrada:** persistência/contratos S2 prontos.  
**Saída auditável:** caso de uso integrado, API compatível e regra U verde.

- [ ] Implementar o menor caso de uso que entregue POST /api/v1/me/profile/share-kit/preview; download autenticado ou renderização no cliente conforme avaliação de custo, sem biblioteca nova por padrão.
- [ ] Executar regras U da spec até passarem, preservando regressões dos módulos reaproveitados.
- [ ] Validar entrada com Zod e usar erros atuais; autenticar/autorizar por ação e recurso; não aceitar tenantId do body como autoridade.
- [ ] Implementar consistência/idempotência e versionamento apenas onde a operação exigir; leitura pura não deve gerar mutação acidental.
- [ ] Se houver job: usar BullMQ/worker existente, intenção durável, retry limitado e revalidação antes do efeito; definir consequência de crash entre persistir e entregar.
- [ ] Se houver integração externa: adapter com porta e fake local; proteger rede/segredos; não acoplar provedor ao controller.
- [ ] Conferir que nenhum dado privado/draft aparece na projeção pública, resposta de erro, log ou cache.

## F32-S4 Interface composição e estados

**Entrada:** API S3 disponível em ambiente local de desenvolvimento.  
**Saída auditável:** jornada completa com componentes locais e testes C passando.

- [ ] Implementar Escolher post/story, revisar composição e baixar arte com QR/endereço.
- [ ] Compor Button/Field/Input/Select e estrutura de painel existentes; novo componente somente pela responsabilidade descrita em S0.
- [ ] Conectar BFF/API reais, preservar host/cookies/CSRF; bloquear envio duplicado e mostrar resultado apenas depois de persistir.
- [ ] Implementar loading, vazio, inválido, sem permissão, conflito e erro recuperável; preservar entrada válida na recuperação.
- [ ] Usar renderer e projeção comum para prévia/público quando aplicável; ocultar ações sem capacidade sem confiar nisso para autorização.
- [ ] Conferir teclado, foco, labels, contraste e mobile; não introduzir fonte/token/biblioteca nova sem motivo.
- [ ] Rodar C01/C02 e regressão do componente compartilhado alterado; guardar capturas de referência.

## F32-S5 Integração contrato persistência e falhas

**Entrada:** S2–S4 concluídos.  
**Saída auditável:** casos I/PG/worker e Tnn executados com asserções de estado final.

- [ ] Implementar I01: Render de mídia referencia apenas ativos autorizados; falha informa erro sem arquivo corrompido; isolamento de origem da arte.
- [ ] Implementar I02 com outro dono A, tenant B e sem sessão; verificar negação e ausência de efeitos. Público permitido continua acessível.
- [ ] Implementar I03: repetição, falha transacional/provedor e estado final consistente; controlar concorrência onde o contrato depende dela.
- [ ] Criar um teste identificável por cada Tnn da matriz e verificar a obrigação exata do AC; não dar todos os critérios como cobertos por I01 sem assertivas.
- [ ] Não criar PG artificial para uma feature sem novo banco; comprovar integração das dependências utilizadas.
- [ ] Se houver fila, provar reentrega/crash/revalidação usando Redis/worker do harness, sem esperar minutos reais.
- [ ] Conferir dados sensíveis, sanitização, ordem, cache e métricas específicos da spec.

**Comando futuro no frontend:** `npx vitest run src/domain/kit-divulgacao.integration.test.ts`.  


## F32-S6 E2E Playwright e revisão visual

**Entrada:** I/PG/worker verdes e harness G00 operacional.  
**Saída auditável:** jornada E real em desktop/mobile, trace/relatório e revisão dos casos manuais aplicáveis.

- [ ] Registrar `frontend/e2e/kit-divulgacao.spec.ts` em features e features-mobile; comprovar descoberta com `npx playwright test --list`. Esses projetos são propostos, não existentes na baseline.
- [ ] Implementar E01 sem mockar API interna: Gerar duas dimensões, baixar e conferir tamanho e texto visual; decodificar QR; draft com contato privado não aparece na arte pública.
- [ ] Implementar E02: isolamento de contextos, acesso direto, ausência no DOM e payload dos dados proibidos.
- [ ] Implementar E03: mobile 390×844, teclado e falha/recuperação apropriada; confirmar persistência após reload.
- [ ] Usar locators semânticos e assertions com auto-retry; polling para worker, sem waitForTimeout arbitrário.
- [ ] Validar desktop 1280×720 e overflow 320px; revisar evidência visual e casos de download/QR/TLS/PWA quando aplicáveis.
- [ ] Guardar relatório e trace de falha; teste skip ou não descoberto bloqueia gate. Se faltar plataforma real, registrar pendência manual, não chamar concluído.

**Comando futuro, frontend:** `npx playwright test e2e/kit-divulgacao.spec.ts --project=features`.  
**Mobile futuro:** mesmo arquivo com `--project=features-mobile`.

## F32-S7 Regressão rollout e fechamento auditável

**Entrada:** todos os ACs aprovados, decisões resolvidas, evidências S0–S6 e autorização de liberação quando necessária.  
**Saída auditável:** entrega revisada e comprovada, com plano de reversão e acompanhamento.

- [ ] Executar lint/typecheck/unit/build dos pacotes afetados e regressões descritas em qualidade; se compartilhado afeta catálogo/pagamentos/sessão/SEO, executar suas suítes.
- [ ] Confirmar E2E e testes PG no CI real, não só local; salvar commit/run/contagens e conferir ausência de skip indevido.
- [ ] Registrar observabilidade e indicador da fonte, sem novos payloads pessoais; risco a monitorar: Reaproveitar render OG e qrcode antes de adicionar canvas/headless externo; conteúdo precisa de QA visual.
- [ ] Preparar rollout gradual pelo mecanismo de configuração aprovado; se flag nova, implementar parser/default/testes, sem presumir ConfigKey já pronto.
- [ ] Ensaiar reversão em ambiente descartável: desabilitar entrada nova, manter leituras compatíveis, preservar dados e usar migração compensatória revisada se necessário; nunca resetar banco para desfazer.
- [ ] Obter liberação concreta de deploy/cobrança/provisionamento somente quando a atividade futura pedir e conforme autorização vigente. Não publicar por este plano.
- [ ] Preencher roadmap S0–S7 e matriz com responsável, commit, comando, exit code e evidência. Sem evidência, manter etapa pendente.
- [ ] Atualizar decisões e documentação conforme implementação real sem inventar que hipótese virou regra.

## Check de saída da feature

- [ ] F32-AC01, F32-AC02, F32-AC03, F32-AC04, F32-AC05 aprovados, com testes Tnn rastreados.
- [ ] U/C/I/E e PG/Redis/manual exigidos aprovados.
- [ ] Reuso e design revistos; nenhuma duplicação sem justificativa.
- [ ] Contratos, dados, migração, retenção, rollback e segurança revisados.
- [ ] Roadmap e evidências completos; aceitação final registrada.

**Registro inicial:** responsável não atribuído; commit de implementação inexistente; resultados NÃO EXECUTADOS; liberação NÃO AUTORIZADA por este documento.

