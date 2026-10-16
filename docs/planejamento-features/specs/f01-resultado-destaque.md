# F01 Relatório de resultado do destaque

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 2.

**Estado:** EM IMPLEMENTAÇÃO na branch `codex/roadmap-features`. Ver [execução F01](../execucao-f01.md).  
**Onda:** 1. **Ordem:** 2.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Relatório de resultado do destaque”.  
**Plano:** [F01 implementação](../planos/f01-resultado-destaque.md).  
**Dependências obrigatórias:** G00; base atual, sem outra feature nova.  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

ajudar o divulgador a avaliar o desempenho da promoção e decidir sobre novas compras.

Escopo aprovado para detalhamento: selecionar um período; exibir impressões, cliques, CTR e cliques por dia; separar home, busca e nicho; identificar os períodos com destaque ativo; mostrar custo por clique do período pago e comparar períodos equivalentes antes e durante o destaque.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Selecionar link e período no painel; comparar duração igual; separar investimento, exposição e cliques; ausência de dados tem mensagem própria.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/repositories/analytics-repository.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/use-cases/@Analytics/record-event.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/http/controllers/@Analytics/routes.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/panel.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/domain/money.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Eventos atuais são deduplicados por sessão/link/superfície/dia/tipo; relatório não pode prometer cliques brutos nem causalidade.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Estender consultas de AnalyticsEvent por dia e superfície; correlacionar Promotion e Order sem multiplicar eventos por JOIN. Nenhum novo evento pode ser inventado para preencher histórico ausente.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/analytics/links/:linkId/performance?from&to&promotionId retorna série, agregados, cobertura e comparação; leitura do dono, admin conforme política atual.

**Entrada específica:** `from,to,promotionId opcionais; datas ISO YYYY-MM-DD`.

**Saída específica:** `series[{day,surface,impressions,clicks}],totals{impressions,clicks,ctr,investmentCents,cpcCents|null},coverage,comparison`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Selecionar link e período no painel; comparar duração igual; separar investimento, exposição e cliques; ausência de dados tem mensagem própria.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F01-AC01 | acesso restrito ao proprietário | F01-T01 | I/PG |
| F01-AC02 | distinção entre ausência de dados e zero | F01-T02 | I/PG |
| F01-AC03 | tratamento de períodos sem cliques | F01-T03 | I/PG |
| F01-AC04 | comparação com duração equivalente | F01-T04 | I/PG |
| F01-AC05 | valores calculados a partir do mesmo período e link. CTR agregado deve usar cliques totais divididos pelas impressões totais. Definir a atribuição quando houver campanhas sobrepostas. | F01-T05 | ADR + I/E |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F01; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F01-U01:** 100 impressões e 10 cliques => CTR 10%.
- **F01-U02:** combinar 10/100 e 1/10 => 10%, não somar taxas.
- **F01-U03:** investimento 1000 centavos e 0 cliques => CPC nulo.
- **F01-U04:** limites de data inclusivos na agregação diária.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F01-I01:** Semear dois pedidos e duas superfícies; GET não duplica cliques; usuário alheio recebe negação; período fora da retenção informa cobertura parcial.
- **F01-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F01. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F01-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F01-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F01-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Relatório de resultado do destaque”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F01-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F01-E01:** Abrir painel como dono; escolher campanha sem cliques e conferir CPC indisponível; trocar por campanha com 10 cliques e conferir valor; atualizar navegador e manter filtros na URL.
- **F01-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F01-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/analytics/resultado-destaque.spec.ts`.
- C: `frontend/src/components/domain/resultado-destaque.test.tsx`.
- I: `backend/src/http/resultado-destaque.http.spec.ts`.
- PG: `backend/src/http/resultado-destaque.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/resultado-destaque.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D01 atribuição entre promoções sobrepostas e rateio do investimento por superfície; D02 cobertura e retenção.

Risco específico: Eventos atuais são deduplicados por sessão/link/superfície/dia/tipo; relatório não pode prometer cliques brutos nem causalidade.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** ajudar o divulgador a avaliar o desempenho da promoção e decidir sobre novas compras.

**Escopo inicial:** selecionar um período; exibir impressões, cliques, CTR e cliques por dia; separar home, busca e nicho; identificar os períodos com destaque ativo; mostrar custo por clique do período pago e comparar períodos equivalentes antes e durante o destaque.

**Base existente:** eventos de impressões e cliques, superfícies de promoção e histórico de pedidos.

**Critérios de conclusão:** acesso restrito ao proprietário; distinção entre ausência de dados e zero; tratamento de períodos sem cliques; comparação com duração equivalente; valores calculados a partir do mesmo período e link. CTR agregado deve usar cliques totais divididos pelas impressões totais. Definir a atribuição quando houver campanhas sobrepostas.

**Limite de interpretação:** clique não comprova entrada em grupo ou venda. A comparação antes e depois descreve desempenho e não comprova causalidade.

**Indicadores:** uso do relatório e proporção de clientes que voltam a comprar.

