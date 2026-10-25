# Revisão independente — mídia de links Ondas

Data: 2026-10-23. Escopo T2: domínio, migração, repositório, rotas, projeções públicas, BFF e interface de envio/revisão. Revisão estática independente; nenhuma alteração na implementação, execução de banco ou navegador. O único arquivo escrito por esta revisão é este relatório.

## Resultado inicial

Três achados P2 confirmados no código inicialmente lido, **resolvidos na releitura focada registrada abaixo**. Nenhuma exposição direta de bytes pendentes, SVG ou mídia de outro tenant foi identificada. Isso não substitui testes executados nem validação de produção. Os achados originais são preservados como histórico; não representam pendências atuais após a correção.

## Parecer após correções — 2026-10-23

**Os três achados estão resolvidos no código atual. Nenhum bloqueio residual identificado na releitura restrita a essas correções.**

- **Descarte de pendências:** `backend/src/repositories/link-media.ts:34` limita a exceção ao administrador em `DECIDE/REJECT`. Aprovação continua submetida ao estado do link/titular. Lock, tenant, versão, asset pendente exato, motivo e auditoria transacional permanecem. `backend/src/http/controllers/@Links/media.ts:71` entrega `canApprove`; `frontend/src/features/link-media/link-media-queue.tsx:28` desabilita aprovação e explica a rejeição para encerramento.
- **Filtro antes do limite:** `backend/src/http/controllers/@Links/media.ts:69` valida `linkId`; a consulta imediatamente seguinte aplica o filtro dentro do `where`, antes de `take:100`, junto ao tenant. `frontend/src/features/link-media/link-media-queue.tsx:12` envia o parâmetro codificado e o efeito recarrega ao mudar `linkId`.
- **Estado de rejeição:** `backend/src/http/controllers/@Links/media.ts:37` consulta a última ação de mídia por slot na auditoria, depois de conferir titular/tenant do link. Entrega motivo somente quando a última ação é rejeição; proposta, remoção ou aprovação posteriores encerram o aviso. `frontend/src/features/link-media/link-media-editor.tsx:52` exibe o estado e o motivo em texto, sem recuperar bytes rejeitados.

Foram relidos os cenários acrescentados nos testes PostgreSQL/HTTP e UI: lote de 101 pendências anteriores, filtro de link posterior, motivo privado e limpeza do aviso ao reenviar, titular banido/link retirado com aprovação negada e rejeição permitida. Não foram executados testes por este revisor. O implementador registra em `docs/superpowers/ondas-media-progress.md` seis testes backend e 27 testes frontend aprovados, além dos checks de lint/tipos/build descritos lá. Esses resultados são atribuídos ao implementador, não constituem execução independente desta revisão.

Esta segunda passagem não iniciou nova busca ampla, banco, navegador ou E2E. A validação visual, E2E global e a atualização final do grafo permanecem sob responsabilidade do coordenador.

### P2 — pendências de links rejeitados/retirados não podem ser descartadas

- Local principal: `backend/src/repositories/link-media.ts:34`.
- Relações: `backend/src/repositories/links-repository.ts:738`; `backend/src/http/controllers/@Links/media.ts:64`.
- A criação persiste anexos pendentes também quando a decisão textual é `PRE_REJECTED`. Uma proposta de mídia também pode existir antes de retirada do link, rejeição textual ou banimento do titular.
- A fila consulta os 100 anexos `PENDING` mais antigos sem considerar o estado do link. Entretanto, o repositório rejeita tanto `APPROVE` quanto `REJECT` quando o link não está `PUBLISHED`/`PENDING_MODERATION` ou o titular está banido. O administrador fica sem caminho para descartar os bytes. Com 100 desses anexos, propostas novas não aparecem na fila.
- Correção mínima: permitir **somente a rejeição administrativa** da proposta nesses estados, mantendo tenant, autorização administrativa, asset exato, versão esperada, lock e auditoria na mesma transação. Aprovação deve continuar impedida. Expor elegibilidade na fila evita oferecer uma aprovação que sempre falha. Não resolver apenas ocultando os registros: isso perpetuaria bytes sem descarte.
- Regressão necessária: pendência seguida de retirada/banimento; aprovação negada, rejeição remove apenas pendente, incrementa versão e audita; texto e mídia aprovada preservados; revisão obsoleta continua negada.

### P2 — filtro de link aplicado depois do limite produz falso estado vazio

- Locais: `backend/src/http/controllers/@Links/media.ts:64`; `frontend/src/features/link-media/link-media-queue.tsx:13`, `:25`.
- A tela recebe `linkId`, mas busca sempre os primeiros 100 anexos globais. Só então filtra `assets` no cliente. Ao abrir `/admin/moderacao?link=<id>` para um link fora desse primeiro lote, a interface afirma que não há anexos pendentes, embora existam no banco.
- Correção mínima: enviar `linkId` opcional à API, validar o filtro e aplicá-lo junto ao tenant **antes** de `take:100`. Atualizar a consulta ao mudar `linkId`. Não é necessário introduzir uma nova infraestrutura de fila.
- Regressão necessária: mais de 100 propostas de outros links; o filtro de um link posterior retorna sua proposta; filtro de outro tenant não retorna conteúdo.

