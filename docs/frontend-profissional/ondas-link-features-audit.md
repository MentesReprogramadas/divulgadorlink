# Ondas — auditoria dos dados reais de links

Data: 23/10/2026. Branch observada: `codex/roadmap-f37-testes`.

Auditoria local de leitura, sem alteração de código, migração, dependência ou regra comercial. A árvore compartilhada já contém alterações extensas. Este documento propõe contratos; não registra funcionalidade entregue.

## Conclusão

- **“Sobre a comunidade” já existe como `Link.description`.** Reutilizar esse campo e sua moderação. Não criar `about`, `communityDescription` ou descrição paralela.
- **Ícone e imagem do link não existem no modelo de catálogo.** O avatar da página pessoal e as imagens de blocos são outro recurso. Persistência e entrega de anexos do catálogo exigem backend e uma migração aditiva.
- **Há pipeline de imagem reutilizável.** O cliente normaliza a imagem; o servidor valida e reencoda bytes. Não é necessário instalar dependência ou contratar armazenamento.
- **Não vincular um Link diretamente a `ProfileAsset`.** A poda desse armazenamento mantém somente referências de perfil/publicação/histórico. Uma imagem usada apenas por Link seria apagada.
- **A IA atual modera texto, não imagem.** Anexo pendente não pode ficar público por aprovação textual. A alteração precisa incluir uma decisão humana de mídia ou outra política de imagem explicitamente definida.
- **Sem imagem, omitir toda a área de foto.** Sem imagem substituta de banco, sem espaço vazio e sem foto inventada por assunto. Ícone e capa são opcionais e independentes.

## Evidência no código atual

| Área | Evidência | Implicação |
| --- | --- | --- |
| Modelo | `backend/prisma/schema.prisma:296`, `Link.description`, `approvedDescription` | Não há `image`, `photo`, `logo`, `avatarAssetId` ou `icon` em Link. |
| Criação | `backend/src/http/controllers/@Links/routes.ts:40`, `createLink` | Schema estrito recebe nome, descrição, URL, facetas e descoberta. Campos extras são recusados. |
| Autorização | `createLink`, `patchLink`, `canSubmitLink` | Tenant, titular, confirmação, suspensão, quota, URL pública e rede são validados no servidor. |
| Edição | `frontend/src/components/domain/panel-links.tsx`, `LinkEditor` | Edita nome/descrição; mantém dados de descoberta em contrato separado. |
| Proposta textual | `backend/src/use-cases/@Links/settle-proposed-text.ts` | Mantém texto publicado enquanto proposta é avaliada. Veredito só recebe nome/descrição/nicho. |
| Decisão humana | `backend/src/use-cases/@Moderation/resolve-human-review.ts` | Usa lock, versão de proposta/caso, hash de referência e auditoria; hoje ignora mídia. |
| Detalhe público | `getPublicLink` e `frontend/src/app/link/[id]/page.tsx` | Descrição pública já existe; `trackedGoPath`, impressão, favorito, denúncia e relacionados são reais. |
| Catálogo | `backend/src/http/catalog-page.ts`, `catalog-query.ts`, `controllers/@Catalog/routes.ts` | SELECTs e DTOs explícitos não carregam mídia. |
| Busca | `backend/src/use-cases/@Search/rank-links.ts`, `controllers/@Search/routes.ts` | Busca híbrida, fallback por faceta e DTOs explícitos não carregam mídia. |
| Relacionados | `backend/src/repositories/related-links-repository.ts` | DTO próprio com superfície `related`; precisa receber os mesmos anexos aprovados. |
| Upload cliente | `frontend/src/features/profiles/prepare-avatar.ts` | PNG/JPG/WebP até 5 MB e 8192 px por lado; reduz a WebP até 512 px e 256 KB. |
| Upload servidor | `backend/src/domain/profiles/avatar-webp.ts` | Base64 até 349528 caracteres; entrada/saída até 262144 bytes; PNG/WebP até 512 × 512; rejeita múltiplos frames; reencoda sem metadados. |
| Armazenamento | `backend/src/repositories/profile-media.ts` | Usa PostgreSQL `Bytes`, hash SHA-256 e escopo tenant/titular. |
| Poda | `backend/src/repositories/profiles-repository.ts:75` | `pruneMedia` apaga `ProfileAsset` que não esteja em perfil/publicação/revisões. |
| Permissões | `backend/src/domain/access/workspace-permissions.ts` | Novos endpoints privados são negados até classificados. Adicionar a seção `links`, sem conceder escrita a quem só lê. |
| Proxy | `frontend/src/app/bff/[...path]/route.ts` | Já entrega bytes e `Content-Type`; atualmente não encaminha `X-Content-Type-Options`. |
| Preview | `frontend/src/features/home-preview/preview-data.ts`, `ondas-preview/wave-link-detail.tsx` | Fotos, localização, destaques, categoria e views são dados ilustrativos; não têm contratos reais equivalentes completos. |

