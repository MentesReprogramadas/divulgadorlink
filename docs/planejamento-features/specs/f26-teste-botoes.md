# F26 Teste de versões de botões

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 39.

**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.  
**Onda:** 6. **Ordem:** 39.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Teste de versões de botões”.  
**Plano:** [F26 implementação](../planos/f26-teste-botoes.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F31](../specs/f31-interacao-pagina.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

comparar títulos ou apresentações de botões com base na interação dos visitantes.

Escopo aprovado para detalhamento: duas variantes, distribuição estável por visitante e relatório de impressões e cliques por versão.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Definir versões e objetivo, iniciar experimento, acompanhar resultado ou inconclusivo e aplicar variante manualmente.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/use-cases/@Analytics/record-event.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/impression.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/consent.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não fabricar significância estatística nem escolher vencedor automaticamente por volume; depende de tráfego real suficiente.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Experiment e Variant com atribuição estável autorizada, exposureId e agregados por variante/versão; plano estatístico e encerramento pré-definidos.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: CRUD /api/v1/me/profile/experiments; POST start/stop; GET report; eventos validados de exposição/clique.

**Entrada específica:** `variants[{id,label}],objective,approvedStatisticalPlan; start/stop`.

**Saída específica:** `assignment{experimentId,variantId,version},report{exposures,clicks,status,method}`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Definir versões e objetivo, iniciar experimento, acompanhar resultado ou inconclusivo e aplicar variante manualmente.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F26-AC01 | usar o mesmo objetivo e período de comparação | F26-T01 | I/PG |
| F26-AC02 | não trocar a variante a cada carregamento da mesma visita | F26-T02 | I/PG |
| F26-AC03 | definir amostra e regra de encerramento | F26-T03 | ADR + I/E |
| F26-AC04 | indicar resultado inconclusivo quando houver pouca evidência | F26-T04 | C/E |
| F26-AC05 | não escolher vencedor apenas pelo maior total bruto de cliques. | F26-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F26; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F26-U01:** Identificador estável produz mesma variante.
- **F26-U02:** 10/100 versus 12/100 é inconclusivo segundo regra aprovada.
- **F26-U03:** sem exposição não atribuir clique.
- **F26-U04:** CTR não usa total bruto.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F26-I01:** Visitante não recebe variantes de outro experimento; eventos duplicados deduplicam; alterar versão encerra/reinicia conforme regra; excluir consentimento não cria rastreio indevido.
- **F26-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F26. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F26-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F26-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F26-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Teste de versões de botões”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F26-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F26-E01:** Dois contextos de variante conhecida, recarregar mantém botão; clicar e conferir relatório por variante; baixa amostra exibe inconclusivo; aplicar vencedor exige ação.
- **F26-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F26-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/experiments/teste-botoes.spec.ts`.
- C: `frontend/src/components/domain/teste-botoes.test.tsx`.
- I: `backend/src/http/teste-botoes.http.spec.ts`.
- PG: `backend/src/http/teste-botoes.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/teste-botoes.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D28 objetivo, amostra, efeito mínimo, confiança, horizonte e consentimento.

Risco específico: Não fabricar significância estatística nem escolher vencedor automaticamente por volume; depende de tráfego real suficiente.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** comparar títulos ou apresentações de botões com base na interação dos visitantes.

**Escopo inicial:** duas variantes, distribuição estável por visitante e relatório de impressões e cliques por versão.

**Critérios de conclusão:** usar o mesmo objetivo e período de comparação; não trocar a variante a cada carregamento da mesma visita; definir amostra e regra de encerramento; indicar resultado inconclusivo quando houver pouca evidência; não escolher vencedor apenas pelo maior total bruto de cliques.

**Indicadores:** testes concluídos com amostra suficiente e mudanças adotadas pelos divulgadores.

