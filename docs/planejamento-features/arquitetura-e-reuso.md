# Arquitetura e reutilização

## Baseline verificado

| Área | Base existente | Regra de evolução |
| --- | --- | --- |
| API | Fastify 5, TypeScript, Zod, controllers por módulo, use cases e repositories | Controller valida e autoriza; regra fica no domínio/use case; persistência atrás do repository. |
| Banco | Prisma 6, PostgreSQL e pgvector; schema em backend/prisma/schema.prisma | Migrações aditivas, índices derivados de consulta e tenantId em novos recursos privados. |
| Assíncrono | BullMQ/Redis em backend/src/worker.ts e adapters/queues | Reusar processo e padrão de jobs, sem cron/worker externo novo por conveniência. |
| Sessão | verify-jwt, cookies, proteção CSRF em backend/src/app.ts; BFF do Next | Não autorizar com cookie de papel ou estado visual; não criar login para perfil público. |
| Tenants | backend/src/http/tenant.ts normaliza host e procura Tenant | Perfil pertence ao tenant; subdomínio mapeia tenant+perfil, não cria tenant por usuário. |
| Autorização | backend/src/http/authorize.ts permite dono/admin no mesmo tenant | F20 adiciona política de recurso com direitos explícitos; preservar contratos antigos. |
| URLs | canonical-url, network-host, url-availability e safe-fetch | Reusar validação, DNS e proteção de redirecionamentos; não criar fetch irrestrito. |
| Analytics | record-event, persist-event e analytics-repository | Semântica atual deduplica por sessão/link/superfície/dia/tipo e usa America/Sao_Paulo; não vender como clique bruto. |
| UI | React 19, Next 15, CSS próprio, tokens e componentes locais | Não há base shadcn/Radix atual a substituir. Não instalar outro design system. |
| QR | qrcode já instalado no frontend | F13 e F32 compartilham o mesmo gerador. |
| Pagamentos | promoção avulsa, Stripe cartão, Woovi Pix, handlers e eventos de pedido | Assinatura de perfil tem ciclo próprio e não deve forçar OrderStatus de promoção. |

## Contratos compartilhados propostos

1. **Elegibilidade pública:** uma projeção de perfil filtra estado publicado, visibilidade, agenda e conteúdo. F09 inicia, F14/F18/F24/F29/F33/F39 consomem. Não espalhar predicados semelhantes em várias telas.
2. **Destinos:** URL canônica validada e revisão aprovada por destino. F07/F12/F23/F28/F37 usam a mesma política; trocar URL revoga comprovação anterior.
3. **Publicação:** draft versionado, snapshot público e conflito otimista. F09 entrega mínimo; F19 adiciona restauração; F15/F16/F25/F39 não editam o público por atalhos.
4. **Capacidades:** servidor deriva permissões comerciais de Subscription/Entitlement. F11 define, F10/F36 consomem. O cliente apenas mostra o resultado.
5. **Permissões:** owner/editor/atendente com escopo aprovado em D22 e D37. Editor de layout não recebe contatos/cobrança automaticamente.
6. **Medição:** manter eventos de catálogo e de perfil distintos onde identidade/semântica diferem; compartilhar funções de dia, contagem e agregação quando corretas. F31 tem profileId/revisionId/blockId reais.
7. **Entrega assíncrona:** intenção durável/outbox, deduplicação por evento de domínio, retry e revalidação antes do efeito; F02/F05/F30 compartilham primitivas. Não prometer e-mail exatamente uma vez.
8. **Mídia:** F09 introduz porta e política de upload apenas após decisão de armazenamento; F13/F16/F32 reusam os ativos aprovados. MIME/extensão do arquivo não bastam para validação.

São contratos propostos, não indicação de arquivos já existentes. Extrair somente a duplicação comprovada na segunda necessidade ou a fronteira necessária desde a primeira. Não construir framework universal de blocos, eventos ou permissões antes de haver casos concretos.

## Design e componentes

Usar `frontend/src/styles/tokens.css`: cores semânticas existentes, navy/turquoise para marca, tipografia Source Sans/Source Serif/Outfit nos papéis atuais, escala de espaçamento e radius de 4px. Conferir uso real no layout antes de escolher o token; não padronizar toda a aplicação à força.

