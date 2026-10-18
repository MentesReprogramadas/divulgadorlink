# F37 Botão com alternativas de acesso

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 21.

**Estado:** S0–S6 verificadas localmente em 18/10/2026; S7 em revisão.  
**Onda:** 3. **Ordem:** 21.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Botão com alternativas de acesso”.  
**Plano:** [F37 implementação](../planos/f37-alternativas-acesso.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F12](../specs/f12-link-permanente.md), [F19](../specs/f19-historico-versoes.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

permitir que o visitante escolha o canal pelo qual deseja acessar uma comunidade.

Escopo aprovado para detalhamento: um bloco reúne alternativas como WhatsApp, Telegram e site, com destinos e rótulos definidos pelo proprietário. Diferente do distribuidor de convites, a escolha é feita pelo visitante.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Mostrar alternativas rotuladas WhatsApp/Telegram/site; dono pode pausar cada canal.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/domain/links/network-host.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/ui/button.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/link-meta.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não assumir que comunidades em canais diferentes são equivalentes; responsabilidade de descrição do dono.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

ChannelGroup tipado reutiliza ProfileItem e destinos versionados de F12; escolha humana, não algoritmo de distribuição.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos implementados

Rotas/operações: CRUD grupo/canais em /api/v1/me/profile/channel-groups/:id, com listagem própria e seleção em /api/v1/me/profile/channel-destinations; projeção pública retorna apenas canais elegíveis.

**Entrada específica:** `name,visible,channels[{id,label,networkId,destinationRevisionId,paused}],expectedVersion`.

**Saída específica:** `channelGroups[{id,name,channels[{id,label,network,href}]}],publishedRevisionId`; href assinado tem propósito próprio, distinto de analytics/surfaceToken.

Rotas reconciliadas e implementadas, com detalhamento no registro de execução. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Mostrar alternativas rotuladas WhatsApp/Telegram/site; dono pode pausar cada canal.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F37-AC01 | identificar cada canal com clareza | F37-T01 | C/E |
| F37-AC02 | validar destinos individualmente | F37-T02 | I/PG |
| F37-AC03 | respeitar pausa e disponibilidade | F37-T03 | I/PG |
| F37-AC04 | oferecer navegação pelo teclado e no celular | F37-T04 | C/E |
| F37-AC05 | medir cada alternativa separadamente | F37-T05 | I/PG |
| F37-AC06 | não prometer equivalência entre comunidades sem confirmação do responsável. | F37-T06 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F37; T0 = 2026-10-18T12:00:00Z nos PG próprios; E2E usa o relógio do servidor do harness, sem congelar a disponibilidade real da aplicação. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F37-U01:** Canal pausado/indisponível ausente ou desabilitado conforme contrato.
- **F37-U02:** nome da rede combina com destino.
- **F37-U03:** nenhum canal => estado claro.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F37-I01:** Editar destino exige validação e não altera outros canais; cliques identificam canal com identidade estável; token não permite trocar destino.
- **F37-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F37. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F37-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F37-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F37-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Botão com alternativas de acesso”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F37-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F37-E01:** Navegar por teclado e escolher Telegram; conferir destino no stub; pausar Telegram e verificar opção inacessível; mobile mantém rótulos.
- **F37-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F37-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/profile-channels.spec.ts`.
- C: `frontend/src/features/profile-channels/channel-choices.test.tsx`.
- I: `backend/src/http/profile-channels.pg.spec.ts`.
- PG: `backend/src/http/profile-channels.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/profile-channels.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D39 resolvida: até oito canais por grupo, fontes próprias F12 aprovadas, rede verificada, pausa a publicar, disponibilidade revalidada no clique e metadata associada a revisões F19.

Risco específico: Não assumir que comunidades em canais diferentes são equivalentes; responsabilidade de descrição do dono.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** permitir que o visitante escolha o canal pelo qual deseja acessar uma comunidade.

**Escopo inicial:** um bloco reúne alternativas como WhatsApp, Telegram e site, com destinos e rótulos definidos pelo proprietário. Diferente do distribuidor de convites, a escolha é feita pelo visitante.

**Critérios de conclusão:** identificar cada canal com clareza; validar destinos individualmente; respeitar pausa e disponibilidade; oferecer navegação pelo teclado e no celular; medir cada alternativa separadamente; não prometer equivalência entre comunidades sem confirmação do responsável.

**Indicadores:** cliques por canal e uso dos blocos com alternativas.


Escolhas e alternativas de S0: [execução F37](../execucao-f37.md). Critérios locais aprovados; S7 global/remoto permanece em revisão.

Reconciliação técnica: F19 é dependência obrigatória porque a metadata publicada referencia suas revisões imutáveis e acompanha a retenção; F31 é reaproveitada condicionalmente para medição, sem conceder capacidade. Decisão D39 em execucao-f37.md. Autorização mais recente determina parar ao concluir F37; F38 e posteriores não iniciar.

[Fechamento local, contratos, escolhas, rollback e resultados](../execucao-f37.md). Pausa solicitada após F37; próxima F38 não iniciada.
