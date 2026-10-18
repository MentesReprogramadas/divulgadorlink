# F13 QR Code permanente

**Gate de prioridade:** [F42](../specs/f42-evolution-moderacao.md) deve ser concluída antes desta feature, por prioridade definida em 15 de outubro de 2026. Este gate de sequência não cria dependência funcional de WhatsApp para o produto. Ordem de entrega atual: 13.

**Estado:** S0–S6 validadas localmente; S7 em revisão por CI/liberação remotos pendentes. Contrato reconciliado abaixo.
**Onda:** 3. **Ordem:** 13.  
**Fonte:** [features-propostas.md](../../features-propostas.md), seção “QR Code permanente”.  
**Plano:** [F13 implementação](../planos/f13-qr-permanente.md).  
**Dependências obrigatórias:** G00, [F09](../specs/f09-perfil-publico.md), [F12](../specs/f12-link-permanente.md).  
**Governança:** [arquitetura](../arquitetura-e-reuso.md), [testes](../qualidade-e-testes.md), [decisões](../decisoes.md), [roadmap](../roadmap-auditavel.md).

## Objetivo e fronteira

## Reconciliação executável — 17/10/2026

D15 e alternativas em [execução F13](../execucao-f13.md). A ação fica no endereço publicado de Minha página e no detalhe de Convites; reutiliza GET `/me/profile` e `/me/redirects/:id`, sem endpoint, modelo, migração ou worker novo. Perfil usa o slug publicado, convite usa `/r/:UUID`; nunca destino temporário, draft ou token. QR não modifica dados. Idade/moderação/disponibilidade continuam nas rotas públicas existentes. Sem variante de campanha ou rastreamento novo nesta entrega.

Entrada efetiva: origem validada, `{kind: PROFILE|REDIRECT,path}`, formato PNG/SVG e tamanho 256/512/1024. Padrão PNG/512; preto/branco, margem 4, correção M. `qrcode@1.5.4` existente gera os arquivos. `jsqr@1.4.0` é leitor independente somente de QA, licença Apache-2.0. MIME e pixels do download são conferidos no navegador.

Caminhos reais: `frontend/src/features/permanent-qr/{qr-target,generate-qr,qr-dialog}` e testes adjacentes; E2E `frontend/e2e/permanent-qr.spec.ts`, registrado em features e features-mobile. As sugestões de caminhos e cenários PG abaixo são históricas: autorização/isolamento/ausência de efeitos são exercitados pelas APIs reais sobre PostgreSQL no harness E2E. Não há persistência própria que justifique migration/teste PG artificial.

Foco retorna ao acionador capturado antes da revalidação assíncrona; modal reutiliza OverlayDialog/Select/Field/Button/SkeletonRegion. Erro permite tentar novamente, geração antiga é descartada, downloads têm nome/MIME derivados e objeto temporário revogado. A advertência explica a dependência do endereço e plataforma; trocar o slug exige retirar a página do ar conforme regra já existente.

permitir compartilhar perfis e convites em materiais impressos sem trocar o QR a cada atualização do destino.

Escopo aprovado para detalhamento: gerar e baixar QR para o perfil ou para um link permanente da plataforma.

Não ampliar a entrega para capacidades mencionadas como futuras na fonte. Registrar decisão antes de mudar fronteira. Este planejamento não aprova preço, limite, provedor ou publicação. O texto-fonte integral está no final desta spec para permitir revisão de escopo além dos critérios enumerados.

## Jornada e comportamento observável

Selecionar perfil ou handle, visualizar e baixar; descrever permanência do endereço.

Atores: proprietário autenticado no tenant de origem; visitante apenas em operações públicas expressamente definidas; outro dono do mesmo tenant e dono de outro tenant como controles negativos; admin conforme contrato atual; colaborador somente após F20 e conforme direito específico.

A página precisa tratar carregamento, lista vazia, entrada inválida, sem permissão, conflito de versão quando houver mutação concorrente, falha recuperável e sucesso persistido. Uma ação não deve anunciar sucesso antes da confirmação do servidor. Não criar uma área de login alternativa.

## Reutilização verificada e lacuna concreta

