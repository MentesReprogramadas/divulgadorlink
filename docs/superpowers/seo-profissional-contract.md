# Contrato compartilhado SEO profissional

Backend domínio: `domain/catalog/seo-editorial.ts` exporta tipos e schema abaixo. Persistência: `repositories/catalog-seo.ts`.

```ts
type SeoText = { title: string; description: string; explicit: boolean; approved: boolean }
type SeoPreview = SeoText & { fingerprint: string }
type SeoCollection = SeoText & { slug: string; networkSlug: string | null; nicheSlug: string | null }
type SeoEditorial = { version: number; facets: Record<string, SeoText>; links: Record<string, SeoPreview>; collections: SeoCollection[] }
// facets keys: niche:<slug> / network:<slug>
```

Funções puras: `linkFingerprint(link: {id;tenantId;name;description;canonicalUrl;networkId;nicheId;updatedAt:Date}):string`, `approvedPreview(state:SeoEditorial,link:LinkRecord):SeoPreview|null`, `facetCopy(kind:'niche'|'network',slug:string,name:string):{title:string;description:string;explicit:boolean}`. O fingerprint inclui updatedAt, invalidando mídia e texto na atualização do link.

Persistência: `readCatalogSeo(tenantId:string):Promise<SeoEditorial>`. Novo estado: `{version:0,facets:{},links:{},collections:[]}`. Gravação administrativa atômica + auditoria. Config key `CATALOG_SEO_EDITORIAL`.

HTTP admin (JWT real, admin ativo, tenant verificado):
- GET `/api/v1/admin/catalog-seo` => `SeoEditorial`.
- PUT `/api/v1/admin/catalog-seo` body `{expectedVersion:number,facets:Record<string,SeoText>,collections:SeoCollection[]}`: preserva links, valida entidades do tenant; 200 estado; 409 concorrência. Aprovação só em campos aprovados; 400 texto/slug/filtros inválidos. GET é o estado de edição; não declara elegibilidade sozinho.
- GET `/api/v1/admin/catalog-seo/links/:id` => `{version:number,preview:SeoPreview|null, name:string,description:string,requiresAge:boolean}`; apenas dados publicados do tenant.
- PUT `/api/v1/admin/catalog-seo/links/:id` body `{expectedVersion:number,title:string,description:string,explicit:boolean,approved:boolean}` => 200 estado. Backend calcula fingerprint do anúncio atual, nunca confia num fingerprint enviado. Revogação: approved=false.

Público:
- Coleções GET `/api/v1/catalog-collections` => `{collections:Array<{slug,title,description,explicit}>}` somente aprovadas e com inventário público elegível.
- Coleção GET `/api/v1/catalog-collections/:slug` => corpo de faceta `heading,seo,breadcrumbs,sponsored,organic,nextCursor,ageRequired?,blocked?`, com filtro `cursor` e discovery padrão. Dados restritos só após idade; prévias públicas sem imagem/convite.
- Nova rota frontend `/descobrir/:slug` para coleções cadastráveis por intenção; não gerar 500 combinações. URLs existentes preservadas. Links rede+nicho podem apontar para coleção equivalente quando aprovada, demais mantêm filtros.
- SEO em toda resposta pública: `title,description,canonical,robots,openGraph,structuredData?,rating?:'adult'`. Breadcrumbs `Array<{name:string;path:string}>`.
- Detalhe adulto anônimo: `available:true,ageRequired:true` (ou blocked com recusa), `name/description` somente prévia aprovada, `seo`; sem mídia, goPath, surfaceToken, related ou conteúdo restrito. Sem prévia: título neutro e noindex. Confirmado: detalhes completos, metadata continua baseada na prévia pública estável, rating conforme classificação. Backend decide requiresAge por nicho OU rede.

Frontend repassa `cursor` para API e publica link HTML de página seguinte. Metadata de paginação possui canonical da própria sequência, e filtros fora do índice. Admin UI mostra aprovação como elegibilidade editorial, sem afirmar indexação pelo Google. Seguir erros/estados e componentes existentes.
