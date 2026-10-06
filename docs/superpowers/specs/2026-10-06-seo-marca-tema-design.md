# SEO de marca e tema

## Decisão

A home disputa a marca. Nicho, rede e link disputam tema só quando a página tem substância. 18+ continua `noindex` e fora do sitemap, com ou sem resumo. Search Console fica com quem opera o site: propriedade de domínio e envio de `https://temlinkaqui.com/sitemap.xml` depois que este comportamento estiver no ar.

Uma função só decide o `robots` e o sitemap. Os dois não divergem.

## Régua

Constantes: `MIN_LINKS = 3`, `MIN_TEXT = 80`, `MAX_SUMMARY = 500`.

Um link é substantivo quando está `PUBLISHED`, o dono não está `BANNED`, o nicho não exige idade, a descrição sem espaços nas pontas tem pelo menos 80 caracteres e é diferente do nome.

Uma faceta pública entra no índice quando não exige idade e vale uma destas:

- tem pelo menos 3 links substantivos nela
- tem `summary` com pelo menos 80 caracteres

O link entra no índice quando é substantivo e o nicho dele entrou. A contagem da faceta não espera a faceta já estar indexável. Não há ciclo.

Rede conta só links substantivos daquela rede. Nicho conta só os do nicho. Link de nicho 18+ não conta para a rede.

Página pública que não passa na régua responde 200 com `noindex,follow`. Não vira 404. 18+, faceta não pública, link indisponível e dono banido continuam `noindex,nofollow`.

Home entra sempre. Presença de `network`, `niche` ou `cursor` na query deixa a faceta `noindex,follow`. O canonical é o caminho limpo, sem query.

## Títulos e página

| Página | H1 | `<title>` | Description |
| --- | --- | --- | --- |
| Home | Encontre o que você procura. | nome do tenant | Links, comunidades e serviços organizados por tema e rede. |
| Nicho ou rede | nome da faceta | `{nome} \| {tenant}` | resumo, ou a frase automática |
| Link | nome do anúncio | `{nome} \| {tenant}` | descrição do anúncio |

A frase automática do nicho é `Links de {nome} organizados por rede.` A da rede é `Links publicados em {nome}.`

O resumo, quando existe, é o parágrafo visível e a meta description. Não é descartado por parecer com o título. Sem resumo, a frase automática permanece.

A trilha visível substitui o link solto de voltar. Faceta: `Início / {nome}`. Link: `Início / {nicho} / {nome}`. Só página indexável publica JSON-LD, e esse JSON-LD inclui a trilha.

Faceta indexável publica `CollectionPage` com os links da primeira resposta que eles mesmos sejam indexáveis. Sem nenhum, o `CollectionPage` sai sem lista. A URL do item é `/link/{id}`, sem `surfaceToken`. A home publica, no grafo que já existe, só os links indexáveis daquela resposta. Página com filtro, cursor, 18+ ou fora da régua não publica JSON-LD.

## Resumo

`Niche.summary` e `Network.summary` são `String?`. Texto só com espaço grava `null`. Acima de 500 caracteres, ou contendo `<`, a API responde 400 e não grava. O valor é texto puro.

18+ pode guardar resumo e mostrá-lo a quem confirmou a idade. A régua de índice ignora esse texto.

## Admin

Seção em Configurações, abaixo do interruptor de impressões. Duas listas, nichos e redes. Cada linha mostra nome, slug, se entra na busca, o campo e salvar. 18+ deixa explícito que continua fora da busca. Não há rota nova.

`GET /api/v1/admin/facets` devolve os dois tipos com id, nome, slug, `requiresAge`, `isPublicFacet`, `summary`, a contagem de links substantivos e `indexable`. O booleano sai da mesma função do sitemap. A tela não recalcula a régua.

`PATCH /api/v1/admin/facets/:kind/:id` recebe `{ summary: string | null }`. `kind` é `niche` ou `network`. Só admin do tenant. Faceta de outro tenant responde 404. Cada gravação audita `facet.summary.update` com o valor anterior e o novo.

Falha ao carregar mostra erro e não inventa lista vazia. Falha ao salvar mostra a mensagem da API e conserva o texto digitado.

## Testes

- Faceta com 2 links substantivos e sem resumo: `noindex,follow`, fora do sitemap.
- Faceta com 3 links substantivos: `index,follow`, no sitemap.
- Faceta sem links e com resumo de 80 caracteres: no sitemap.
- 18+ com resumo longo e vários links substantivos: fora.
- Link com 79 caracteres e nicho indexável: `noindex,follow`.
- Link substantivo com nicho indexável: no sitemap.
- Filtro e cursor: `noindex,follow`, canonical na URL limpa.
- H1 é o nome. `<title>` leva o sufixo do tenant.
- Resumo substitui a description. String vazia no PATCH vira `null`. 501 caracteres e texto com `<` respondem 400.
- Admin de outro tenant recebe 404. Não-admin recebe 403.

## Fora deste desenho

Search Console, redação dos resumos e qualquer mudança na regra de 18+.