## Menor contrato completo recomendado

### 1. Texto e dados existentes

Usar `name` como título e `description` como “Sobre a comunidade/canal/conteúdo”. O texto curto do card é truncamento visual dessa descrição, sem novo campo. Preservar o comportamento atual de propostas e a ausência de limite novo no servidor; um limite novo precisa considerar os textos existentes.

Usar `discovery.city`, `languageTag` e `modality` quando informados. Sem esses valores, omitir a linha; não assumir Brasil, português, modalidade online, número de membros ou público. A categoria “Comunidade/Canal/Conteúdo” não está modelada em Link: tratar como rótulo derivado somente quando houver mapeamento inequívoco, ou usar “Detalhes”. Não inferir uma lista de benefícios a partir da descrição.

### 2. Mídia opcional de catálogo

Proposta: uma tabela própria `LinkMediaAsset`, vinculada ao Link e ao tenant, com duas finalidades limitadas: `ICON` e `IMAGE`. Não criar galeria, cropper, armazenamento externo ou campo de URL remota.

Cada registro precisa conter identificador, `tenantId`, `linkId`, finalidade, bytes WebP, texto alternativo para `IMAGE`, estado `PENDING`/`APPROVED`, datas e revisão. O vínculo deve usar FK composta `(linkId, tenantId)`; o titular é obtido do Link atual na autorização. Se `ownerId` for persistido para auditoria, a FK deve incluir tenant e o titular deve ser conferido em cada mutação.

Manter no máximo um registro aprovado e um pendente por `(tenantId, linkId, kind)`, com constraints/índices únicos parciais na migração SQL. Nova proposta substitui somente a pendente; a imagem publicada continua até aprovação da nova. Rejeição apaga bytes pendentes e guarda a decisão no audit log. Aprovação troca a versão publicada e remove bytes antigos na mesma transação, sob lock do Link. Remoção explícita pelo titular remove a mídia correspondente e as propostas desse slot; não retira o Link do catálogo.

Essa tabela evita campos publicados/pendentes duplicados em Link e evita alterar o ciclo de vida de mídia dos perfis. É uma migração aditiva; links existentes continuam sem anexos, sem backfill fictício.

### 3. API e validação

Contrato proposto, sujeito à consolidação da implementação:

- Criação `POST /links`: anexos opcionais `{ icon?: {base64}, image?: {base64, alt} }`. Ausência preserva todos os callers atuais. Validar os bytes antes da persistência e criar Link/anexos na mesma transação da quota. Evitar criar Link e depois falhar silenciosamente no upload.
- Edição de mídia `PUT /links/:id/media/:kind`: corpo estrito `{base64, alt?, expectedVersion}`; versões da mídia independentes de `discoveryVersion`. Não misturar essa mudança na proposta de texto.
- Remoção `DELETE /links/:id/media/:kind`: corpo estrito `{expectedVersion}`. `ICON` não recebe alt fornecido pelo usuário; sua imagem é decorativa junto ao nome. `IMAGE` exige alt de 1 a 250 caracteres após trim.
- Leitura privada `GET /links/:id/media`: metadados, URLs privadas e estado pendente/aprovado. A leitura privada de bytes precisa validar titular/tenant e a permissão `links.read`.
- Leitura pública de bytes `GET /links/:id/media/:assetId`: somente ativo aprovado ligado àquele Link. Revalidar publicação, suspensão do titular, tenant e restrição de idade; adotar `private, no-store`, `image/webp` e `nosniff`. Não servir pendentes pelo conhecimento do ID. Não usar caminho de perfil pessoal para esses anexos.
- Revisão de mídia: listar e decidir no painel administrativo existente, com autorização administrativa atual, controle de versão/hash, motivo de rejeição e auditoria. Nova rota de decisão não pode ampliar a permissão de colaboradores comuns.

As URLs públicas são construídas pelo backend a partir de identificadores validados. API não aceita `http:`, `https:`, `data:`, SVG, nome de arquivo ou URL de upload arbitrários. O frontend usa `/bff/...` da mesma origem para servir a mídia.

Reutilizar `prepareAvatar` e `avatarWebp` como estão no primeiro lote. Uma extração mínima para nomes neutros só é útil se mantiver assinaturas e erros dos callers de perfil. Usar `FileUpload` diretamente; `ImageUpload` contém textos específicos de foto de perfil e não é um componente de link pronto. Os dois anexos normalizados cabem no limite global atual de 1 MiB; aplicar também limite explícito por rota, sem aumentar o global.

### 4. Moderação sem regressão comercial

Manter criação, aprovação automática condicional de **texto**, quota e destaque como estão. Anexos seguem revisão humana independente e não aparecem antes dela. Um Link pode publicar sem a mídia pendente; a interface precisa explicar “Imagem aguardando análise” sem prometer prazo nem afirmar que todo Link passa por análise humana.

Não reutilizar o tipo de proposta `link.text.proposed` para bytes ou anexos: workers textuais poderiam aplicar/vereditar sem avaliar a imagem. Registrar ações específicas de mídia e mostrar a prévia privada somente ao titular e ao moderador autorizado. Não enviar bytes a OpenAI/Evolution/WhatsApp, webhooks ou outro serviço. Revisão de mídia deve acontecer no painel; notificações podem permanecer genéricas, se fizerem parte do contrato escolhido.

## Alcance obrigatório da implementação

1. **Banco/repositório:** schema Prisma, migração SQL aditiva, repositório de mídia e transações de criação/edição/revisão. `LinkRecord` e repositório in-memory precisam manter compatibilidade se receberem novo contrato; não serializar bytes nos DTOs.
2. **Publicação:** projeção aprovada comum, consumida em catálogo home/faceta, busca híbrida/fallback, detalhe e relacionados. Preferir enriquecer IDs paginados em uma consulta em lote; evitar N+1 e não alterar rank/cursor pelo estado da mídia. Não obrigar alterar os embeddings por troca de imagem.
3. **Outras superfícies:** favoritos e coleção pública usam `LinkRow`; se esse card passar a mostrar mídia, atualizar DTOs de `favoriteView`, repositórios de favoritos/coleções e contratos correspondentes. Se permanecerem cards só de texto, registrar essa decisão explicitamente.
4. **Autoria:** `/painel/links/novo`, rascunho local, revisão antes do envio, `PanelLink`/`useMyLinks`, `LinkEditor`, salvamento com erro/offline/conflito e remover/trocar anexos. Não persistir arquivos originais/base64 em localStorage por efeito da inclusão no Draft textual. Estado textual existente deve continuar recuperável.
5. **Administração:** fila e decisão de mídia no painel, prévia autorizada, rejeição/aprovação/troca concorrente e histórico. A decisão de imagem não publica texto pendente nem muda destaque.
6. **Segurança/proxy:** `workspaceRoute`, `publicWorkspaceAction`, middlewares de suporte/CSRF, BFF de bytes e encaminhamento de `nosniff`. Respeitar contexto de workspace e não usar sessão pessoal como atalho.
7. **Apresentação:** `LinkRow`, catálogo, busca, detalhe, relacionados e Ondas real recebem mídia opcional; markup da foto só existe com imagem aprovada. Preservar foco, alt, estado de falha da imagem, redução de movimento e layout sem foto em desktop/mobile.
8. **Exportação/transferência:** o export de perfil já exclui fotos/arquivos e declara que referências de catálogo não copiam conteúdo externo. Preservar isso. Não incluir bytes, tokens ou IDs privados no export. A transferência de página pessoal não transfere Link; a mídia vinculada ao Link deve permanecer com ele.

