# F18 Busca dentro do perfil

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 17.

**Estado:** S0–S6 validadas localmente; S7 EM REVISÃO por CI/liberação remotos pendentes. [Execução F18](../execucao-f18.md).
**Onda:** 3. **Ordem:** 17.
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Busca dentro do perfil”.
**Plano:** [F18 implementação](../planos/f18-busca-perfil.md).
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F14](../specs/f14-agendamento.md).
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

facilitar a navegação em páginas com muitos links.

Escopo aprovado para detalhamento: busca por nome e categoria, com filtros simples e mensagem para consultas sem resultados.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Buscar e filtrar categorias no perfil; limpar filtros e exibir estado vazio útil.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

ProfileView conserva identidade, marca, grupos e links; recebe slots opcionais de controles/navegação/vazio. ProfileExplorer coordena busca pública e prévia própria sobre esse mesmo renderer. Field/Input/Select/Button/EmptyState/ErrorState existentes; sem biblioteca nova. useProfileBoundary extrai o timer servidor de ProfileLive após a regressão do consumidor anterior. A busca global, FacetFilters e catalog-query foram inspecionados e não ampliados: dependem de catálogo, anúncios/tokens e taxonomias de rede/nicho, responsabilidades diferentes.

Backend reaproveita publicProfile/previewProfile e a projeção temporal/idade/tenant já existente. Regra lexical pura só recebe conteúdo previamente projetado. Helper de cursor trata assinatura/contexto; não cria repository/índice paralelo. Justificativas e alternativas em D20 na execução.

## Dados e invariantes

Consulta limitada à projeção pública de ProfileItem, por nome/categoria, com ordem e paginação estáveis. Sem embeddings no MVP.

S2 reconciliada: sem mudança de schema, índice, job ou backfill. Snapshot existente limita cada página pessoal a 500 itens; a projeção de tempo/idade/elegibilidade deve ocorrer antes do filtro e não cabe substituir por SQL sobre rascunho. Isolamento e ausência de efeitos de GET comprovados em PostgreSQL real; leitura anterior continua compatível.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos implementados

