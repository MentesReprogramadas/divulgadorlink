# F10 Página premium com subdomínio

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 34.

**Estado:** IMPLEMENTADA LOCALMENTE; AC03/TLS REAL E S7 PENDENTES.
**Onda:** 5. **Ordem:** 34.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Página premium com subdomínio”.  
**Plano:** [F10 implementação](../planos/f10-pagina-premium-subdominio.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F11](../specs/f11-planos-perfis.md), [F19](../specs/f19-historico-versoes.md), [F16](../specs/f16-templates.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

oferecer uma página com identidade própria para divulgadores que precisam de uma apresentação mais completa.

Escopo aprovado para detalhamento: endereço como `nome.seudominio.com`; capa, cores, temas e blocos de apresentação, serviços e contato. Domínio próprio pode ser uma evolução posterior.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Usuário premium configura subdomínio e blocos; preview antes de publicar; status de provisionamento e erro claros.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `backend/src/http/tenant.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/lib/upstream.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/middleware.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/domain/crawler-policy.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/styles/tokens.css`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: TENANT_HOST e aliases atuais não suportam wildcard de perfil; evitar colisão com admin/api/www/links; não compartilhar cookies por domínio pai.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

ProfileHost mapeia hostname->tenantId/profileId/estado sem converter cada perfil em tenant; temas por tokens permitidos e blocos tipados; reserva de nomes e histórico de host.

Proposta de migração: avaliar mudanças de schema e adicionar somente campos/tabelas/índices necessários ao contrato acima; validar tenantId, relações, unicidade e transações no PostgreSQL real; dado antigo permanece legível durante rollout. A spec de migração em S2 deve registrar backfill e validação antes de qualquer alteração destrutiva.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: POST/DELETE /api/v1/me/profile/hosts; GET status; resolver público aceita apenas hosts cadastrados; /p/:slug preservado.

**Entrada específica:** `hostname,themeTokens,typedBlocks,expectedVersion`.

**Saída específica:** `host{hostname,status,profileId},capabilities; TLS pendente não equivale a publicado`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Usuário premium configura subdomínio e blocos; preview antes de publicar; status de provisionamento e erro claros.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F10-AC01 | reservar nomes de subdomínio usados pela plataforma | F10-T01 | I/PG |
| F10-AC02 | assegurar que cada endereço exiba apenas a página de seu proprietário | F10-T02 | I/PG |
| F10-AC03 | HTTPS ativo | F10-T03 | I/PG |
| F10-AC04 | publicação e prévia | F10-T04 | C/E |
| F10-AC05 | funcionamento no celular | F10-T05 | C/E |
| F10-AC06 | definição do comportamento em caso de atraso, cancelamento e mudança de nome. | F10-T06 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F10; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F10-U01:** Host normalizado, reservado ou pertencente a outro tenant é recusado.
- **F10-U02:** entitlement ausente impede ativar.
- **F10-U03:** tema inválido não injeta CSS/HTML.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F10-I01:** Resolução real por Host confere perfil/tenant; cookies do painel permanecem host-only; cancelamento segue D12 sem takeover; certificado é gate de staging, não fake local.
- **F10-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F10. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F10-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **F10-PG01:** validar constraints/consulta real descritas na seção Dados; quando não houver migração nova, testar isolamento e consulta sobre modelos existentes, sem migração artificial.

### Componentes

- **F10-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Página premium com subdomínio”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F10-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F10-E01:** Abrir host de perfil A e confirmar que não exibe B; editar no painel central e publicar; cancelar entitlement e conferir fallback aprovado; host desconhecido retorna 404.
- **F10-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F10-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.


**Gate manual adicional:** TLS/DNS real em staging, isolamento de hosts, cookies e comportamento de certificado; localhost não prova certificado público.


## Arquivos de teste propostos

- U: `backend/src/domain/profilehosts/pagina-premium-subdominio.spec.ts`.
- C: `frontend/src/components/domain/pagina-premium-subdominio.test.tsx`.
- I: `backend/src/http/pagina-premium-subdominio.http.spec.ts`.
- PG: `backend/src/http/pagina-premium-subdominio.pg.spec.ts`; registrar no comando/CI de PG.
- E: `frontend/e2e/pagina-premium-subdominio.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D11 DNS/TLS wildcard e origens confiáveis; D12 inadimplência, cancelamento, reserva e redirecionamento de host.

Risco específico: TENANT_HOST e aliases atuais não suportam wildcard de perfil; evitar colisão com admin/api/www/links; não compartilhar cookies por domínio pai.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** oferecer uma página com identidade própria para divulgadores que precisam de uma apresentação mais completa.

**Escopo inicial:** endereço como `nome.seudominio.com`; capa, cores, temas e blocos de apresentação, serviços e contato. Domínio próprio pode ser uma evolução posterior.

**Modelo comercial proposto:** assinatura pelo conjunto de personalização, métricas e recursos de divulgação. O subdomínio integra o pacote; preços, limites e periodicidade de cobrança ainda precisam ser definidos.

**Critérios de conclusão:** reservar nomes de subdomínio usados pela plataforma; assegurar que cada endereço exiba apenas a página de seu proprietário; HTTPS ativo; publicação e prévia; funcionamento no celular; definição do comportamento em caso de atraso, cancelamento e mudança de nome.

**Cancelamento proposto:** manter o perfil básico acessível para preservar os endereços compartilhados, com política explícita para o subdomínio e os recursos premium.

**Indicadores:** conversão para plano pago, uso da personalização, renovação e cancelamentos.



## Execução autorizada — 20/10/2026

[Contrato reconciliado, decisões, ACs, testes e reversão](../execucao-f10.md). O registro de execução prevalece sobre caminhos/contratos apenas propostos neste planejamento. S7 remoto permanece pendente.

F10-M01 obrigatório: certificado/DNS/HTTPS reais em staging não executados. A matriz mantém AC03 parcial; a composição HTTP descartável não é aceite desse gate. [Roteiro operacional](../operacao-f10.md).
