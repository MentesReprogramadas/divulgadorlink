# F40 Diagnóstico da página

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 41.

**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.  
**Onda:** 6. **Ordem:** 41.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Diagnóstico da página”.  
**Plano:** [F40 implementação](../planos/f40-diagnostico.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F07](../specs/f07-disponibilidade.md), [F31](../specs/f31-interacao-pagina.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

oferecer sugestões práticas de melhoria a partir da configuração e do uso do perfil.

Escopo aprovado para detalhamento: apontar títulos repetidos, destinos com problemas, excesso de itens e botões com pouca interação; sugerir ações sem aplicá-las automaticamente.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Dono vê sugestão com motivo, dados e ação; pode ignorar sem alterar página automaticamente.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/domain/links/url-availability.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/repositories/analytics-repository.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/feedback/empty-state.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não unir métricas antigas/novas sem mesma definição e cobertura.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

DiagnosticFinding derivável com ruleVersion, código, evidência, período e dismissal; regras determinísticas antes de IA.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/me/profile/diagnostics?from&to; POST findings/:key/dismiss.

**Entrada específica:** `from,to,revisionId; dismiss{findingKey,ruleVersion}`.

**Saída específica:** `findings[{code,reason,evidence,period,ruleVersion,actionPath}],coverage`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Dono vê sugestão com motivo, dados e ação; pode ignorar sem alterar página automaticamente.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F40-AC01 | explicar a razão de cada sugestão | F40-T01 | I/PG |
| F40-AC02 | considerar período, impressões e posição do botão | F40-T02 | I/PG |
| F40-AC03 | diferenciar falta de dados de baixo desempenho | F40-T03 | I/PG |
| F40-AC04 | permitir ignorar sugestões | F40-T04 | I/PG |
| F40-AC05 | não prometer crescimento nem atribuir causalidade a correlações. | F40-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F40; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F40-U01:** Botão com zero impressões => dados insuficientes, não baixo desempenho.
- **F40-U02:** títulos equivalentes geram um aviso.
- **F40-U03:** limiar considera exposição/posição.
- **F40-U04:** regra não promete causalidade.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F40-I01:** Descartar usa chave estável por regra/versão; período e elegibilidade limitam consulta; nenhum dado pessoal dos visitantes retorna.
- **F40-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F40. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F40-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F40-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F40-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Diagnóstico da página”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F40-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F40-E01:** Perfil com títulos repetidos e botão sem amostra: ver aviso de repetição e amostra insuficiente; ignorar e recarregar; nenhuma alteração pública automática.
- **F40-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F40-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/insights/diagnostico.spec.ts`.
- C: `frontend/src/components/domain/diagnostico.test.tsx`.
- I: `backend/src/http/diagnostico.http.spec.ts`.
- PG: `backend/src/http/diagnostico.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/diagnostico.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D42 limiares, catálogo de regras, janela e validade de descarte.

Risco específico: Não unir métricas antigas/novas sem mesma definição e cobertura.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** oferecer sugestões práticas de melhoria a partir da configuração e do uso do perfil.

**Escopo inicial:** apontar títulos repetidos, destinos com problemas, excesso de itens e botões com pouca interação; sugerir ações sem aplicá-las automaticamente.

**Critérios de conclusão:** explicar a razão de cada sugestão; considerar período, impressões e posição do botão; diferenciar falta de dados de baixo desempenho; permitir ignorar sugestões; não prometer crescimento nem atribuir causalidade a correlações.

**Indicadores:** sugestões consultadas, ações adotadas e evolução posterior das métricas, sem atribuição automática de causa.

