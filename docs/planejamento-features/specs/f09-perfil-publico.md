# F09 Perfil público com categorias próprias

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 8.

**Estado:** CONCLUÍDA NA BRANCH; S0–S7 e AC01–AC06 verificados. D10 resolvida; CI 38940575906 aprovado.

Registro atual: [execução F09](../execucao-f09.md). Os critérios e cenários abaixo permanecem vinculantes. A seção de reconciliação registra os contratos implementados; o fechamento exige evidências de todos os gates.

## Reconciliação de execução e D10 — 16/10/2026

O usuário escolheu: **“Validação automática; bloquear conteúdo suspeito e manter rascunho para correção”**. Não há revisão humana de perfil nesta feature nem aprovação automática de entrada no catálogo por consequência da publicação do perfil.

Slug é único por tenant, 3–40 caracteres ASCII, com normalização de caixa/espaços externos e recusa de nomes reservados. Enquanto publicado, precisa retirar do ar antes de mudar o endereço; isso preserva a identidade do snapshot público durante edição do rascunho. Retirada incrementa a versão, impedindo republicação por uma requisição antiga. Sem histórico de revisões restauráveis, que permanece em F19.

PATCH `/api/v1/me/profile` recebe `{expectedVersion,content}`; content reúne identidade, `requiresAge`, `primaryItemId`, categorias e itens ordenados por arrays. CRUD e reordenação dos grupos/itens são uma gravação atômica do agregado, substituindo a proposta de endpoints independentes para evitar estados intermediários e múltiplas versões de uma mesma edição. GET privado retorna `{draft,publishedVersion}`; POST `/me/profile/publish` e `/me/profile/unpublish` recebem expectedVersion; GET `/me/profile/preview` usa a mesma projeção pública e renderer; GET `/profiles/:slug` não exige sessão. Erros mantêm envelope e CSRF existente. API privada não recebe owner/tenant por corpo nem dá bypass ao admin.

Profile, ProfileCategory e ProfileItem são tabelas novas; a publicação é uma única projeção JSON allowlist em Profile. Referências CATALOG exigem link próprio do mesmo tenant e publicado na publicação; URL/SOCIAL usam HTTPS público validado e normalizado, listas de bloqueio e probe com DNS/redirecionamento seguro. O adapter existente de moderação ganhou uma instrução específica de perfil, conservando a instrução original do catálogo; usa o limiar MODERATION_AUTO_APPROVE_THRESHOLD. Veredito suspeito/baixa confiança bloqueia com 422; falta de configuração, timeout, erro ou resultado inconclusivo bloqueia com 503; rascunho e publicação anterior são preservados. A revisão valida também campos/itens ocultos do rascunho antes de publicar. Não se promete inspeção completa do conteúdo remoto ou segurança futura de um destino que pode mudar.

Fotos passam por porta de mídia com adapter PostgreSQL existente, sem provedor novo. Browser aceita PNG/JPG/WebP até 5 MiB, normaliza/redimensiona e envia somente PNG; servidor valida assinatura, CRC, estrutura, dimensões (até 512 px), inflate limitado, filtros e até 256 KiB, reencodando sem metadados. Assets são isolados por dono/tenant e o endpoint público serve apenas a foto do snapshot vigente, respeitando idade/suspensão. Não há classificação semântica de imagem por IA nesta entrega. Fotos anteriores sem referência no rascunho/publicação são removidas; um upload recente ainda não salvo é mantido até a próxima limpeza. Limites de engenharia do agregado: 100 grupos, 500 itens, nome 80, bio 500, rótulo 100, URL 2048, além do body limit existente de 1 MiB; não são quotas de catálogo ou benefícios pagos.

Público exige dono ativo; referências de catálogo são revalidadas em cada leitura. Idade considera perfil, nicho ou rede de referências visíveis. Antes do aceite, API/SSR entregam apenas o estado restrito, sem nome, bio, foto ou itens. Respostas usam no-store. Canonical e SSR próprios; noindex no MVP, sem inclusão no sitemap ou ranking de descoberta (F24). Eventos de catálogo/go, consentimento e atribuição ficam preservados; métricas específicas de perfil/cliques não são inventadas, permanecendo para F31.

Caminhos finais: backend `domain/profiles`, `repositories/profiles-repository.ts`, `repositories/profile-media.ts`, `use-cases/@Profiles/validate-profile.ts`, `http/controllers/@Profiles/routes.ts`, `http/profiles.pg.spec.ts`; frontend `features/profiles`, `app/painel/perfil`, `app/p/[slug]`, `e2e/profiles.spec.ts`. HTTP/I/PG são provados no mesmo arquivo com Fastify e PostgreSQL reais, sem repository em memória. U04/U05 contam também com prova PG de ausência de criação de catálogo/facetas. Testes novos estão registrados em test:pg e nos dois projetos Playwright.
**Onda:** 2. **Ordem:** 8.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Perfil público com categorias próprias”.  
**Plano:** [F09 implementação](../planos/f09-perfil-publico.md).  
**Dependências obrigatórias:** G00; base atual, sem outra feature nova.  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

