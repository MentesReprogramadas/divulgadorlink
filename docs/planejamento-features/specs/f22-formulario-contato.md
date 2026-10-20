# F22 Formulário de contato na página

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 27.

**Estado:** S0–S6 verificadas localmente em 19/10/2026; S7/CI/liberação em revisão.
**Onda:** 4. **Ordem:** 27.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Formulário de contato na página”.  
**Plano:** [F22 implementação](../planos/f22-formulario-contato.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F20](../specs/f20-equipe-permissoes.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Contrato concretizado em 19/10/2026

Configuração: GET/PUT /api/v1/me/forms, versão esperada; leitura paginada e CSV da página atual em /me/forms/submissions e /export; DELETE por resposta. Público: GET /profiles/:slug/contact-form e POST /submissions, revisão e UUID de idempotência. Campos fixos nome/e-mail/telefone/empresa/mensagem, ao menos um contato obrigatório. Formulário aparece somente em página publicada elegível; prévia não envia. Respostas privadas por 180 dias, exclusão manual, preferência de novidades separada e inicialmente desmarcada. Honeypot, limite por HMAC do contato e teto por formulário. Seção global contacts, sem herança automática de page. Nenhum envio externo.

D24 resolvida por escolha técnica documentada, conforme autorização para decidir sem consultas rotineiras. [Execução, testes, alternativas e limites](../execucao-f22.md). Sem novo commit/push/deploy. O planejamento inicial abaixo é histórico; divergências de nomes/contrato são reconciliadas por esta seção e pelo código/testes referenciados.

## Objetivo e fronteira

transformar visitas ao perfil em pedidos de orçamento, listas de espera ou contatos interessados.

Escopo aprovado para detalhamento: bloco de formulário com campos configuráveis, respostas no painel e exportação; escolha explícita para receber novidades quando aplicável.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Visitante preenche orçamento/lista de espera; confirmação após persistência; dono lê e exporta no painel.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/src/components/ui/input.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/http/errors.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `backend/src/http/authorize.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/components/domain/consent.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Dados pessoais não entram em analytics, logs de payload ou páginas públicas.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

FormDefinition versionado, LeadSubmission privado e registro de preferência de contato separado; campos tipados e allowlist, sem formulário arbitrário com HTML.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos de referência do planejamento inicial

Rotas/operações: GET formulário público por perfil; POST /api/v1/profiles/:slug/forms/:formId/submissions; GET/DELETE/export /me/forms/:id/submissions.

**Entrada específica:** `formVersionId,answers allowlist,marketingOptIn opcional,idempotencyKey`.

**Saída específica:** `submission{id,createdAt,status}; listagem/exportação exclusivamente privadas`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Visitante preenche orçamento/lista de espera; confirmação após persistência; dono lê e exporta no painel.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F22-AC01 | acesso às respostas restrito ao proprietário e colaboradores autorizados | F22-T01 | I/PG |
| F22-AC02 | limitar spam | F22-T02 | I/PG |
| F22-AC03 | indicar sucesso e falha no envio | F22-T03 | C/E |
| F22-AC04 | definir retenção e exclusão | F22-T04 | ADR + I/E |
| F22-AC05 | não tornar os contatos públicos. | F22-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F22; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F22-U01:** Obrigatório vazio recusa.
- **F22-U02:** campo desconhecido recusa.
- **F22-U03:** consentimento para novidades separado do pedido.
- **F22-U04:** nota privada nunca pública.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F22-I01:** Reenvio com mesma chave não duplica; rate limit retorna 429; exportação impede CSV injection; tenant/editor sem permissão não lê contatos; falha não acusa sucesso.
- **F22-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F22. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F22-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F22-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F22-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Formulário de contato na página”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F22-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F22-E01:** Enviar formulário válido e ver confirmação; dono encontra contato; envio inválido mantém valores e indica campo; visitante não acessa listagem privada.
- **F22-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F22-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.





## Arquivos de teste propostos

- U: `backend/src/domain/leads/contact-form.spec.ts`.
- C: `frontend/src/features/contact-forms/contact-form.test.tsx`.
- I: `backend/src/http/contact-forms.pg.spec.ts`.
- PG: `backend/src/http/contact-forms.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/formulario-contato.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D24 retenção, exclusão, campos permitidos, destinatários e opt-in de novidades.

Risco específico: Dados pessoais não entram em analytics, logs de payload ou páginas públicas.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** transformar visitas ao perfil em pedidos de orçamento, listas de espera ou contatos interessados.

**Escopo inicial:** bloco de formulário com campos configuráveis, respostas no painel e exportação; escolha explícita para receber novidades quando aplicável.

**Critérios de conclusão:** acesso às respostas restrito ao proprietário e colaboradores autorizados; limitar spam; indicar sucesso e falha no envio; definir retenção e exclusão; não tornar os contatos públicos.

**Indicadores:** formulários enviados e taxa de envio em relação às visualizações do formulário.



## Delta autorizado de UX — 19/10/2026

[Refinamento executado e validação](../refinamento-f22-f23-f25.md): novos pontos de entrada, configuração integrada, seleção guiada/revisão e prévia reutilizada. Este delta prevalece sobre instruções antigas de navegação. Preserva os ACs e contratos comerciais/de acesso existentes; sem backend ou migração novos. Provas históricas permanecem nos JSONs originais; o refinamento tem evidência própria. S7 remoto continua pendente.

Complemento final de apresentação: formulário público centralizado e integrado ao tema (campos, fonte, cantos, botão e checkbox); rótulo Quero receber novidades e retirada do parágrafo de retenção dessa área. Aceite opcional continua desmarcado. Validação local antecipa erros sem substituir o servidor; formulário salvo também aparece na prévia lateral via /preview/items, com configuração ao vivo e restauração ao cancelar. Evidências consolidadas no refinamento vinculado.
