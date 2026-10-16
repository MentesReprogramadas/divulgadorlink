# F02 Lembrete de renovação

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 5.

**Estado:** CONCLUÍDA NA BRANCH; AC01–AC05 e CI aprovados, conforme registro de execução.
**Onda:** 2. **Ordem:** 5.
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Lembrete de renovação”.
**Plano:** [F02 implementação](../planos/f02-lembrete-renovacao.md).
**Dependências obrigatórias:** G00, [F01](../specs/f01-resultado-destaque.md).
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

facilitar a continuidade de um destaque que esteja prestes a terminar.

Escopo aprovado para detalhamento: aviso no painel e por e-mail antes do vencimento, com data de encerramento, resumo de resultado e botão para o fluxo de renovação. Proposta de antecedência: três dias, sujeita a validação.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Mostrar aviso com expiração e resultado; usuário habilita ou desabilita e-mail e abre renovação existente sem débito automático.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/use-cases/@Promotions/renew.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/worker.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/adapters/notifications/email/templates.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/adapters/notifications/outbound-mail.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: E-mail tem entrega pelo menos uma vez; diferenciar intenção única de garantia impossível de entrega exatamente uma vez.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Preferência por usuário e registro durável de lembrete com unicidade tenant/promoção/janela/canal; job revalida estado antes da entrega.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET/PATCH /api/v1/me/notification-preferences e GET /api/v1/promotions/mine/reminders; processamento de vencimentos fora do request.

**Entrada específica:** `emailRenewal:boolean, expectedVersion:int`; frequência fixa ONCE_PER_EXPIRY conforme D03.

**Saída específica:** `preferences,reminders[{promotionId,expiresAt,status,renewPath}]`.

Rotas implementadas; contratos concretizados em D03 e no registro de execução. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Mostrar aviso com expiração e resultado; usuário habilita ou desabilita e-mail e abre renovação existente sem débito automático.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F02-AC01 | não duplicar avisos | F02-T01 | I/PG |
| F02-AC02 | não avisar sobre promoção cancelada ou já renovada | F02-T02 | I/PG |
| F02-AC03 | conferir o estado no momento do envio | F02-T03 | I/PG |
| F02-AC04 | permitir configurar os lembretes opcionais | F02-T04 | I/PG |
| F02-AC05 | renovar somente mediante ação do usuário. | F02-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F02; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F02-U01:** Relógio no limite de antecedência inclui a promoção.
- **F02-U02:** cancelada, renovada ou preferências desligadas excluem.
- **F02-U03:** reprocessamento mantém uma chave de entrega.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F02-I01:** Dois workers disputam o mesmo lembrete => uma intenção durável; simular e-mail indisponível e repetir com a mesma chave; renovação ocorrida na fila cancela envio.
- **F02-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F02. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F02-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F02-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F02-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Lembrete de renovação”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F02-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F02-E01:** Ativar lembretes; preparar vencimento por fixture; aguardar outbox local com polling; desativar e confirmar ausência de novo e-mail; abrir CTA sem criar compra.
- **F02-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F02-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/notifications/renewal-reminder.spec.ts`.
- C: `frontend/src/features/renewal-reminders/components/reminder-preference-form.test.tsx`.
- I: `backend/src/http/renewal-reminders.pg.spec.ts`.
- PG: `backend/src/http/renewal-reminders.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/renewal-reminders.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D03 antecedência, frequência e preferências padrão; decisão explícita antes do agendamento.

Risco específico: E-mail tem entrega pelo menos uma vez; diferenciar intenção única de garantia impossível de entrega exatamente uma vez.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** facilitar a continuidade de um destaque que esteja prestes a terminar.

**Escopo inicial:** aviso no painel e por e-mail antes do vencimento, com data de encerramento, resumo de resultado e botão para o fluxo de renovação. Proposta de antecedência: três dias, sujeita a validação.

**Base existente:** expiração de promoções, fluxo de renovação, filas e envio de e-mails.

**Critérios de conclusão:** não duplicar avisos; não avisar sobre promoção cancelada ou já renovada; conferir o estado no momento do envio; permitir configurar os lembretes opcionais; renovar somente mediante ação do usuário.

**Indicadores:** renovações após o aviso e frequência de desativação dos lembretes.


## Contrato concretizado em 16/10/2026

D03: três dias de antecedência, janela (agora, agora+72h], um aviso por promoção/vencimento/canal. E-mail desligado por padrão e opt-in explícito por usuário; frequência fixa, sem campo de cadência arbitrária. A preferência pertence ao usuário no tenant da sessão. PATCH exige expectedVersion e rejeita campos desconhecidos; conflito retorna 409. GET privado não agenda nada. Aviso do painel independe do e-mail. Promoções pausadas da F07 não recebem lembrete; a retomada gera novo vencimento elegível.

Página /painel/lembretes, aviso na visão geral e modo ?renew=SURFACE na página de destaque existente. Os links de renovação são gerados pelo backend; os preços e a elegibilidade continuam no checkout existente. Abrir a página não cria compra; confirmar o pagamento chama POST /promotions/renew. O resumo reutiliza F01, com período, cobertura e resultados observados.

Persistência: users.emailRenewal e notificationVersion; RenewalReminder com FK composta para promoção/tenant e unicidade tenant/promoção/vencimento/EMAIL. O corpo e chave da primeira tentativa são duráveis; após entrega, descarte ou falha terminal o corpo com endereço é apagado. Registros terminais são removidos após 30 dias do vencimento pelo ciclo habilitado. O flag desligado conserva dados e impede envio; a retenção depende da execução do worker. Detalhes de concorrência, idempotência, rollout e evidências em [execução](../execucao-f02.md).
