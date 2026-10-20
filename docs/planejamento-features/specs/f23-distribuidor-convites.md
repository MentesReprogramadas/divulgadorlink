# F23 Distribuidor de convites

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 28.

**Estado:** S0–S6 verificadas localmente em 19/10/2026; S7/CI/liberação em revisão.
**Onda:** 4. **Ordem:** 28.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Distribuidor de convites”.  
**Plano:** [F23 implementação](../planos/f23-distribuidor-convites.md).  
**Dependências obrigatórias:** G00, [F12](../specs/f12-link-permanente.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Contrato concretizado em 19/10/2026

GET/PUT/DELETE /api/v1/me/redirects/:id/pool, PATCH /pool/:revisionId para pausa/retomada. Selecionar até 20 revisões APROVADAS e ativas de convites próprios, pesos 1–100. Mesma URL /r/:id. Round-robin ponderado persistente e transacional; validação F12 ao configurar/retomar; rechecagem de elegibilidade no acesso. Sem destino válido: indisponível, sem Location/fallback silencioso. DELETE desativa a distribuição e retorna explicitamente ao convite único, preservando configuração/métricas. Agregados por destino/dia por 180 dias, HEAD/dono/admin sem contagem/avanço; F37 avança sem duplicar contagem bruta. Seção global invitations.

D25 resolvida por escolha técnica documentada, conforme autorização para decidir sem consultas rotineiras. [Execução, testes, alternativas e limites](../execucao-f23.md). Sem novo commit/push/deploy. O planejamento inicial abaixo é histórico; divergências de nomes/contrato são reconciliadas por esta seção e pelo código/testes referenciados.

## Objetivo e fronteira

concentrar a divulgação de vários grupos em um único botão ou endereço.

Escopo aprovado para detalhamento: cadastrar destinos, alternar os encaminhamentos ou usar pesos definidos pelo proprietário; pausar destinos manualmente.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Dono define destinos/pesos e pausa; visitante usa um endereço; sem destinos vê estado explicativo.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/http/controllers/@Links/go.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/lib/redis.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/adapters/http/safe-fetch.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não inferir lotação de grupos nem entrada confirmada; não chamar a rede externa a cada clique para medir vagas.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

DestinationPool e membros com pesos/pausa, revisionId; seleção consistente no servidor com operação atômica quando necessário; compartilhar política de destinos de F12.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos de referência do planejamento inicial

Rotas/operações: CRUD /api/v1/me/redirects/:id/pool; GET /r/:handle seleciona destino elegível.

**Entrada específica:** `destinations[{revisionId,weight,paused}],expectedVersion`.

**Saída específica:** `pool{version,eligibleCount}; redirect{Location validada} ou indisponível`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Dono define destinos/pesos e pausa; visitante usa um endereço; sem destinos vê estado explicativo.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F23-AC01 | validar todos os destinos | F23-T01 | I/PG |
| F23-AC02 | respeitar destinos pausados | F23-T02 | I/PG |
| F23-AC03 | registrar cliques por destino | F23-T03 | I/PG |
| F23-AC04 | impedir encaminhamento quando não houver destino válido | F23-T04 | I/PG |
| F23-AC05 | atualizar a distribuição sem trocar o endereço público. | F23-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F23; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F23-U01:** Pesos 1/3 produzem sequência determinística aprovada.
- **F23-U02:** pausado nunca selecionado.
- **F23-U03:** todos pausados => nenhum redirect.
- **F23-U04:** zero/negativo recusados.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F23-I01:** Cliques concorrentes respeitam algoritmo sem perder estado; pausar entre escolha e redirect exige revalidação; revisão obsoleta não é usada.
- **F23-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F23. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F23-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F23-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F23-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Distribuidor de convites”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F23-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F23-E01:** Abrir várias vezes em contextos controlados e conferir destinos no stub; pausar um e repetir; pausar todos e conferir estado vazio.
- **F23-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F23-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/redirects/destination-pool.spec.ts`.
- C: `frontend/src/features/redirect-pools/pool-screen.test.tsx`.
- I: `backend/src/http/destination-pools.pg.spec.ts`.
- PG: `backend/src/http/destination-pools.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/distribuidor-convites.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D25 round-robin ponderado, limites e fallback quando destino fica indisponível.

Risco específico: Não inferir lotação de grupos nem entrada confirmada; não chamar a rede externa a cada clique para medir vagas.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** concentrar a divulgação de vários grupos em um único botão ou endereço.

**Escopo inicial:** cadastrar destinos, alternar os encaminhamentos ou usar pesos definidos pelo proprietário; pausar destinos manualmente.

**Critérios de conclusão:** validar todos os destinos; respeitar destinos pausados; registrar cliques por destino; impedir encaminhamento quando não houver destino válido; atualizar a distribuição sem trocar o endereço público.

**Limite inicial:** a detecção automática de grupo cheio depende das informações disponíveis em cada rede e não faz parte do primeiro lançamento. Um clique não confirma entrada no grupo.

**Indicadores:** uso do distribuidor e distribuição de cliques entre destinos.



## Delta autorizado de UX — 19/10/2026

[Refinamento executado e validação](../refinamento-f22-f23-f25.md): novos pontos de entrada, configuração integrada, seleção guiada/revisão e prévia reutilizada. Este delta prevalece sobre instruções antigas de navegação. Preserva os ACs e contratos comerciais/de acesso existentes; sem backend ou migração novos. Provas históricas permanecem nos JSONs originais; o refinamento tem evidência própria. S7 remoto continua pendente.
