# F29 Página de evento

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 31.

**Estado:** IMPLEMENTADA E VALIDADA LOCALMENTE; S7 EM REVISÃO.
**Onda:** 4. **Ordem:** 31.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Página de evento”.  
**Plano:** [F29 implementação](../planos/f29-evento.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F14](../specs/f14-agendamento.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

apoiar encontros, lançamentos e ações de comunidades.

Escopo aprovado para detalhamento: bloco com data, fuso horário, local ou endereço online, descrição, inscrição e opção de adicionar ao calendário.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Criar evento e CTA inscrição, publicar; visitante adiciona ao calendário; dono cancela ou remarca.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/src/domain/format.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/ui/input.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/domain/links/canonical-url.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Clique em inscrição não é confirmação; respeitar agenda de visibilidade do bloco separada da data do evento.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

EventBlock tipado com início/fim UTC, timezone, local/URL e estado; arquivo ICS derivado, sem sistema de ingressos.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: CRUD de bloco via ProfileItem; GET /api/v1/profiles/:slug/events/:eventId/calendar.ics.

**Entrada específica:** `title,description,startsAt,endsAt,timeZone,location,signupUrl,state,expectedVersion`.

**Saída específica:** `eventBlock,publishedRevisionId; ICS text/calendar com UID e SEQUENCE`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Criar evento e CTA inscrição, publicar; visitante adiciona ao calendário; dono cancela ou remarca.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F29-AC01 | validar datas | F29-T01 | I/PG |
| F29-AC02 | informar cancelamento e mudança de horário | F29-T02 | I/PG |
| F29-AC03 | distinguir evento encerrado de link indisponível | F29-T03 | I/PG |
| F29-AC04 | não apresentar clique em inscrição como inscrição confirmada. | F29-T04 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F29; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F29-U01:** Escape de texto ICS impede injeção de propriedade.
- **F29-U02:** fuso preservado.
- **F29-U03:** fim anterior ao início recusa.
- **F29-U04:** cancelado/encerrado não equivale a URL morta.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F29-I01:** Evento de draft não fornece ICS público; atualização incrementa revisão; estado cancelado propaga sem reabrir inscrição indevida.
- **F29-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F29. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F29-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F29-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F29-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Página de evento”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F29-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F29-E01:** Abrir evento, baixar ICS e validar título/horário parseado; remarcar e conferir página; cancelar e verificar estado e botão.
- **F29-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F29-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/evento.spec.ts`.
- C: `frontend/src/components/domain/evento.test.tsx`.
- I: `backend/src/http/evento.http.spec.ts`.
- PG: `backend/src/http/evento.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/evento.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D31 modelo de evento, política ICS para remarcação e inscrições externas.

Risco específico: Clique em inscrição não é confirmação; respeitar agenda de visibilidade do bloco separada da data do evento.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** apoiar encontros, lançamentos e ações de comunidades.

**Escopo inicial:** bloco com data, fuso horário, local ou endereço online, descrição, inscrição e opção de adicionar ao calendário.

**Critérios de conclusão:** validar datas; informar cancelamento e mudança de horário; distinguir evento encerrado de link indisponível; não apresentar clique em inscrição como inscrição confirmada.

**Indicadores:** eventos publicados e cliques nos botões de inscrição e calendário.



## Execução autorizada — 20/10/2026

[Contrato reconciliado, decisões, ACs, testes e reversão](../execucao-f29.md). O registro de execução prevalece sobre caminhos/contratos apenas propostos neste planejamento. S7 remoto permanece pendente.
