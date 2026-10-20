# F20 Equipe e permissões

> Atualização autorizada em 19/10/2026: o [refinamento de escopo e UX](../refinamento-f05-f15-f20-f21-f38.md) prevalece sobre as fronteiras anteriores em caso de divergência. Inclui importação de JSON, consentimento no modal, navegação por contexto, prévia de campanha, equipe global e apresentação para parceiros. Estado da ampliação: implementada e validada localmente; S7/CI/liberação remotas continuam em revisão.


**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 25.

**Estado:** S0–S6 VALIDADAS LOCALMENTE; S7/CI/liberação EM REVISÃO.
**Onda:** 4. **Ordem:** 25.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Equipe e permissões”.  
**Plano:** [F20 implementação](../planos/f20-equipe-permissoes.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

permitir que colaboradores mantenham páginas e links.

Escopo vigente: equipe global da conta, convites e permissões granulares por seção, leitura/escrita e revogação. Cobrança pode ser delegada explicitamente; senha, identificadores, suporte por impersonação e concessão de acessos ficam com o proprietário. Áreas administrativas só podem ser delegadas por ADMIN e não alteram o cargo global do colaborador.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Dono convida colaborador, seleciona direitos; colaborador atua apenas nos recursos concedidos; dono altera ou revoga. Convites anteriores de página conservam suas restrições, inclusive cobrança.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/http/authorize.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/http/middlewares/verify-jwt.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/repositories/audit-logs-repository.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/panel.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Evitar aumentar poderes de authorize para todos os recursos legados; centralizar política com testes de regressão.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

ProfileMembership e Invitation com escopo de recurso, papel e token hash expirável; autorização atual dono/admin não basta e deve ser ampliada por política específica, não mudar ADMIN global.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Contrato vigente da ampliação: GET /api/v1/team; GET /team/workspaces; GET /team/context; POST /team/select; POST /team/invitations; POST /team/accept; PATCH/DELETE /team/members/:id; DELETE /team/invitations/:id. Prefixo /api/v1 em todas. Convites e memberships anteriores de página mantêm suas rotas e restrições.

**Entrada específica global:** convite `{email,grants,requestKey}`; aceite `{token}`; seleção `{ownerId|null}`; alteração `{grants,expectedVersion}`; revogação `{expectedVersion}`. Grants aceitam somente chaves registradas e pares leitura/escrita válidos.

**Saída específica global:** convite com ID/prazo e token somente na criação; membership com proprietário, versão e grants; listagem sem token. Fontes de campanha usam /me/profile/campaign-sources e /:id, sem exigir acesso ao histórico completo.

O contrato global acima foi implementado nesta ampliação; propostas anteriores de página permanecem como histórico, com a execução registrada no refinamento. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Dono convida colaborador, seleciona direitos; colaborador atua apenas nos recursos concedidos; dono altera ou revoga. Convites anteriores de página conservam suas restrições, inclusive cobrança.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F20-AC01 | autorização aplicada a cada ação | F20-T01 | I/PG |
| F20-AC02 | convites com prazo definido | F20-T02 | I/PG |
| F20-AC03 | registro de alterações | F20-T03 | I/PG |
| F20-AC04 | revogação efetiva | F20-T04 | I/PG |
| F20-AC05 | colaboradores acessam somente os recursos e operações concedidos no espaço da conta; compartilhamentos anteriores de página continuam limitados ao perfil autorizado. | F20-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F20; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F20-U01:** Editor não altera billing/titularidade.
- **F20-U02:** convite expirado/usado recusado.
- **F20-U03:** token bruto não persistido.
- **F20-U04:** revogado perde leitura privada e edição.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F20-I01:** Aceites concorrentes geram uma membership; revogação confere no servidor inclusive com sessão antiga; auditoria registra ator e recurso.
- **F20-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F20. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F20-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F20-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F20-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Equipe e permissões”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F20-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F20-E01:** Duas sessões: dono convida, editor aceita e edita; editor acessa cobrança por URL e é negado; dono revoga e editor com tela aberta não salva.
- **F20-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F20-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/access/equipe-permissoes.spec.ts`.
- C: `frontend/src/components/domain/equipe-permissoes.test.tsx`.
- I: `backend/src/http/equipe-permissoes.http.spec.ts`.
- PG: `backend/src/http/equipe-permissoes.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/equipe-permissoes.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D22 matriz owner/editor/leitor, prazo de convite e transferência de dono.

Risco específico: Evitar aumentar poderes de authorize para todos os recursos legados; centralizar política com testes de regressão.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** permitir que colaboradores mantenham páginas e links.

**Escopo inicial:** convite de colaboradores, permissão de edição e revogação de acesso; cobrança e configurações da conta restritas ao proprietário.

**Critérios de conclusão:** autorização aplicada a cada ação; convites com prazo definido; registro de alterações; revogação efetiva; colaboradores acessam somente os perfis autorizados.

**Indicadores:** perfis com colaboradores e frequência de colaboração.



## Execução reconciliada — 19/10/2026

D22: papéis por recurso, convite de sete dias, revogação incluindo convites antigos; sem transferência de dono. Reuso do editor/renderer, scopes e limites F12 descritos na execução.

Caminhos, decisões, alternativas, migrações, retenção, testes e divergências do planejamento proposto estão no [registro de execução](../execucao-f20.md). Este fechamento substitui a condição histórica de somente planejamento. Não marcar os nomes propostos ou passos remotos como executados sem prova. Todos os ACs têm oráculos locais aprovados na matriz; CI/liberação continuam pendentes.
