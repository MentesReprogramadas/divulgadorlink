# F38 Exportação do perfil

> Atualização autorizada em 19/10/2026: o [refinamento de escopo e UX](../refinamento-f05-f15-f20-f21-f38.md) prevalece sobre as fronteiras anteriores em caso de divergência. Inclui importação de JSON, consentimento no modal, navegação por contexto, prévia de campanha, equipe global e apresentação para parceiros. Estado da ampliação: implementada e validada localmente; S7/CI/liberação remotas continuam em revisão.


**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 22.

**Estado:** IMPLEMENTADA E VALIDADA LOCALMENTE (S0–S6); S7 em revisão.
**Onda:** 3. **Ordem:** 22.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Exportação do perfil”.  
**Plano:** [F38 implementação](../planos/f38-exportacao-perfil.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F19](../specs/f19-historico-versoes.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

dar ao proprietário uma cópia reutilizável de seus links, categorias e configurações.

Escopo vigente: baixar JSON v1 e importar esse formato mediante conferência e confirmação, substituindo somente o rascunho. Endereço atual e publicação são preservados; foto e vínculos internos de convites não são restaurados.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Dono escolhe uma versão para exportar, ou seleciona um JSON v1, confere grupos/links e confirma a importação no rascunho; publicação segue validações e moderação existentes.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/http/authorize.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/repositories/audit-logs-repository.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/lib/api.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não exportar notas/contatos junto do perfil sem escopo próprio de F22/F35.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

DTO de exportação por allowlist com schemaVersion, exportedAt, categorias/ordem/itens/tokens; manifest de mídia e itens não incluídos; nunca dump de banco.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/me/profile/export?revision=draft|published com attachment e no-store.

**Entrada específica:** `revision=draft|published; profile escopado pela sessão`.

**Saída específica:** `attachment JSON{schemaVersion,exportedAt,profile,categories,items,assetsManifest,omissions}`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Dono escolhe uma versão para exportar, ou seleciona um JSON v1, confere grupos/links e confirma a importação no rascunho; publicação segue validações e moderação existentes.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F38-AC01 | exportação restrita ao proprietário ou papel autorizado | F38-T01 | I/PG |
| F38-AC02 | incluir a organização dos links | F38-T02 | I/PG |
| F38-AC03 | excluir senhas, tokens e segredos de integração | F38-T03 | I/PG |
| F38-AC04 | indicar quais arquivos ou recursos externos não estão incluídos | F38-T04 | C/E |
| F38-AC05 | distinguir exportação de restauração automática, que exige fluxo próprio. | F38-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F38; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F38-U01:** Serialização preserva ordem/Unicode.
- **F38-U02:** tokens de integração/ACL/billing omitidos.
- **F38-U03:** formato versionado.
- **F38-U04:** exportação não promete restauração automática.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F38-I01:** IDOR e membro sem direito a exportar negados; URL de mídia não recebe credenciais; resposta não cacheada publicamente.
- **F38-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F38. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F38-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F38-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F38-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Exportação do perfil”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F38-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F38-E01:** Baixar JSON como dono, parsear e comparar categorias/itens; procurar segredos sentinela e exigir ausência; visitante e editor sem permissão falham.
- **F38-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F38-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/profiles/exportacao-perfil.spec.ts`.
- C: `frontend/src/components/domain/exportacao-perfil.test.tsx`.
- I: `backend/src/http/exportacao-perfil.http.spec.ts`.
- PG: `backend/src/http/exportacao-perfil.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/exportacao-perfil.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D40 campos exportáveis, acesso de colaboradores e política de mídia.

Risco específico: Não exportar notas/contatos junto do perfil sem escopo próprio de F22/F35.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** dar ao proprietário uma cópia reutilizável de seus links, categorias e configurações.

**Escopo inicial:** baixar uma exportação estruturada com os dados do perfil e identificação da versão do formato.

**Critérios de conclusão:** exportação restrita ao proprietário ou papel autorizado; incluir a organização dos links; excluir senhas, tokens e segredos de integração; indicar quais arquivos ou recursos externos não estão incluídos; distinguir exportação de restauração automática, que exige fluxo próprio.

**Indicadores:** exportações concluídas e falhas de geração.


## Contrato reconciliado em 19/10/2026

Ver [execução F38](../execucao-f38.md) para D40, arquivos reais, resultados e limitações. Os nomes de arquivo propostos acima são históricos; implementação usa domain/profiles/profile-export.ts, profiles-repository.ts, @Profiles/routes.ts e features/profiles/profile-export-screen.tsx. Testes reais profile-export.spec.ts (U), profile-export.pg.spec.ts (I/PG), profile-export-screen.test.tsx e BFF route.test.ts (C/contrato), e2e/profile-export.spec.ts (E). Não há importação/restauração automática, middleware de permissão global nem nova migração.
