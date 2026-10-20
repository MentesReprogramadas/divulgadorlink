# F33 Coleções públicas compartilháveis

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 33.

**Estado:** IMPLEMENTADA E VALIDADA LOCALMENTE; S7 EM REVISÃO.
**Onda:** 4. **Ordem:** 33.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Coleções públicas compartilháveis”.  
**Plano:** [F33 implementação](../planos/f33-colecoes-publicas.md).  
**Dependências obrigatórias:** G00, [F04](../specs/f04-favoritos-colecoes.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

permitir que visitantes e divulgadores façam curadoria de links de diferentes proprietários.

Escopo aprovado para detalhamento: publicar uma coleção com título, descrição, ordem dos links e endereço compartilhável, como Comunidades de programação. Evolução das coleções privadas já propostas.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Curador organiza e publica seleção; visitante abre coleção; curador volta para privada.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/domain/catalog/public-link.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/link-row.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/age-gate.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Elegibilidade deve ser calculada na leitura, não só na publicação.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Estender Collection com visibility, slug e publishedRevision; manter propriedade original de Link e autoria da curadoria distintas.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: POST /api/v1/me/collections/:id/publish; PATCH visibility; GET /api/v1/collections/:slug.

**Entrada específica:** `collectionId,slug,expectedVersion,visibility`.

**Saída específica:** `publicCollection{curator,items com propriedade original,publishedRevisionId}`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Curador organiza e publica seleção; visitante abre coleção; curador volta para privada.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F33-AC01 | publicação voluntária | F33-T01 | I/PG |
| F33-AC02 | diferenciar curador e proprietário de cada link | F33-T02 | I/PG |
| F33-AC03 | respeitar moderação, restrições de conteúdo e disponibilidade | F33-T03 | I/PG |
| F33-AC04 | não expor itens privados | F33-T04 | I/PG |
| F33-AC05 | retirar da exibição os links que perderem elegibilidade | F33-T05 | I/PG |
| F33-AC06 | permitir voltar a coleção para privada. | F33-T06 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F33; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F33-U01:** Link reprovado ou indisponível não expõe destino.
- **F33-U02:** privado nunca entra na projeção.
- **F33-U03:** autoria do curador não transfere propriedade.
- **F33-U04:** voltar privada revoga público.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F33-I01:** Coleção combina links elegíveis do mesmo tenant; mudar estado do Link remove na leitura/invalidação; cache não expõe coleção tornada privada.
- **F33-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F33. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F33-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F33-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F33-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Coleções públicas compartilháveis”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F33-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F33-E01:** Favoritar e publicar seleção; visitante vê curador e dono distintos; retirar elegibilidade de item e verificar ausência; tornar privada retorna 404 público.
- **F33-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F33-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/collections/colecoes-publicas.spec.ts`.
- C: `frontend/src/components/domain/colecoes-publicas.test.tsx`.
- I: `backend/src/http/colecoes-publicas.http.spec.ts`.
- PG: `backend/src/http/colecoes-publicas.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/colecoes-publicas.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D35 coleção pode incluir item indisponível como aviso sem destino, slug e tratamento de conteúdo restrito.

Risco específico: Elegibilidade deve ser calculada na leitura, não só na publicação.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** permitir que visitantes e divulgadores façam curadoria de links de diferentes proprietários.

**Escopo inicial:** publicar uma coleção com título, descrição, ordem dos links e endereço compartilhável, como Comunidades de programação. Evolução das coleções privadas já propostas.

**Critérios de conclusão:** publicação voluntária; diferenciar curador e proprietário de cada link; respeitar moderação, restrições de conteúdo e disponibilidade; não expor itens privados; retirar da exibição os links que perderem elegibilidade; permitir voltar a coleção para privada.

**Indicadores:** coleções publicadas, visitas recebidas e cliques nos links selecionados.



## Execução autorizada — 20/10/2026

[Contrato reconciliado, decisões, ACs, testes e reversão](../execucao-f33.md). O registro de execução prevalece sobre caminhos/contratos apenas propostos neste planejamento. S7 remoto permanece pendente.
