# F30 Integrações e avisos automáticos

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 36.

**Estado:** IMPLEMENTADA E VALIDADA LOCALMENTE; S7 pendente.
**Onda:** 5. **Ordem:** 36.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Integrações e avisos automáticos”.  
**Plano:** [F30 implementação](../planos/f30-integracoes-webhooks.md).  
**Dependências obrigatórias:** G00, [F22](../specs/f22-formulario-contato.md), [F02](../specs/f02-lembrete-renovacao.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

conectar acontecimentos da plataforma à operação dos usuários profissionais.

Escopo aprovado para detalhamento: avisos para sistemas externos quando houver contato recebido, aprovação de link ou encerramento de campanha; histórico de entregas no painel.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Configurar destino e eventos, testar entrega com dado sintético, acompanhar falhas e desativar.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/worker.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/adapters/http/safe-fetch.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/adapters/payments/woovi-webhook-signature.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/repositories/audit-logs-repository.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Reutilizar conceitos de assinatura, não segredo/chaves dos gateways; não enfraquecer safe-fetch em produção para testes.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

WebhookEndpoint, OutboundEvent e DeliveryAttempt; assinatura HMAC com timestamp/eventId, segredo cifrado/restrito, retentativas limitadas e outbox transacional.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: CRUD /api/v1/me/integrations/endpoints; POST rotate-secret/disable/retry; GET deliveries com payload minimizado.

**Entrada específica:** `httpsEndpoint,eventTypes; rotate/disable/retry com versionamento`.

**Saída específica:** `endpoint{id,state,secretPreview},deliveries[{eventId,status,attempts,nextAttemptAt}]; segredo só na criação/rotação autorizada`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Configurar destino e eventos, testar entrega com dado sintético, acompanhar falhas e desativar.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F30-AC01 | autenticar entregas | F30-T01 | I/PG |
| F30-AC02 | identificar eventos de forma única | F30-T02 | I/PG |
| F30-AC03 | repetir falhas com limites | F30-T03 | I/PG |
| F30-AC04 | aceitar que entregas podem se repetir e documentar deduplicação | F30-T04 | I/PG |
| F30-AC05 | restringir os dados ao necessário | F30-T05 | I/PG |
| F30-AC06 | validar destinos e proteger contra acesso à rede interna | F30-T06 | I/PG |
| F30-AC07 | permitir desativar a integração. | F30-T07 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F30; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F30-U01:** Mesma ocorrência mantém eventId entre tentativas.
- **F30-U02:** corpo/timestamp alterado invalida assinatura.
- **F30-U03:** endpoint privado bloqueado.
- **F30-U04:** desativado não entrega.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F30-I01:** Reinício do worker preserva outbox; 500 agenda backoff, 2xx confirma; redirecionamento para rede interna bloqueado; rotação respeita janela definida.
- **F30-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F30. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F30-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F30-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F30-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Integrações e avisos automáticos”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F30-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F30-E01:** Criar endpoint em stub do harness autorizado só em teste; gerar contato real; validar entrega assinada e falha/retry no painel; desativar impede próximo envio.
- **F30-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F30-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/integrations/integracoes-webhooks.spec.ts`.
- C: `frontend/src/components/domain/integracoes-webhooks.test.tsx`.
- I: `backend/src/http/integracoes-webhooks.http.spec.ts`.
- PG: `backend/src/http/integracoes-webhooks.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/integracoes-webhooks.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D32 tipos de eventos, retry/backoff/retencão, rotação e política de saída de dados.

Risco específico: Reutilizar conceitos de assinatura, não segredo/chaves dos gateways; não enfraquecer safe-fetch em produção para testes.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** conectar acontecimentos da plataforma à operação dos usuários profissionais.

**Escopo inicial:** avisos para sistemas externos quando houver contato recebido, aprovação de link ou encerramento de campanha; histórico de entregas no painel.

**Critérios de conclusão:** autenticar entregas; identificar eventos de forma única; repetir falhas com limites; aceitar que entregas podem se repetir e documentar deduplicação; restringir os dados ao necessário; validar destinos e proteger contra acesso à rede interna; permitir desativar a integração.

**Indicadores:** integrações ativas, taxa de entrega e falhas pendentes.



## Execução de 21/10/2026

Contrato final, reuso, decisões, limites, alternativas e comandos em [execução F30](../execucao-f30.md). A autorização de continuar substitui a condição anterior de somente planejamento. CI e deploy não executados.