### P2 — titular não recebe estado nem motivo da rejeição

- Locais: `backend/src/repositories/link-media.ts:49`, `:53`; `backend/src/http/controllers/@Links/media.ts:35`, `:37`; `frontend/src/features/link-media/link-media-editor.tsx:8`, `:50`.
- Rejeição remove corretamente os bytes e guarda motivo no `auditLog`, porém o GET privado só entrega assets existentes. O editor só conhece `PENDING` e `APPROVED`. Após a rejeição, o titular vê a imagem desaparecer ou apenas a versão aprovada anterior, sem saber que a proposta foi rejeitada nem como corrigi-la.
- O contrato da auditoria e a especificação exigem estados pendente/rejeitado. O comportamento atual não entrega esse estado.
- Correção mínima: reutilizar a auditoria para retornar a última rejeição relevante de cada slot no GET privado, sem bytes ou conteúdo de outro titular. Exibir o motivo no editor. Uma nova proposta, remoção ou decisão posterior precisa superar o aviso antigo para evitar rejeição obsoleta.
- Regressão necessária: rejeitar proposta mantendo mídia aprovada; titular lê motivo e estado, outro titular/tenant não lê; reenviar ou remover elimina o aviso obsoleto sem perder texto do link.

## Proteções conferidas no código

- `LinkMediaAsset` usa FK composta de link/tenant, cascade de exclusão, limite de bytes, alt obrigatório para imagem e único registro por tenant/link/slot/estado. Migração aditiva; sem atualização da aprovação dos links existentes.
- Preparação valida corpo estrito, tamanho e bytes raster; servidor limita pixels, rejeita formatos fora de PNG/WebP e múltiplos frames, reencoda WebP sem metadados. Ícone reutiliza `avatarWebp`; capa limita 1600 px/1 MiB. Limite global continua 1 MiB; apenas criação/upload de mídia têm limite explícito de 2 MiB.
- Criação de link/anexos permanece na transação serializável da quota. Alterações de mídia usam lock do link e versão independente. Proposta substitui só a pendente; aprovação remove anterior e publica nova na mesma transação; falha da auditoria desfaz a mutação.
- Rotas privadas conferem tenant, usuário ativo e ownership atual. Escritas conferem confirmação de e-mail. `workspaceRoute` classifica as rotas em `links` ou `adminModeration`; guard global mantém leitura/escrita separadas, contexto de suporte e CSRF. Auditoria da mídia usa o colaborador efetivo quando presente.
- As prévias privadas em `<img>` dependem do cookie `workspaceOwner`; o guard lê esse cookie quando não existe cabeçalho explícito. Não foi confirmado vazamento ou ausência geral de contexto de equipe nessa leitura.
- Leitura pública dos bytes exige asset aprovado e link publicado, revalida tenant de link/rede/nicho/titular, suspensão e idade; devolve `image/webp`, `private, no-store` e `nosniff`. O BFF preserva os três cabeçalhos e os bytes.
- Projeção aprovada em lote alimenta catálogo/facetas, busca/sugestões, detalhe, relacionados, favoritos e coleções; não altera rank, cursor ou assinatura de `surfaceToken`.
- Moderação de mídia não chama a moderação textual, não modifica preços/quota/destaque e não publica texto pendente. Não foi identificada transmissão dos bytes para serviços externos nesse fluxo.
- Estado local de anexos é separado do rascunho textual; o rascunho persistido não inclui base64. Editor mantém candidato em erro/conflito e encadeia versões quando envia dois slots.

## Verificação e limites

Foram lidos os testes de domínio, repositório PostgreSQL, rotas PostgreSQL, componentes e E2E de mídia, além dos callers e guardas. Eles documentam casos de autorização, idade, rollback, substituição e rejeição, mas **não foram executados por este revisor**. O coordenador e o implementador conduzem os runners isolados; não foi criado runner concorrente.

Grafo consultado: 7371 nós e 25756 arestas. Não contém `LinkMediaAsset` nem `link-media`; os módulos novos foram confirmados diretamente no código. Não foi reindexado neste trabalho de revisão sem mutações. Skills consultadas: Caveman, Ponytail e Graphify; Superpowers instrui subagentes específicos a ignorar seu fluxo geral.

A árvore já continha alterações extensas de outros trabalhos. Os achados acima são restritos ao fluxo de mídia adicionado; problemas anteriores não foram atribuídos a ele. Nenhum commit, branch, publicação, migração, acesso de produção ou alteração de dependência foi realizado. Correções posteriores podem deslocar as linhas citadas; verificar os símbolos e registrar a releitura.