- GET /api/v1/profiles/:slug/items?q&categoryId&cursor: leitura pública publicada e elegível.
- GET /api/v1/me/profile/preview/items?at&q&categoryId&cursor: mesma composição na prévia própria; at ISO usa a simulação existente, autorização por sessão/tenant/dono.
- q vazio lista todos; uma letra já pesquisa; máximo 100 caracteres. Normalização de acentos/maiúsculas/espaços; palavras AND no título + nome do grupo. URL/bio/identidade não são pesquisadas. categoryId UUID opcional combina AND; desconhecida retorna vazio.
- Até 20 itens por página, ordem visual existente (principal, grupos/itens). Cursor HMAC vincula tenant/página/contexto privado/at, consulta, publicação e conjunto atualmente elegível; offset limitado a 500. Alteração incompatível retorna 409; aplicação reinicia primeira página mantendo filtros e avisa. Cursor adulterado retorna 422; formato inválido 400. Requisição privada sem sessão 401 e recurso alheio/ausente 404.
- Resposta: projeção pessoal com items/categories somente da página e primaryItemId elegível; search contém filters {q,categoryId,cursor}, groups públicos elegíveis, total filtrado e nextCursor. Restrição de idade retorna somente {restricted:true}. Nenhum publishedDraft, agenda privada, contato ou token secreto na saída pública.
- No-store; q/categoryId/cursor na URL pública, preservando UTM. Prévia usa parâmetros privados no transporte, sem publicar seus dados. APIs completas anteriores mantidas; canonical/robots/sitemap/metadados preservados. Sem mutação, fila, métrica de termos ou novo tracking.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo implementado: texto e grupo abaixo da identidade, ações à direita, resultados do mesmo renderer; limpar, vazio, erro com retry e skeleton que bloqueia hrefs antigos. Paginação move foco ao primeiro resultado. CSS Module usa tema pessoal também no hover/paginação; largura dos controles acompanha os links. SSR respeita os filtros; voltar/avançar ignora resposta obsoleta. Prévia mantém banner/retorno/simulação temporal existentes.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturas reais e limites registrados na execução. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F18-AC01 | pesquisar somente itens públicos do perfil | F18-T01 | I/PG |
| F18-AC02 | respeitar agendamento e visibilidade | F18-T02 | I/PG |
| F18-AC03 | acesso pelo teclado | F18-T03 | C/E |
| F18-AC04 | resultados atualizados após edição. | F18-T04 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F18; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F18-U01:** Busca normalizada sobre projeção já autorizada mantém ordem e exclui ocultos/exemplos. Guardas de agenda/publicação/rascunho são comprovados em PG/E2E; não atribuir autorização temporal à função lexical pura.
- **F18-U02:** categoria inexistente não abre consulta global.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F18-I01:** Consulta só sobre versão publicada do perfil; combinação de filtros e cursor não repete itens; host B não encontra itens A.
- **F18-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F18. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F18-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F18-PG01:** validar isolamento/consulta real descritos na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F18-C01:** envio interativo na página atual, sem requisição duplicada e sem href antigo durante loading.
- **F18-C02:** erro conserva filtros; retry usa a consulta exata e só reabilita destinos após resposta válida.
- **F18-C03:** cursor obsoleto reinicia primeira página mantendo filtros; restrição etária oculta busca/metadados.
- **F18-C04:** relógio servidor atualiza os mesmos filtros, preserva controles de teclado e mantém destinos bloqueados se falhar.
- **F18-C05/C06:** URL preserva texto em português/atribuição alheia e recusa valores duplicados, longos ou malformados.
- **F18-C07:** navegação pode superar resposta lenta; resultado antigo não substitui o atual mesmo se o transporte resolver após abort.

Obrigação de ausência de dados privados mantida: sentinelas ocultas não podem entrar em DTO/HTML/texto/atributo/href público; comprovada em I01/PG e E01/E02 contra a API real, além do gate etário C03. A prévia própria continua proibida sem sessão ou para outro dono/tenant/admin sem propriedade (I02).

### E2E Playwright

- **F18-E01:** Pesquisar nome, filtrar categoria, limpar; navegar por teclado; atualizar página mantém consulta; nome de item oculto não aparece nem no payload.
- **F18-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F18-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste reais

- U: backend/src/domain/profiles/profile-item-search.spec.ts e backend/src/lib/profile-item-search-page.spec.ts.
- C: frontend/src/features/profiles/profile-explorer.test.tsx, profile-search-contract.test.ts; regressões profile-live.test.tsx e profile-preview-screen.test.tsx.
- I/PG: backend/src/http/profile-item-search.pg.spec.ts, registrado em test:pg; app Fastify real + PostgreSQL descartável.
- E: frontend/e2e/profile-search.spec.ts, registrado em features/features-mobile e playwright.profile-search.config.ts. IDs T01–T04 ligados a AC01–AC04; ver execução para assertivas/artefatos.

## Decisões e condições de liberação

D20: lexical mínimo 1 caractere, vazio todos, máximo 100; texto AND grupo, 20 itens/página, cursor assinado e reinício informado. Alternativas/justificativas na execução.

Risco específico: Não reutilizar busca global sem impor escopo profileId e elegibilidade pública.

D20 resolvida e implementação autorizada; S7/liberação remota permanece separado. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** facilitar a navegação em páginas com muitos links.

**Escopo inicial:** busca por nome e categoria, com filtros simples e mensagem para consultas sem resultados.

**Critérios de conclusão:** pesquisar somente itens públicos do perfil; respeitar agendamento e visibilidade; acesso pelo teclado; resultados atualizados após edição.

**Indicadores:** buscas que geram clique e uso em perfis com muitos itens.

