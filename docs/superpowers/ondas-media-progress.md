# Ondas — anexos persistidos e moderados de links

Data: 23/10/2026. Implementação T2 na árvore compartilhada existente, sem commit, branch, dependência ou serviço externo novo.

## Implementação

- `description` continua sendo a descrição/sobre do link e usa sua moderação textual existente.
- Prisma: `Link.mediaVersion` e tabela própria `LinkMediaAsset`, com FK composta Link/tenant, finalidade ICON/IMAGE, estado PENDING/APPROVED, bytes WebP, alt, revisão e data. Migração aditiva `20261023170000_link_media` com constraints de tamanho/alt/finalidade/estado e no máximo um aprovado e um pendente por finalidade/link/tenant.
- Ícone: normalização existente de avatar, até 512 px/256 KiB. Capa: Sharp instalado, raster PNG/WebP estático, até 1600 px/1 MiB; reencoda sem metadados. Cliente aceita originais PNG/JPG/WebP de até 5 MiB, prepara WebP localmente e não guarda bytes em localStorage.
- POST de criação aceita `media?: {icon?: {base64}, image?: {base64, alt}}`. Validação dos bytes precede a transação; persistência de ambos os anexos integra a transação da quota/criação. Apenas POST de criação e PUT de mídia recebem limite explícito de 2 MiB; limite global de 1 MiB permanece.
- Substituição remove somente a proposta pendente. Aprovação humana substitui a aprovada; rejeição apaga bytes pendentes e guarda motivo na auditoria. Remoção explícita apaga aprovado e pendente daquela finalidade. Lock do Link, versão e ID exato da proposta impedem decisão obsoleta. Aprovação textual ou automática não acessa os anexos.
- Autorizações verificam tenant, titular atual, estado/identificadores atuais e capacidades de equipe. Revisão exige administrador ativo no banco, além da sessão administrativa. Auditoria registra o colaborador real.
- URLs aprovadas opcionais `iconUrl`, `imageUrl`, `imageAlt` integram home/faceta, busca/sugestões, relacionados, detalhe, favoritos e coleções privadas/públicas. Enriquecimento em lote somente da página selecionada; sem bytes, rank ou cursor novos.
- Bytes públicos revalidam tenant, publicação, titular ativo e idade de rede/nicho; retornam `private, no-store`, `image/webp`, `nosniff`. BFF encaminha `nosniff`.
- UI: anexos opcionais no segundo passo de criação; preview/remover/alt; revisão final informa anexos selecionados. Edição tem seção própria, preserva texto, conserva seleção quando falha/conflita e permite atualizar a versão. Última rejeição e motivo de cada finalidade vêm da auditoria privada; nova proposta/remoção/aprovação encerra esse aviso. Administração tem fila própria com preview, aprovar e rejeitar com motivo.
- Revisão independente identificou e levou à correção de três falhas: feedback de rejeição perdido para o titular; filtro por Link aplicado após o limite de 100; impossibilidade de rejeitar/limpar pendências quando o Link é retirado ou o titular é suspenso. A fila agora filtra no banco antes do limite, expõe `canApprove` e permite apenas rejeição administrativa nesses estados. Aprovação continua bloqueada. Há regressões PostgreSQL e UI para os três casos.

## API consolidada

- `GET /api/v1/links/:id/media`: titular/equipe autorizada; `{version, assets:[{id,kind,status,alt,revision,url}], reviews:[{kind,reason,createdAt}]}`. `reviews` contém a última rejeição ainda pertinente de cada finalidade, sem bytes.
- `PUT /api/v1/links/:id/media/icon|image`: `{base64,alt?,expectedVersion}`. Alt obrigatório na imagem e proibido no ícone.
- `DELETE /api/v1/links/:id/media/icon|image`: `{expectedVersion}`.
- `GET /api/v1/links/:id/media/private/:assetId`: bytes privados do titular/equipe, incluindo pendentes.
- `GET /api/v1/links/:id/media/:assetId`: bytes públicos exclusivamente aprovados e elegíveis.
- `GET /api/v1/admin/moderation/media?linkId=...`: filtro opcional aplicado no banco antes do limite de 100 propostas; mais antigas primeiro, preview administrativo, `canApprove` e versão atual do Link.
- `GET /api/v1/admin/moderation/media/:assetId/bytes`: preview administrativo pendente.
- `POST /api/v1/admin/moderation/media/:assetId`: `{expectedVersion,decision:'APPROVE'|'REJECT',reason?}`. Rejeição exige motivo.

