# F11 Planos para perfis e páginas

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 12.

**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.  
**Onda:** 3. **Ordem:** 12.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Planos para perfis e páginas”.  
**Plano:** [F11 implementação](../planos/f11-planos-perfis.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

Oferecer planos de perfil com capacidades comerciais verificáveis e ciclo recorrente próprio.

Escopo aprovado para detalhamento: Diferenciar planos gratuito, Pro e Premium conforme a tabela original e manter a compra de destaque separada.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Comparar gratuito/Pro/Premium; concluir checkout; mostrar pendente até confirmação; gerenciar assinatura e efeitos da mudança.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/domain/payments/payment-gateway.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/adapters/payments/stripe-card-payment-gateway.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/http/controllers/@Payments/routes.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/domain/state/transition.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/order-grid.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não implementar recorrência com laço de PaymentIntents ou reaproveitar OrderStatus de promoção; Billing adapter separado justificado pelo ciclo recorrente.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Plan, PlanVersion, Subscription, Entitlement e BillingEvent deduplicado; manter Order/Promotion para exposição no catálogo. Catálogo de capacidades existe antes da página premium; não exige premium já implementado.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/profile-plans; POST /api/v1/subscriptions/checkout; GET /me/subscription; POST cancel/change; webhook autenticado de ciclo de vida.

**Entrada específica:** `planVersionId,returnPath interno; change{targetPlanVersionId,timing}`.

**Saída específica:** `subscription{id,status,currentPeriodEnd,capabilities},checkoutUrl validada; preço calculado no servidor`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Comparar gratuito/Pro/Premium; concluir checkout; mostrar pendente até confirmação; gerenciar assinatura e efeitos da mudança.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Esta seção deriva quatro critérios da tabela de planos e das decisões pendentes da fonte, pois F11 não tinha critérios explícitos próprios. Não são transcrições literais de uma lista inexistente. Se um critério envolve decisão ainda pendente, resolver em S0 e acrescentar valores e exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F11-AC01 | O plano gratuito oferece perfil e categorias, conforme os recursos definidos na fonte. | F11-T01 | I/PG |
| F11-AC02 | Pro e Premium diferenciam capacidades verificadas no servidor, conforme tabela da fonte. | F11-T02 | I/PG |
| F11-AC03 | A assinatura do perfil permanece separada da compra de destaque no catálogo. | F11-T03 | I/PG |
| F11-AC04 | Preço, limites, cobrança e cancelamento precisam de decisão registrada antes de habilitar venda. | F11-T04 | ADR + I/E |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F11; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F11-U01:** Estado ativo concede capacidade, pendente não.
- **F11-U02:** expiração remove capacidade conforme política.
- **F11-U03:** downgrade não apaga conteúdo.
- **F11-U04:** comparar centavos/moeda sem float.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F11-I01:** Webhook duplicado e fora de ordem não concede duas vezes; assinatura mapeada ao dono via IDs do provedor; sucesso de browser sozinho não ativa; promoção paga antiga segue intacta.
- **F11-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F11. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F11-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F11-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F11-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Planos para perfis e páginas”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F11-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F11-E01:** Criar assinatura em adapter sandbox; voltar ao painel pendente; confirmar evento assinado e ver capacidade; simular falha de renovação e cancelamento; verificar perfil básico preservado.
- **F11-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F11-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/billing/planos-perfis.spec.ts`.
- C: `frontend/src/components/domain/planos-perfis.test.tsx`.
- I: `backend/src/http/planos-perfis.http.spec.ts`.
- PG: `backend/src/http/planos-perfis.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/planos-perfis.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D13 preços, limites, periodicidade, prorrata, provedor e tratamento tributário; D12 grace/cancelamento.

Risco específico: Não implementar recorrência com laço de PaymentIntents ou reaproveitar OrderStatus de promoção; Billing adapter separado justificado pelo ciclo recorrente.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

Proposta de diferenciação, sujeita a validação com o público. Não há preços nem limites numéricos definidos.

| Plano | Recursos propostos |
| --- | --- |
| Gratuito | Perfil em `seudominio.com/p/nome`, categorias próprias e tema básico. |
| Pro | Mais personalização, estatísticas por botão, agendamento de links e remoção da marca da plataforma. |
| Premium | Subdomínio, landing page com mais blocos e, futuramente, domínio próprio. |

A assinatura do perfil personaliza a página; a compra de destaque oferece exposição no catálogo. Manter os produtos separados inicialmente e avaliar combos depois.

**Decisões pendentes:** limites por plano, preço, cobrança, política de cancelamento, disponibilidade dos endereços e regras para mudanças de plano.

