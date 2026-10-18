# F34 Checklist de publicação

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 20.

**Estado:** S0–S6 verificadas localmente em 18/10/2026; S7 em revisão.  
**Onda:** 3. **Ordem:** 20.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Checklist de publicação”.  
**Plano:** [F34 implementação](../planos/f34-checklist-publicacao.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

orientar a criação de uma página pronta para compartilhar.

Escopo aprovado para detalhamento: passos para completar apresentação, revisar destinos, conferir a prévia no celular e compartilhar o perfil; indicação do progresso e ações diretas para cada etapa.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Mostrar passos com ação direta, distinguir obrigatório/opcional e retomar progresso.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/src/components/domain/panel.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/domain/panel-gate.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/ui/button.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não criar regras de publicação duplicadas no frontend e backend.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Checklist derivado do draft/perfil publicado e histórico de ações; persistir somente marcos não deriváveis, sem segunda verdade para canPublish.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/me/profile/checklist; ação de compartilhamento registra intenção quando mensurável; publicar usa validador F09.

**Entrada específica:** `nenhum estado de conclusão arbitrário; ações derivadas de dados do perfil`.

**Saída específica:** `steps[{id,required,state,actionPath}],canPublish,reasons,profileVersion`.

Caminhos reconciliados na execução: GET /api/v1/me/profile/checklist e POST /api/v1/me/profile/checklist/actions; publicação mantém a operação F09. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Mostrar passos com ação direta, distinguir obrigatório/opcional e retomar progresso.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F34-AC01 | distinguir etapas obrigatórias de sugestões | F34-T01 | I/PG |
| F34-AC02 | atualizar o progresso após edições | F34-T02 | I/PG |
| F34-AC03 | permitir retomar o processo | F34-T03 | I/PG |
| F34-AC04 | não exigir campos opcionais para publicar | F34-T04 | I/PG |
| F34-AC05 | não apresentar uma prévia como teste real em todos os dispositivos. | F34-T05 | C/E |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F34; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F34-U01:** Avatar opcional vazio não bloqueia.
- **F34-U02:** URL inválida bloqueia pela mesma regra de publicação.
- **F34-U03:** editar para inválido atualiza checklist.
- **F34-U04:** ver preview não prova teste em dispositivo real.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F34-I01:** Estado derivado reflete alterações salvas; manipular checklist no cliente não contorna publish; sessão banida mantém bloqueio existente.
- **F34-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F34. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F34-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F34-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F34-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Checklist de publicação”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F34-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F34-E01:** Criar perfil sem foto, concluir obrigatórios e publicar; editar URL inválida e ver passo pendente; recarregar conserva progresso real.
- **F34-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F34-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/profile-checklist.spec.ts`.
- C: `frontend/src/features/profile-checklist/checklist-screen.test.tsx`.
- I: `backend/src/http/profile-checklist.pg.spec.ts`.
- PG: `backend/src/http/profile-checklist.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/profile-checklist.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D36 passos iniciais e eventos de intenção versus compartilhamento confirmado.

Risco específico: Não criar regras de publicação duplicadas no frontend e backend.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** orientar a criação de uma página pronta para compartilhar.

**Escopo inicial:** passos para completar apresentação, revisar destinos, conferir a prévia no celular e compartilhar o perfil; indicação do progresso e ações diretas para cada etapa.

**Critérios de conclusão:** distinguir etapas obrigatórias de sugestões; atualizar o progresso após edições; permitir retomar o processo; não exigir campos opcionais para publicar; não apresentar uma prévia como teste real em todos os dispositivos.

**Indicadores:** conclusão do checklist, primeira publicação e primeira ação de compartilhamento.


Registro vinculante de escolhas, testes e limites: [execução F34](../execucao-f34.md). D36 resolvida; não há nova migration/fila nem nova aprovação de publicação.
