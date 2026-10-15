# F39 Página em vários idiomas

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 38.

**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.  
**Onda:** 5. **Ordem:** 38.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Página em vários idiomas”.  
**Plano:** [F39 implementação](../planos/f39-multilingue.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F19](../specs/f19-historico-versoes.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

atender públicos de idiomas diferentes com versões da mesma página.

Escopo aprovado para detalhamento: o proprietário cria traduções da apresentação, categorias e botões; seletor de idioma visível; idioma principal como alternativa quando não houver tradução.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Dono traduz apresentação/categorias/botões; visitante escolhe idioma; campos faltantes usam principal conforme contrato.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/src/domain/crawler-policy.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/domain/json-ld.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/breadcrumb.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Reutilizar tokens e renderer, não clonar páginas para cada idioma.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

ProfileTranslation e traduções por blockId/revisionId; locale allowlist, idioma principal e fallback definidos; destinos compartilhados por padrão salvo decisão.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/profiles/:slug?locale; CRUD /me/profile/translations/:locale; rotas públicas por idioma conforme D41.

**Entrada específica:** `locale,translatedFields por blockId,expectedVersion`.

**Saída específica:** `localizedProfile{locale,fallbackLocale,fields,revisionId},alternates`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Dono traduz apresentação/categorias/botões; visitante escolhe idioma; campos faltantes usam principal conforme contrato.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F39-AC01 | manter versões editáveis e consistentes | F39-T01 | I/PG |
| F39-AC02 | permitir selecionar o idioma manualmente | F39-T02 | I/PG |
| F39-AC03 | indicar traduções ausentes no painel | F39-T03 | C/E |
| F39-AC04 | respeitar visibilidade e agendamento em todas as versões | F39-T04 | I/PG |
| F39-AC05 | definir endereços e metadados de idioma para páginas públicas. | F39-T05 | ADR + I/E |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F39; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F39-U01:** Locale inválido recusado.
- **F39-U02:** tradução faltante usa principal sem apagar texto.
- **F39-U03:** ocultação/agenda valem em todos idiomas.
- **F39-U04:** hreflang não aponta para draft.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F39-I01:** Publicação valida relações entre tradução e revisão; exclusão de item retira traduções órfãs; cache varia por locale sem misturar conteúdo.
- **F39-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F39. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F39-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F39-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F39-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Página em vários idiomas”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F39-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F39-E01:** Publicar PT/EN, trocar idioma, atualizar e conferir persistência/URL; item oculto não aparece em EN; verificar lang, canonical e alternates.
- **F39-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F39-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/multilingue.spec.ts`.
- C: `frontend/src/components/domain/multilingue.test.tsx`.
- I: `backend/src/http/multilingue.http.spec.ts`.
- PG: `backend/src/http/multilingue.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/multilingue.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D41 idiomas, URL canônica, fallback e regras para destino por idioma.

Risco específico: Reutilizar tokens e renderer, não clonar páginas para cada idioma.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** atender públicos de idiomas diferentes com versões da mesma página.

**Escopo inicial:** o proprietário cria traduções da apresentação, categorias e botões; seletor de idioma visível; idioma principal como alternativa quando não houver tradução.

**Critérios de conclusão:** manter versões editáveis e consistentes; permitir selecionar o idioma manualmente; indicar traduções ausentes no painel; respeitar visibilidade e agendamento em todas as versões; definir endereços e metadados de idioma para páginas públicas.

**Indicadores:** páginas com traduções, visitas e cliques por idioma.

