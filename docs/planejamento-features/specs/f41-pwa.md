# F41 App instalável

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 42.

**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.  
**Onda:** 6. **Ordem:** 42.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “App instalável”.  
**Plano:** [F41 implementação](../planos/f41-pwa.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

facilitar o retorno de quem administra páginas e links frequentemente.

Escopo aprovado para detalhamento: tornar o sistema instalável como PWA, com ícone, nome e abertura do painel em janela própria quando o dispositivo e o navegador permitirem; orientação para instalação.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Instalação orientada quando suportada; painel funciona no navegador; offline informa indisponibilidade sem confirmar salvamento.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/src/app/layout.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/middleware.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/consent.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Chromium headless não comprova instalação em iOS/Android; gate manual documentado; push e edição offline fora.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Manifest e service worker somente se necessário ao escopo; cache allowlist de assets públicos versionados; zero respostas autenticadas em cache compartilhado; sem edição offline.

Proposta de migração: não criar tabela ou migração por conveniência; a feature consome identidades e dados existentes. Se necessidade de persistência surgir, revisar esta spec e seus testes PG antes de implementá-la.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /manifest.webmanifest, assets e service worker propostos; nenhuma API nova necessária se capacidade couber no frontend.

**Entrada específica:** `manifest e assets públicos; nenhuma mutação offline`.

**Saída específica:** `manifest{name,icons,start_url,scope,display}; resposta offline explícita sem sucesso de gravação`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Instalação orientada quando suportada; painel funciona no navegador; offline informa indisponibilidade sem confirmar salvamento.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F41-AC01 | verificar instalação e atualização nos ambientes escolhidos | F41-T01 | U/C/E + M |
| F41-AC02 | manter o uso normal pelo navegador | F41-T02 | U/C/E + M |
| F41-AC03 | informar quando não houver conexão | F41-T03 | U/C/E + M |
| F41-AC04 | não indicar que uma edição foi salva sem confirmação | F41-T04 | U/C/E + M |
| F41-AC05 | evitar armazenamento de respostas privadas em caches compartilhados. | F41-T05 | U/C/E + M |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F41; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F41-U01:** Manifest válido e start_url seguro.
- **F41-U02:** erro de rede não gera salvo.
- **F41-U03:** cache não contém /bff, /api, /painel, contatos ou cookies.
- **F41-U04:** atualização não apaga draft remoto.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F41-I01:** Service worker respeita CSP e não intercepta gateway; logout limpa estado privado pertinente; build antigo atualiza sem loop; autenticação continua correta.
- **F41-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F41. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F41-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **Persistência:** sem suíte PG nova obrigatória para geração pura/PWA; manter integração das dependências que resolvem identidades. Qualquer modelo novo exige revisão desta decisão.

### Componentes

- **F41-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “App instalável”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F41-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F41-E01:** Em contexto isolado, registrar worker e conferir manifest/cache; simular offline e tentativa de salvar sem sucesso falso; login/logout com reload; instalação real manual por plataforma.
- **F41-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F41-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.



**Gate manual adicional:** instalação e atualização em cada plataforma aprovada em D43; Chromium headless não prova instalação iOS/Android.

## Arquivos de teste propostos

- U: `frontend/src/domain/pwa.test.ts`.
- C: `frontend/src/components/domain/pwa.test.tsx`.
- I: `frontend/e2e/pwa.spec.ts`.
- PG: não criar automaticamente; justificativa acima.
- E: `frontend/e2e/pwa.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D43 navegadores/dispositivos suportados, cache e política de atualização.

Risco específico: Chromium headless não comprova instalação em iOS/Android; gate manual documentado; push e edição offline fora.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** facilitar o retorno de quem administra páginas e links frequentemente.

**Escopo inicial:** tornar o sistema instalável como PWA, com ícone, nome e abertura do painel em janela própria quando o dispositivo e o navegador permitirem; orientação para instalação.

**Critérios de conclusão:** verificar instalação e atualização nos ambientes escolhidos; manter o uso normal pelo navegador; informar quando não houver conexão; não indicar que uma edição foi salva sem confirmação; evitar armazenamento de respostas privadas em caches compartilhados.

**Limite inicial:** instalação e experiência variam por navegador e dispositivo. Edição offline e notificações push exigem decisões e escopo próprios.

**Indicadores:** instalações quando mensuráveis, retorno ao painel e frequência de uso.

