# F07 Acompanhamento de disponibilidade

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 4.

**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.  
**Onda:** 1. **Ordem:** 4.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Acompanhamento de disponibilidade”.  
**Plano:** [F07 implementação](../planos/f07-disponibilidade.md).  
**Dependências obrigatórias:** G00; base atual, sem outra feature nova.  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

reduzir links expirados no catálogo e facilitar sua recuperação pelo proprietário.

Escopo aprovado para detalhamento: verificações periódicas com intervalo configurável; repetir falhas antes de marcar indisponível; registrar última verificação; avisar o proprietário; permitir atualizar o convite e revalidar o destino.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Dono vê última checagem; propõe convite substituto; versão aprovada só muda após validação; indisponível recupera pelo fluxo definido.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/domain/links/url-availability.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/adapters/http/safe-fetch.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/domain/state/transition.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/worker.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/use-cases/@Links/submit-link.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não reabrir estado UNAVAILABLE sem definir invariantes e testar regressão de pagamentos/moderação.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

AvailabilityCheck e estado de falhas consecutivas; URLRevision pendente para substituição; recuperação exige rever UNAVAILABLE terminal no linkMachine atual.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/links/:id/availability; POST /api/v1/links/:id/url-proposals; job periódico particionado por host.

**Entrada específica:** `canonicalUrl candidata,expectedVersion`.

**Saída específica:** `availability{checkedAt,state,consecutiveFailures},proposal{id,status}; nunca publicar proposta prematuramente`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Dono vê última checagem; propõe convite substituto; versão aprovada só muda após validação; indisponível recupera pelo fluxo definido.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F07-AC01 | timeouts e falhas transitórias não devem causar remoção imediata | F07-T01 | I/PG |
| F07-AC02 | bloqueios do provedor não equivalem automaticamente a link expirado | F07-T02 | I/PG |
| F07-AC03 | controlar frequência por host | F07-T03 | I/PG |
| F07-AC04 | usar acesso protegido contra destinos internos | F07-T04 | I/PG |
| F07-AC05 | aplicar validação e moderação ao endereço substituto. Definir o tratamento de promoções pagas durante a indisponibilidade. | F07-T05 | ADR + I/E |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F07; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F07-U01:** HTTP 403/429 não vira morto.
- **F07-U02:** uma falha transitória não despublica.
- **F07-U03:** endereço privado, redirecionamento interno ou DNS privado são bloqueados.
- **F07-U04:** resposta acessível não confirma vaga.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F07-I01:** Dois probes concorrentes não sobrescrevem revisão nova; job revalida URL antes de aplicar resultado; substituição invalida comprovação e preserva histórico de promoção.
- **F07-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F07. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F07-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F07-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F07-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Acompanhamento de disponibilidade”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F07-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F07-E01:** Simular timeout por adapter local, conferir link ainda ativo; repetir limiar aprovado; corrigir URL e completar validação; conferir recuperação no público.
- **F07-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F07-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/links/disponibilidade.spec.ts`.
- C: `frontend/src/components/domain/disponibilidade.test.tsx`.
- I: `backend/src/http/disponibilidade.http.spec.ts`.
- PG: `backend/src/http/disponibilidade.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/disponibilidade.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D08 limiar/intervalo/backoff, transição de recuperação e compensação de promoção paga durante indisponibilidade.

Risco específico: Não reabrir estado UNAVAILABLE sem definir invariantes e testar regressão de pagamentos/moderação.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** reduzir links expirados no catálogo e facilitar sua recuperação pelo proprietário.

**Escopo inicial:** verificações periódicas com intervalo configurável; repetir falhas antes de marcar indisponível; registrar última verificação; avisar o proprietário; permitir atualizar o convite e revalidar o destino.

**Base existente:** lógica de classificação de disponibilidade e acesso HTTP protegido.

**Critérios de conclusão:** timeouts e falhas transitórias não devem causar remoção imediata; bloqueios do provedor não equivalem automaticamente a link expirado; controlar frequência por host; usar acesso protegido contra destinos internos; aplicar validação e moderação ao endereço substituto. Definir o tratamento de promoções pagas durante a indisponibilidade.

**Limite de interpretação:** uma resposta HTTP acessível não garante que o convite permita entrada no grupo.

**Indicadores:** proporção de links indisponíveis e tempo até correção.

