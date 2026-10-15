# F36 Pacotes para agências

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 40.

**Estado:** SPEC PROPOSTA; implementação NÃO INICIADA.  
**Onda:** 6. **Ordem:** 40.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Pacotes para agências”.  
**Plano:** [F36 implementação](../planos/f36-agencias.md).  
**Dependências obrigatórias:** G00, [F20](../specs/f20-equipe-permissoes.md), [F11](../specs/f11-planos-perfis.md), [F21](../specs/f21-midia-kit.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

atender profissionais que gerenciam páginas de vários clientes.

Escopo aprovado para detalhamento: conta com vários perfis de clientes, identidade visual e relatórios separados; atribuição de colaboradores por cliente. Evolução do recurso de equipe e permissões.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Agência alterna clientes e vê página/relatório isolado; atribui equipe por cliente e solicita transferência.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/http/authorize.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/repositories/audit-logs-repository.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/panel.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: A autorização atual considera ownerId único; evolução deve conservar regras do catálogo e impedir confundir agência com tenant.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

AgencyWorkspace e ClientMembership dentro do tenant existente; capacidade multiperfil; cliente não vira tenant só para seleção; transferência de Profile com validação explícita e trilha.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: CRUD /api/v1/me/agency/clients; selecionar contexto; POST /agency/profiles/:id/transfer com confirmação de titulares.

**Entrada específica:** `clientName,profileIds,memberGrants; transfer{targetOwnerId,expectedVersion,acceptance}`.

**Saída específica:** `workspace,clients,scopedCapabilities,transfer{state}; sem cópia implícita de cobrança`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Agência alterna clientes e vê página/relatório isolado; atribui equipe por cliente e solicita transferência.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F36-AC01 | isolamento de dados e permissões entre clientes | F36-T01 | I/PG |
| F36-AC02 | identificação clara da página em edição | F36-T02 | I/PG |
| F36-AC03 | definição de limites e cobrança | F36-T03 | I/PG |
| F36-AC04 | procedimento de transferência de titularidade | F36-T04 | ADR + I/E |
| F36-AC05 | relatórios sem mistura de resultados. | F36-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F36; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F36-U01:** Membro cliente A não lê B.
- **F36-U02:** trocar cliente não usa cache anterior.
- **F36-U03:** limite contratado recusa nova página sem apagar existentes.
- **F36-U04:** transferência não move assinatura tacitamente.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F36-I01:** Transferência concorrente com edição é controlada por versão; dono novo e ACL atualizados atomicamente; links e relatórios mantêm tenant original.
- **F36-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F36. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F36-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F36-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F36-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Pacotes para agências”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F36-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F36-E01:** Criar clientes A/B, editar perfil A e alternar para B; conferir ausência dos dados A; membro A tenta URL B e é negado; transferir com aceites previstos.
- **F36-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F36-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/organizations/agencias.spec.ts`.
- C: `frontend/src/components/domain/agencias.test.tsx`.
- I: `backend/src/http/agencias.http.spec.ts`.
- PG: `backend/src/http/agencias.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/agencias.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D38 limites/preços, vínculo de cobrança, consentimento e procedimento de transferência.

Risco específico: A autorização atual considera ownerId único; evolução deve conservar regras do catálogo e impedir confundir agência com tenant.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** atender profissionais que gerenciam páginas de vários clientes.

**Escopo inicial:** conta com vários perfis de clientes, identidade visual e relatórios separados; atribuição de colaboradores por cliente. Evolução do recurso de equipe e permissões.

**Critérios de conclusão:** isolamento de dados e permissões entre clientes; identificação clara da página em edição; definição de limites e cobrança; procedimento de transferência de titularidade; relatórios sem mistura de resultados.

**Indicadores:** contas com vários clientes, páginas gerenciadas por conta e renovação dos pacotes.

