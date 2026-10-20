# F25 Assistente de criação de perfil

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 29.

**Estado:** S0–S6 verificadas localmente em 19/10/2026; S7/CI/liberação em revisão.
**Onda:** 4. **Ordem:** 29.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Assistente de criação de perfil”.  
**Plano:** [F25 implementação](../planos/f25-assistente-perfil.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F16](../specs/f16-templates.md), [F17](../specs/f17-importacao-lote.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Contrato concretizado em 19/10/2026

GET/POST /api/v1/me/profile/suggestions; GET/DELETE /:id; POST /:id/preview e /:id/apply. Entrada: name/slug (iguais ao rascunho existente), activity, providedFacts, linkIds, linksText, expectedVersion, requestKey. Saída schemaVersion 1, provenance, validation, content e quota; aplicação devolve rascunho com versão. Campos selecionáveis bio/groups/order/appearance, bio manual e template existente opcionais. Geração/descarte não salvam página nem publicam. Aplicação transacional, idempotente e com versão esperada, preservando campos omitidos. Reutiliza parser F17, modelos F16, renderer de prévia existente e writeDraft. Porta própria de geração; não reutiliza moderação como gerador. Seção global assistant permite consultar/aplicar rascunho, sem conceder editor manual/publicação. Cinco tentativas/dia UTC, reserva técnica e tokens/custo estimado; sugestões 24h, uso agregado 180 dias. Modelo/limites/dados e alternativas em D27 no registro de execução. Chave/acesso reais da conta e cobrança do provedor não foram ensaiados.

D27 resolvida por escolha técnica documentada, conforme autorização para decidir sem consultas rotineiras. [Execução, testes, alternativas e limites](../execucao-f25.md). Sem novo commit/push/deploy. O planejamento inicial abaixo é histórico; divergências de nomes/contrato são reconciliadas por esta seção e pelo código/testes referenciados.

## Objetivo e fronteira

facilitar a publicação do primeiro perfil.

Escopo aprovado para detalhamento: a partir da atividade e dos links informados, sugerir bio, categorias, ordem dos botões e template; revisão pelo usuário antes de publicar.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Informar atividade/URLs, gerar sugestão, editar/descartar e aplicar ao rascunho; publicar sempre explícito.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/adapters/moderation/openai-text-moderation.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/domain/embeddings/embedding-service.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/ui/input.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Novo adapter é justificado por capacidade de geração diferente; reutilizar padrão de porta sem acoplar IA ao controller.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

ProfileSuggestion temporária, baseada apenas nos dados fornecidos; porta de geração separada dos adapters de moderação/embedding, sem fingir que fazem geração; limites de tokens/custo.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos de referência do planejamento inicial

Rotas/operações: POST /api/v1/me/profile/suggestions; POST /suggestions/:id/apply com campos escolhidos e versão de draft.

**Entrada específica:** `activity,providedFacts,linkIds; apply{suggestionId,selectedFields,expectedVersion}`.

**Saída específica:** `suggestion{schemaVersion,fields,provenance,validation},quota; apply retorna draftVersion`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Informar atividade/URLs, gerar sugestão, editar/descartar e aplicar ao rascunho; publicar sempre explícito.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F25-AC01 | não inventar credenciais, números ou benefícios | F25-T01 | I/PG |
| F25-AC02 | permitir editar e descartar sugestões | F25-T02 | I/PG |
| F25-AC03 | não publicar automaticamente | F25-T03 | I/PG |
| F25-AC04 | validar destinos | F25-T04 | I/PG |
| F25-AC05 | aplicar limites de uso e acompanhar custo das sugestões. | F25-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F25; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F25-U01:** Saída fora do schema recusada.
- **F25-U02:** credencial/número não informado não aceito como fato.
- **F25-U03:** campos omitidos não sobrescrevem conteúdo.
- **F25-U04:** limite excedido bloqueia chamada.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F25-I01:** Provedor simulado retorna JSON inválido/timeout e mantém draft; quota debitada de forma definida; aprovar sugestão não publica nem aprova catálogo.
- **F25-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F25. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F25-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F25-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F25-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Assistente de criação de perfil”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F25-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F25-E01:** Solicitar sugestão com adapter determinístico local, editar bio e aplicar; conferir visitante sem mudança; descartar segunda sugestão mantém draft.
- **F25-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F25-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/profile-suggestion.spec.ts`.
- C: `frontend/src/features/profile-assistant/assistant-review.test.tsx`.
- I: `backend/src/http/profile-suggestions.pg.spec.ts`.
- PG: `backend/src/http/profile-suggestions.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/assistente-perfil.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D27 provedor/modelo, orçamento, política de dados e validação de fatos; seleção externa antes de integrar.

Risco específico: Novo adapter é justificado por capacidade de geração diferente; reutilizar padrão de porta sem acoplar IA ao controller.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** facilitar a publicação do primeiro perfil.

**Escopo inicial:** a partir da atividade e dos links informados, sugerir bio, categorias, ordem dos botões e template; revisão pelo usuário antes de publicar.

**Critérios de conclusão:** não inventar credenciais, números ou benefícios; permitir editar e descartar sugestões; não publicar automaticamente; validar destinos; aplicar limites de uso e acompanhar custo das sugestões.

**Indicadores:** conclusão da criação, sugestões aproveitadas e tempo até a primeira publicação.



## Delta autorizado de UX — 19/10/2026

[Refinamento executado e validação](../refinamento-f22-f23-f25.md): novos pontos de entrada, configuração integrada, seleção guiada/revisão e prévia reutilizada. Este delta prevalece sobre instruções antigas de navegação. Preserva os ACs e contratos comerciais/de acesso existentes; sem backend ou migração novos. Provas históricas permanecem nos JSONs originais; o refinamento tem evidência própria. S7 remoto continua pendente.