## Verificações executadas

- Consultado Graphify existente primeiro (`graphify query 'ProfileAsset Link LinksRepository' --budget 1200`), com truncamento anunciado; confirmado no código atual. Atualização final do índice deve ser serializada pelo agente principal.
- TDD: testes iniciais de validação, repositório PostgreSQL e campos/editor falharam pela ausência do módulo, antes da implementação; depois passaram.
- `npm run db:generate` em backend: passou, cliente Prisma 6.0.1 gerado; sem migração de banco externo.
- Criado exclusivamente o container próprio `ondas-media-test-pg`, PostgreSQL pgvector 16, porta local 15449. `prisma migrate deploy` aplicou 72 migrações em banco descartável `media`; repetido do zero em `media_final` após ajuste da constraint de alt, com sucesso.
- `npm test -- src/domain/links/link-media.spec.ts src/repositories/link-media.pg.spec.ts src/http/link-media.pg.spec.ts` com `PG_SPECS=1` e `ANALYTICS_DATABASE_URL` local: seis testes passaram. Inclui raster falso/SVG/GIF/WebP animado/dimensões, criação atômica com rollback, revisão e troca, rollback de falha de auditoria, versões obsoletas, isolamento, bans, idade, CSRF, confirmação, permissões de equipe e actor real. HTTP também verifica projeção em favoritos e coleção pública.
- Backend `npm run lint`, `npm run typecheck`, `npm run build`: passaram, incluindo a passagem final após favoritos e correções da revisão.
- Frontend: sete arquivos/16 testes focados passaram com `--testTimeout=15000`; limite padrão de 5 s teve dois timeouts numa passagem com processos concorrentes, sem alterar timeout no código. Testes cobrem normalização local, preview/remover, conflito/retry, rejeição, criação sem persistir mídia local e regressão do editor/texto/fila existentes.
- Frontend `npm run lint` e `npm run typecheck`: passaram após remover uma supressão de regra inexistente; passagem final inclui favoritos e E2E typecheck.
- Passagem frontend final: `npm test -- --run --testTimeout=15000 src/features/link-media src/features/favorites src/components/domain/panel-links.test.tsx src/app/painel/links/novo/page.test.tsx src/app/admin/moderacao/queue.test.tsx`: 13 arquivos/27 testes passaram. O timeout foi opção de execução, sem mudar configuração do projeto.
- Passagem backend final: `PG_SPECS=1`, `ANALYTICS_DATABASE_URL` apontando exclusivamente a `127.0.0.1:15449/media_final`; `npm test -- --testTimeout=30000 --hookTimeout=30000 src/domain/links/link-media.spec.ts src/repositories/link-media.pg.spec.ts src/http/link-media.pg.spec.ts`: três arquivos/seis testes passaram, incluindo 101 pendências anteriores para provar filtro antes do limite. Uma tentativa combinada anterior teve timeouts padrão de 5 s sob carga concorrente; teardown posterior gerou erro de conexão ao endereço inválido padrão de testes. A repetição acima passou; não foi usada conexão externa.
- Regressão sem PostgreSQL: validação de mídia e POST atual, dois arquivos/12 testes passaram com `--testTimeout=30000 --hookTimeout=30000`.
- Container próprio `ondas-media-test-pg` removido após a conclusão dos testes. Nenhum container alheio foi alterado.

## Ainda não validado neste relatório

O novo `frontend/e2e/link-media.spec.ts` foi escrito para desktop/mobile: formulário real com os dois anexos, decisão humana, catálogo/detalhe, bytes/BFF, substituição pendente, rejeição e remoção. Só o agente principal executa o runner E2E e registra resultados/capturas. Este agente não executou E2E, inspeção visual ou build completo do frontend. Não há prova de produção ou qualidade fotográfica por uma fixture raster de 2×2 px.

Risco operacional: a migração aditiva precisa existir no ambiente antes do novo servidor. O armazenamento cresce no PostgreSQL, limitado a quatro registros por Link (dois slots × pendente/aprovado); remoção/rejeição/troca limpam bytes na mesma transação. A fila administrativa limita a leitura a 100 pendências, recarregadas após cada decisão. Não foi criada paginação administrativa adicional.

## Reversão

Reverter somente os arquivos T2 e suas inserções nos consumidores, preservando alterações anteriores/paralelas. A tabela/coluna aditivas podem permanecer sem consumidores; não executar DROP nem apagar mídia num rollback de UI. Container descartável próprio removido após os testes finais; nenhum container alheio foi parado.