permitir que cada divulgador reúna sua presença em uma página compartilhável, no estilo Linktree.

Escopo aprovado para detalhamento: aba Perfil no painel; foto, nome, descrição, redes sociais e botão principal; grupos e categorias definidos pelo usuário; ordenação e visibilidade de categorias e links; endereço como `seudominio.com/p/nome`.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Aba Perfil edita foto, nome, bio, grupos, ordem e botão principal; prévia usa o mesmo renderer público em /p/:slug.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/src/components/domain/panel.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/ui/input.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/age-gate.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/domain/links/canonical-url.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/http/authorize.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Profile não é Tenant novo; usar projeção pública única para evitar vazar rascunhos.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Profile, ProfileCategory e ProfileItem com tenantId e ownerId; categoria pessoal não é Niche/Network; ProfileItem pode referenciar Link do catálogo ou URL própria validada; versão mínima draft/published nasce aqui, histórico em F19. Avatar precisa de porta de mídia e limites, sem escolher provedor novo.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET/PATCH /api/v1/me/profile; CRUD /me/profile/categories e items; POST /me/profile/publish; GET /api/v1/profiles/:slug.

**Entrada específica:** `slug,name,bio,avatarAssetId,categories[{id,name,position}],items[{id,type,label,destination,visible,position}],expectedVersion`.

**Saída específica:** `draft{version,validation},publicProfile{slug,publishedRevisionId,categories,items}; sem campos privados`.

Os contratos efetivos estão reconciliados no início desta spec; a proposta original de endpoints independentes foi substituída por atualização atômica do agregado. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Aba Perfil edita foto, nome, bio, grupos, ordem e botão principal; prévia usa o mesmo renderer público em /p/:slug.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F09-AC01 | nome de perfil único no âmbito definido para a plataforma | F09-T01 | I/PG |
| F09-AC02 | edição restrita ao proprietário | F09-T02 | I/PG |
| F09-AC03 | experiência adequada no celular | F09-T03 | C/E |
| F09-AC04 | prévia da página | F09-T04 | C/E |
| F09-AC05 | links ocultos não aparecem publicamente | F09-T05 | I/PG |
| F09-AC06 | regras de conteúdo e validação de destinos também aplicáveis ao perfil. | F09-T06 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F09; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F09-U01:** Slug normalizado e reservado é recusado.
- **F09-U02:** ordenar preserva todos os IDs uma vez.
- **F09-U03:** oculto não entra na projeção pública.
- **F09-U04:** categoria pessoal não altera Niche.
- **F09-U05:** URL própria não entra no catálogo automaticamente.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F09-I01:** Publicação atômica com versão esperada; duas contas disputam slug => 409 para uma; avatar inválido não fica público; item externo passa validação/moderação sem consumir slot de catálogo indevido.
- **F09-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F09. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F09-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F09-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F09-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Perfil público com categorias próprias”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F09-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F09-E01:** Criar perfil com duas categorias e um link oculto; prévia, publicar, abrir como visitante e verificar ordem/ocultação; editar como outro dono deve falhar.
- **F09-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F09-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/profile.spec.ts`.
- C: `frontend/src/features/profiles/components/profile-view.test.tsx`.
- I: `backend/src/http/profiles.pg.spec.ts`.
- PG: `backend/src/http/profiles.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/profiles.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D10 unicidade de slug por tenant, regras de URL privada no perfil, mídia/limites e conteúdo restrito.

Risco específico: Profile não é Tenant novo; usar projeção pública única para evitar vazar rascunhos.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** permitir que cada divulgador reúna sua presença em uma página compartilhável, no estilo Linktree.

**Escopo inicial:** aba Perfil no painel; foto, nome, descrição, redes sociais e botão principal; grupos e categorias definidos pelo usuário; ordenação e visibilidade de categorias e links; endereço como `seudominio.com/p/nome`.

**Regras:** as categorias pessoais são independentes dos nichos do catálogo. O usuário escolhe quais links ficam apenas no perfil e quais serão submetidos ao catálogo; publicar no perfil não deve aprovar automaticamente a entrada no catálogo.

**Critérios de conclusão:** nome de perfil único no âmbito definido para a plataforma; edição restrita ao proprietário; experiência adequada no celular; prévia da página; links ocultos não aparecem publicamente; regras de conteúdo e validação de destinos também aplicáveis ao perfil.

**Indicadores:** perfis publicados, compartilhamentos, visitas, cliques nos botões e usuários que voltam a editar.

