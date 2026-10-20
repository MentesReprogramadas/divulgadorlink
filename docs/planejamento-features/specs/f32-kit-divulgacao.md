# F32 Kit de divulgação

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 32.

**Estado:** IMPLEMENTADA E VALIDADA LOCALMENTE; S7 EM REVISÃO.
**Onda:** 4. **Ordem:** 32.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “Kit de divulgação”.  
**Plano:** [F32 implementação](../planos/f32-kit-divulgacao.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F13](../specs/f13-qr-permanente.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

ajudar o usuário a divulgar o perfil depois da publicação.

Escopo aprovado para detalhamento: gerar imagens para posts e stories com nome, descrição, endereço e QR Code do perfil, usando modelos editáveis.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Escolher post/story, revisar composição e baixar arte com QR/endereço.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/src/app/divulgar/opengraph-image.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/styles/tokens.css`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/domain/tracked-go.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Reaproveitar render OG e qrcode antes de adicionar canvas/headless externo; conteúdo precisa de QA visual.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

ShareKitPreset com dimensões e campos permitidos; gerar da projeção publicada ou prévia explicitamente selecionada; QR vem de F13.

Proposta de migração: não criar tabela ou migração por conveniência; a feature consome identidades e dados existentes. Se necessidade de persistência surgir, revisar esta spec e seus testes PG antes de implementá-la.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: POST /api/v1/me/profile/share-kit/preview; download autenticado ou renderização no cliente conforme avaliação de custo, sem biblioteca nova por padrão.

**Entrada específica:** `presetId,publicProfileRevisionId,targetHandleId opcional,explicitDraftPreview:boolean`.

**Saída específica:** `preview/download com dimensions,mime e arte; QR de endereço estável`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Escolher post/story, revisar composição e baixar arte com QR/endereço.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F32-AC01 | prévia antes de baixar | F32-T01 | C/E |
| F32-AC02 | textos legíveis nos formatos oferecidos | F32-T02 | C/E |
| F32-AC03 | QR Code com leitura verificada | F32-T03 | I/PG |
| F32-AC04 | respeitar identidade visual e visibilidade dos dados | F32-T04 | I/PG |
| F32-AC05 | não gerar material público a partir de rascunhos sem ação explícita. | F32-T05 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F32; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F32-U01:** Texto longo tem limite/quebra sem corte.
- **F32-U02:** payload QR usa URL estável.
- **F32-U03:** dados ocultos/draft não entram por padrão.
- **F32-U04:** parâmetros não permitem buscar imagem arbitrária.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F32-I01:** Render de mídia referencia apenas ativos autorizados; falha informa erro sem arquivo corrompido; isolamento de origem da arte.
- **F32-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F32. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F32-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **Persistência:** sem suíte PG nova obrigatória para geração pura/PWA; manter integração das dependências que resolvem identidades. Qualquer modelo novo exige revisão desta decisão.

### Componentes

- **F32-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “Kit de divulgação”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F32-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F32-E01:** Gerar duas dimensões, baixar e conferir tamanho e texto visual; decodificar QR; draft com contato privado não aparece na arte pública.
- **F32-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F32-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.

**Gate manual adicional:** testar leitura real do QR em dispositivo e revisar arte legível, com tamanho e plataforma registrados. Decodificação automatizada continua obrigatória.



## Arquivos de teste propostos

- U: `frontend/src/domain/kit-divulgacao.test.ts`.
- C: `frontend/src/components/domain/kit-divulgacao.test.tsx`.
- I: `frontend/src/domain/kit-divulgacao.integration.test.ts`.
- PG: não criar automaticamente; justificativa acima.
- E: `frontend/e2e/kit-divulgacao.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D34 formatos, dimensões, fontes, limite de texto e mecanismo de render suportado.

Risco específico: Reaproveitar render OG e qrcode antes de adicionar canvas/headless externo; conteúdo precisa de QA visual.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** ajudar o usuário a divulgar o perfil depois da publicação.

**Escopo inicial:** gerar imagens para posts e stories com nome, descrição, endereço e QR Code do perfil, usando modelos editáveis.

**Critérios de conclusão:** prévia antes de baixar; textos legíveis nos formatos oferecidos; QR Code com leitura verificada; respeitar identidade visual e visibilidade dos dados; não gerar material público a partir de rascunhos sem ação explícita.

**Indicadores:** kits gerados, downloads e visitas atribuídas aos materiais quando houver identificação de origem.



## Execução autorizada — 20/10/2026

[Contrato reconciliado, decisões, ACs, testes e reversão](../execucao-f32.md). O registro de execução prevalece sobre caminhos/contratos apenas propostos neste planejamento. S7 remoto permanece pendente.