Reutilizar:
- `components/ui/button.tsx`: Button e ButtonLink, variantes existentes.
- `components/ui/input.tsx`: Field, Input, TextArea e Select. Field não está em arquivo field.tsx.
- `components/ui/pagination.tsx`, badges e section-header.
- `components/domain/panel.tsx`: AreaFrame, sessão, navegação e estados de conta.
- `components/domain/link-row.tsx`, link-meta, facet-filters, age-gate e breadcrumb.
- `components/feedback`: loading, empty-state, error-state e retry-state.

Fluxo de desenho por feature: inventariar tela parecida; mapear ação principal; desenhar composição desktop/mobile; definir vazio/loading/erro/sucesso/conflito/permissão; revisar com tokens atuais; só criar componente novo se semântica ou comportamento não couber no existente. Registrar motivo e segundo consumidor real quando houver.

Renderer público, prévia e templates devem consumir o mesmo DTO e componentes de blocos. Editores reusam controles, sem um renderer diferente para cada template. Restrição de conteúdo vale também na prévia que não for autenticada.

Aceitação visual: viewport 390×844 e 1280×720; conferir 320px para overflow; foco visível; labels; mensagens em português; navegação por teclado; contraste adequado dos tokens e temas; ações assíncronas sem envio duplicado; redução de movimento respeitada. Reordenação precisa de alternativa por teclado; não impor biblioteca de drag-and-drop para o MVP.

## Evolução do banco e rollout

Antes de cada migração: inventário de volume, consultas e índices; plano expand/backfill/validate/contract; compatibilidade entre API/worker/Next antigos e novos; referência de backup e recuperação no ambiente apropriado. Não executar migrate reset ou db push em produção. Migrações Prisma não possuem rollback automático garantido: reversão por código/feature flag e migração compensatória previamente revisada, preservando dados.

Flags novas não existem por magia: `ConfigKey` atual tem cinco chaves numéricas. Qualquer flag precisa de parser tipado, default, leitura e testes próprios, ou controle de rollout já validado. Não usar número de configuração como boolean sem contrato.

DNS/TLS, cancelamento, dados pessoais, método de verificação e estatística são gates de decisão específicos, não detalhes a improvisar durante implementação.

## Exceções justificadas

- ProfileRevision: auditoria registra ação, mas não é snapshot restaurável.
- ProfileEvent: AnalyticsEvent exige linkId e não modela blocos/revisões.
- Subscription/Entitlement: recorrência tem ciclo distinto da promoção avulsa.
- Report: denúncia do visitante difere de contestação/moderação do proprietário.
- Porta de geração assistida: embedding e moderação não geram perfil; padrão de porta é reutilizado, capacidade é nova.

Qualquer outra abstração/dependência exige registro de alternativa existente examinada, lacuna concreta, custo e consequência. Refatoração ampla sem relação com o critério de aceitação não integra estes planos.

## F42 primeira integração operacional

Canal Evolution recebe evento de domínio durável e não contém regras de aprovação próprias. Extrair a orquestração composta do controller de moderação para um caso de uso compartilhado com transação, auditoria e intenção de efeitos; decide-case puro sozinho não representa o fluxo completo. Propostas de texto e contestações mantêm dispatch tipado.

F42 introduz primitivas mínimas de outbox e receipt que podem ser reutilizadas por F02, F05 e F30, sem criar framework de bots. A base da Evolution é configuração confiável; credenciais ficam somente no servidor. Integração desabilitada por padrão, autenticação do webhook e vínculo de operador conferidos por ação. O gate de prioridade F42 não cria dependência funcional de WhatsApp em todo o produto.


## F36 — Dono da página e extensões futuras

A conta da agência não substitui tenant nem owner da página; portfólio aponta a páginas F20 autorizadas. Reutilizar editor/prévia e métricas por x-profile-id; não misturar cabeçalho de página com workspace global. Transferências são pessoais e auditadas. FK nova que referencia a identidade composta de Profile com ownerId precisa ser `DEFERRABLE INITIALLY IMMEDIATE`, preservando comportamento normal imediato e permitindo transferência atômica. O guard recusa esquema incompatível (503/rollback). Snapshots continuam imutáveis: exceção controlada muda somente ownerId durante a transferência. Concessão derivada aprovada precisa manter sua prova até revogar a membership vinculada; apagar a prova antes pode transformar acesso em concessão direta. [Decisão e testes](execucao-f36.md).