- `frontend/package.json`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/app/painel/links/[id]/destaque/page.tsx`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.
- `frontend/src/domain/tracked-go.ts`: inspecionar e ampliar o contrato relacionado, preservando regressões existentes.

Justificativa de evolução: Não adicionar segundo gerador QR; screenshot do QR não comprova que ele pode ser lido.

Antes de criar arquivo novo, localizar equivalente por responsabilidade e conferir exports/consumidores. Não copiar código para cumprir nome sugerido. Se reaproveitamento não couber, registrar lacuna concreta no ADR da feature e manter a dependência na direção domínio → porta, adapter implementando porta.

## Dados e invariantes

Derivar QR do endereço estável de Profile ou RedirectHandle; sem tabela nova se download puder ser regenerado; variante de campanha exige ID validado.

Proposta de migração: não criar tabela ou migração por conveniência; a feature consome identidades e dados existentes. Se necessidade de persistência surgir, revisar esta spec e seus testes PG antes de implementá-la.

Regra transversal: IDs de outro tenant não podem ser aceitos em relações. Projeções públicas são allowlists; rascunhos, contatos, tokens e dados privados não entram por serialização automática. Dinheiro em centavos e tempo armazenado em UTC; a agregação de analytics existente mantém America/Sao_Paulo. Índices devem ser baseados em consulta real, sem plataforma de dados nova por padrão.

## Contratos propostos

Rotas/operações: GET /api/v1/me/share-targets/:id ou derivação segura no cliente; download PNG/SVG usando qrcode já instalado.

**Entrada específica:** `targetType,targetId,format,size conforme D15`.

**Saída específica:** `arquivo com MIME correto; payload decodificável igual a stableUrl`.

Todos os caminhos são propostas a reconciliar com rotas atuais em S0; não estão implementados. Quando a rota abreviada omite prefixo, o prefixo é /api/v1. PATCH/POST/DELETE com sessão preservam CSRF do app e enviam host pelo BFF; tenant não vem do corpo. GET público não exige autenticação indevida. Exportações, tokens e respostas privadas usam política de cache que impeça exposição.

Erros: aplicar o envelope existente code/message/request_id; 400 para entrada inválida, 401 sem sessão em recurso privado, 403 para contexto de tenant incompatível quando contrato atual exige, 404 para recurso alheio/ausente sem enumerar dados, 409 para conflito de versão/identidade, 429 para limite, 503 para indisponibilidade externa quando apropriado. Rotas existentes podem ter semântica específica; preservar testes de contrato e documentar divergência antes de mudar.

## Interface e design

Compor controles locais e tokens em vez de introduzir biblioteca visual. O renderer público deve ser compartilhado com a prévia sempre que houver renderização de perfil. Nenhum template deve duplicar estrutura inteira de página. Novos textos e ações em português, com nomes acessíveis e foco preservado após erro.

Fluxo a desenhar em S0/S4: Selecionar perfil ou handle, visualizar e baixar; descrever permanência do endereço.

Validar desktop 1280×720, mobile 390×844 e overflow em 320px; teclado e touch; labels e mensagens vinculadas ao campo; carregamento sem salto que esconda ações; estados vazios orientando próximo passo; erros sem apagar entrada válida. Capturar evidência visual na execução futura. Componentes novos só com responsabilidade explícita no plano.

## Critérios de aceitação da fonte

Cada linha preserva uma obrigação da fonte. Se um critério envolve decisão ainda pendente, resolver a decisão em S0 e adicionar valores/exemplos ao teste antes de implementá-lo. Nenhuma linha pode desaparecer por ser difícil de automatizar.

| Critério | Obrigação observável | Caso rastreável | Camada primária |
| --- | --- | --- | --- |
| F13-AC01 | o QR aponta para um endereço estável | F13-T01 | I/PG |
| F13-AC02 | atualização de destino não altera esse endereço | F13-T02 | I/PG |
| F13-AC03 | arquivo legível e testado por leitura | F13-T03 | C/E |
| F13-AC04 | explicar que a permanência depende de manter o endereço da plataforma disponível. | F13-T04 | I/PG |

## Cenários específicos e oráculos

Fixture comum: tenant A/B, dono A/outro dono A/admin A/dono B, IDs determinísticos por F13; T0 = 2026-10-14T12:00:00Z quando houver tempo. Acrescentar dados específicos abaixo sem alterar o seed global de outros testes.

### Unitários de domínio

- **F13-U01:** Conteúdo decodificado equivale à URL estável, nunca ao convite temporário.
- **F13-U02:** tamanho inválido recusado.
- **F13-U03:** formato permitido apenas.

Cada cenário precisa criar a entrada e verificar o resultado descrito; usar relógio/RNG/porta injetável quando necessário. Restaurar mocks ao fim. Não mockar a própria regra que se pretende validar.

### Integração HTTP e persistência

- **F13-I01:** Mudança de destino não muda payload do QR; share-target de outro dono negado; origem usada para montar URL é confiável.
- **F13-I02:** chamar operação privada como outro dono A e dono B; afirmar código de negação e ausência de mutação/retorno de dados de F13. Para leitura pública, afirmar apenas campos elegíveis, sem bloquear o visitante legítimo.
- **F13-I03:** repetir mutação ou evento aplicável e simular falha na fronteira de persistência/provedor; conferir invariantes, não apenas resposta. Se não houver mutação, repetir leitura/geração e comprovar ausência de efeitos.
- **Persistência:** sem suíte PG nova obrigatória para geração pura/PWA; manter integração das dependências que resolvem identidades. Qualquer modelo novo exige revisão desta decisão.

### Componentes

- **F13-C01:** renderizar a composição com dados válidos, vazios e falha; interagir com a ação principal de “QR Code permanente”; comprovar rótulos, resultado e ausência de envio duplicado.
- **F13-C02:** dado sensível/oculto na fixture de controle não pode entrar no texto, atributo ou link público. Se a feature só existe em painel privado, testar ausência de ações sem capacidade/permissão e confirmar que servidor também nega em I02.

### E2E Playwright

- **F13-E01:** Baixar QR, decodificar arquivo em teste e comparar URL; alterar destino e confirmar que QR antigo ainda resolve; verificar leitura real em staging.
- **F13-E02:** abrir a URL/ação privada por contexto sem sessão e por outro dono; checar negação real. Na superfície pública, inspecionar DOM e respostas de rede para ausência dos itens/segredos sentinela de controle.
- **F13-E03:** repetir a jornada principal no mobile; usar teclado para ação relevante; simular falha recuperável no adapter externo/harness ou desligamento de rede apropriado, conferir erro e recuperação sem sucesso falso. Não interceptar API interna para fingir persistência.

### Casos por critério original

Criar um teste com ID Tnn para cada AC, com o seguinte protocolo específico da feature: preparar a fixture descrita nos cenários U/I/E acima; executar a operação da seção Contratos que exercita o critério; afirmar exatamente o estado/valor/comportamento da linha do AC; quando a obrigação for negativa, introduzir o dado proibido na fixture e verificar sua ausência no estado, DTO e DOM aplicáveis. A matriz indica a camada primária; acrescentar PG/worker ou revisão manual quando a natureza exigir. A coluna de resultado permanece NÃO EXECUTADO até haver prova.

**Gate manual adicional:** testar leitura real do QR em dispositivo e revisar arte legível, com tamanho e plataforma registrados. Decodificação automatizada continua obrigatória.



## Arquivos de teste propostos

- U: `frontend/src/domain/qr-permanente.test.ts`.
- C: `frontend/src/components/domain/qr-permanente.test.tsx`.
- I: `frontend/src/domain/qr-permanente.integration.test.ts`.
- PG: não criar automaticamente; justificativa acima.
- E: `frontend/e2e/qr-permanente.spec.ts`; registrar no projeto features e features-mobile antes de executar.
- Consumidores e novos caminhos sugeridos estão no plano; todos devem ser reconciliados com a árvore existente em S0.

## Decisões e condições de liberação

D15 formatos, tamanho e método de decodificação para teste; adicionar dependência só se inexistente e justificada.

Risco específico: Não adicionar segundo gerador QR; screenshot do QR não comprova que ele pode ser lido.

Sem resolução das decisões bloqueantes e dependências concluídas, a feature não avança para implementação. Critério de saída: ACs com evidências, U/C/I/E relevantes verdes, PG/Redis quando exigidos, revisão de design e rollout/rollback aprovados. Seguir Definition of Done comum, sem marcar testes não executados como aprovados.

## Fonte integral da feature

**Objetivo:** permitir compartilhar perfis e convites em materiais impressos sem trocar o QR a cada atualização do destino.

**Escopo inicial:** gerar e baixar QR para o perfil ou para um link permanente da plataforma.

**Critérios de conclusão:** o QR aponta para um endereço estável; atualização de destino não altera esse endereço; arquivo legível e testado por leitura; explicar que a permanência depende de manter o endereço da plataforma disponível.

**Indicadores:** uso dos QR Codes e acessos atribuídos a eles quando houver identificação específica.