## Invariantes

- Publicação grátis, quatro slots e elegibilidade de destaque continuam definidos pelo backend.
- Preservar `surfaceToken`, origens home/niche/search/related, `queryId`, `/go`, marcado patrocinado e semântica de impressão/clique. Carregar imagem não é impressão de Link nem clique novo.
- Preservar consentimento, atribuição inicial e proibição de marketing antes do aceite. Nenhum texto alternativo, bytes ou identificador privado entra em analytics.
- Preservar canonical/robots/sitemap e SSR público. Não promover URLs de mídia a entradas de sitemap nem usar pendentes em Open Graph.
- Proteger publicação/retirada, bans, idade e tenant também nos bytes, sem cache público que mantenha a mídia após remoção.
- Rejeição de mídia não deve banir usuário, alterar URL, cota, preço, cobrança, tenant, propriedade ou texto aprovado como consequência lateral.

## Verificação que a implementação precisará executar

- Unitários: MIME/bytes falsos, SVG/GIF/animado, tamanho/dimensões, alt inválido; usar os testes atuais de avatar como contrato reutilizado.
- PostgreSQL/API: cria com/sem anexos; falha atômica de payload; pendente não vaza; tenant/titular/workspace/suporte/CSRF; leitura por ID adivinhado; restrição de idade e conta suspensa; substituição mantém antigo; rejeição, retirada e remoção; aprovação concorrente/obsoleta; constraints e limite de registros.
- Contratos públicos: home/faceta/busca/fallback/detalhe/relacionados, e favoritos/coleções se mudarem. Preservar rank, cursores, marca patrocinada e tokens. Não expor bytes na listagem.
- Frontend: escolher, cancelar, erro, trocar e remover; rascunho textual preservado; ação dupla e conflito; card com ícone, com foto e sem foto; alt/teclado/foco/zoom e falha de carregamento.
- E2E real: publicação com descrição e dois anexos, decisão humana, novo upload pendente mantendo imagem anterior, rejeição/remover, leitura pública e links de saída reais. Desktop/mobile com capturas determinísticas e sem imagens remotas de demonstração.
- Checks completos dos pacotes alterados: lint, typecheck, testes afetados e build. Ler setup/teardown antes dos E2E; usar só containers próprios e portas livres. Atualizar Graphify incrementalmente após alterações relevantes.

## Consultas e limites desta auditoria

Skills lidas: Caveman, Ponytail full e Graphify. Índice consultado primeiro: `graphify-out/graph.json`, 7371 nós. Vocabulário selecionado do próprio grafo: `link`, `links`, `upload`, `image`, `logo`, `description`, `public`, `catalog`, `moderation`, `storage`, `create`, `update`. A consulta BFS retornou 857 nós e foi truncada; conclusões acima foram confirmadas nos arquivos atuais, inclusive callers e testes existentes.

Não foi necessário atualizar o índice: não houve edição de código. Não foram executados testes, build, migração ou inspeção visual nesta auditoria. Não houve chamada de LLM externa, envio de código, acesso a dados de produção ou alteração de serviço. O modelo de mídia e as rotas acima são propostas, não comportamento existente. Qualidade de fotografia em 512 px deve ser validada no detalhe Ondas antes de decidir por uma pipeline maior.
