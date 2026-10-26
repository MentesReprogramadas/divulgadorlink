# SEO profissional de redes e nichos, incluindo +18

Estado: desenho aprovado pelo pedido explícito de implementar e validar em 26/10/2026, seguido da autorização de publicar em produção. A escolha de manter o domínio atual foi confirmada pelo usuário. Execução e validação registradas no plano e relatório da entrega.

## Pesquisa de demanda e correção de escopo — 26/10

O usuário esclareceu que os exemplos anteriores não são uma lista fechada: quer descobrir as famílias de busca relevantes de cada rede/nicho. A [pesquisa de palavras-chave](../../pesquisas/2026-10-26-pesquisa-palavras-chave-redes-nichos.md) passa a fundamentar a seleção editorial: 20 redes inventariadas, consultas em 19 redes e todos os 25 nichos, oito famílias de expansão, 143 consultas de autocomplete e 17 observações públicas de volume estimado. Limites e fontes estão no relatório; sugestões não equivalem a ranking de volume.

As tabelas de buscas e caminhos deste desenho são exemplos arquiteturais. Não limitam a cobertura e não determinam criação automática de páginas. A arquitetura deve suportar coleções editoriais por intenção real, inclusive loja, tipo de conteúdo, objetivo, jogo e local quando houver oferta, além de rede+nicho. Definir o formato de URL dessas coleções a partir do agrupamento editorial e do acervo, preservando caminhos existentes e evitando sinônimos concorrentes.

A pesquisa não autoriza gerar todas as combinações, alterar a taxonomia inteira, indexar filtros vazios ou usar dados brutos sem curadoria. A prioridade continua adulto/apostas, com oportunidades específicas em ofertas e cobertura do restante do catálogo. Antes do plano de implementação, reconciliar as novas famílias com a seção de coleções e o armazenamento mínimo necessário; não implementar um mecanismo preso a uma lista literal de consultas.

## Objetivo e evidências

Tornar o Tem Link Aqui um diretório competitivo para buscas de comunidades, links, redes e nichos, incluindo adulto. Trabalhar elegibilidade técnica, relevância editorial, navegação, oferta e mensuração; não prometer primeiro lugar ou prazo de ranking.

### Prioridade confirmada pelo usuário

Na continuação de 26/10, o usuário definiu foco inicial maior em adulto/conteúdo sexual +18 e apostas, sem abandonar os demais nichos e redes. Prioridade editorial e de sequência não significa exclusividade nem maior destaque comercial automático. Apostas e conteúdo sexual são verticais distintas, mesmo quando ambas exigem idade; as restrições de cada uma devem ser preservadas.

O usuário também exigiu encontrabilidade de links individuais, usando o perfil do LinkedIn como analogia. Portanto, SEO de `/link/:id` é entrega obrigatória do programa, inclusive para links adultos com prévia aprovada, e não melhoria opcional após as categorias. O exemplo não autoriza indexar páginas privadas, rascunhos ou dados pessoais nem controlar o ranking do destino externo.

O primeiro piloto de coleções e detalhes deve cobrir adulto, apostas e ao menos uma vertical não restrita com inventário real. Os testes do contrato compartilhado incluem todas as redes e os demais nichos cadastrados; onde não houver oferta, verificar o estado vazio e a política de exclusão em vez de inventar conteúdo. A expansão editorial abrange o inventário elegível inteiro, priorizando as verticais escolhidas.

### Intenções de busca explicitadas pelo usuário

O usuário confirmou como exemplos concretos: “ofertas no WhatsApp”, “grupos Telegram”, “Telegram adulto”, “Telegram +18” e termos populares próximos. Esses exemplos ilustram a cobertura editorial desejada, sem limitá-la; não comprovam volume de busca nem garantem posicionamento. Cada modelo compartilhado precisa servir às outras redes e nichos com oferta real. A pesquisa de demanda acima orienta a descoberta das demais intenções.

| Busca ou família | Página principal planejada | Conteúdo necessário |
| --- | --- | --- |
| ofertas no WhatsApp, grupos de ofertas WhatsApp | `/rede/whatsapp/compras-ofertas-cupons` | Coleção real de grupos/canais de ofertas nessa rede, introdução própria e descrições úteis |
| grupos Telegram, links Telegram, canais Telegram | `/rede/telegram` | Hub da rede, conteúdo explicativo, coleções por tema e navegação para anúncios |
| Telegram adulto, Telegram +18, grupos adultos Telegram | `/rede/telegram/adulto` | Coleção adulta com prévias aprovadas, identificação explícita e proteção de idade |
| grupos de apostas Telegram/WhatsApp | Coleção da rede com o nicho de apostas cadastrado | Oferta correspondente e classificação de restrição própria, sem marcação sexual automática |
| nome de um grupo, canal, site ou publicação | `/link/:id` | Detalhe próprio do anúncio, com conteúdo público aprovado e canonical estável |

As rotas com dois segmentos após `/rede` são propostas novas, ainda não implementadas. Sinônimos da mesma intenção compartilham a mesma página; não criar uma página por grafia. A seleção das palavras nos títulos e textos precisa corresponder ao que a página entrega.

O usuário também mencionou “Telegram vazadinhos”. O termo deve ser avaliado pelo conteúdo real, não transformado automaticamente em uma categoria. Não criar ou promover coleção de material íntimo vazado sem consentimento. Conteúdo adulto autorizado pode ser descrito de forma fiel, mantendo moderação e mecanismo de denúncia/retirada; a expressão não é licença para admitir conteúdo proibido nem para inventar uma oferta editorial.

Base: [auditoria de 26/10](../../pesquisas/2026-10-26-auditoria-seo-competitiva.md) e sua evidência HTTP. Na amostra, Telegram tem título genérico e três detalhes públicos; Discord está vazio e indexável; cruzamentos rede+nicho são `noindex`; adulto é `noindex,nofollow` e não entra no sitemap. A amostra não mede todo o inventário nem resultados do Google.

Search Console pelo GSC Wizard está indisponível por assinatura. Isso não bloqueia trabalho local, mas bloqueia conclusões sobre desempenho orgânico e exclusão de URLs. Não contratar ferramentas. Exportações ou acesso direto autorizado poderão suprir a medição.

## Abordagens e escolha

1. **Domínio atual, superfícies explícitas bem delimitadas:** preserva URLs e infraestrutura; exige projeções públicas seguras, identificação correta e cuidado com conteúdo misto. Escolhido pelo usuário, conforme resposta à pergunta sobre estrutura de +18.
2. **Subdomínio adulto:** separa superfícies e pode facilitar classificação, mas requer DNS, tenant/host, cookies, canonicals e migração; não escolhido. A recomendação do Google para sites com quantidade significativa de conteúdo misto deve ser reavaliada conforme o acervo crescer; outro host não garante classificação independente.

Não existe alternativa válida de simplesmente remover todos os `noindex`, expor conteúdo restrito no HTML e chamar isso de SEO profissional.

## Limites e invariantes

- Manter Next 15.5.28/React 19 e as dependências instaladas; sem bibliotecas, serviços ou geração paga novos.
- Preservar `/` como catálogo e `/divulgar` como aquisição; preservar cabeçalho, marca e URLs existentes.
- Publicação grátis e destaque pago mantêm todos os contratos, elegibilidade, prioridade e rotulagem. Compra de destaque não compra indexação ou posição no Google.
- Tenant, autorização, disponibilidade, banimento, verificação, consentimento, atribuição, surfaceToken, impressões e saídas mantêm significado.
- Aprovação editorial de SEO não publica um anúncio rejeitado nem contorna moderação. Não usar conteúdo de outros tenants, rascunhos, dados pessoais ou conteúdo não aprovado.
- Não publicar, fazer commit, push, migrar banco de produção ou modificar DNS sem pedido específico.
- Não confundir +18 com conteúdo sexual explícito: `requiresAge` também pode representar outra restrição. Marcação sexual depende de classificação própria.
- O pedido substitui a proibição anterior de indexar +18 para as páginas públicas elegíveis descritas aqui; não elimina a confirmação de idade para conteúdo restrito.

## Arquitetura das páginas

Uma URL canônica por intenção, mantendo caminhos atuais:

| Tipo | Intenção e comportamento |
| --- | --- |
| `/` | Descoberta geral de grupos, canais e links por categoria; marca e navegação para redes/nichos |
| `/rede/:rede` | Tipo de recurso correto para a plataforma: grupos/canais Telegram, grupos WhatsApp, servidores Discord etc. |
| `/nicho/:nicho` | Tema entre redes, com introdução útil e listagem real |
| `/rede/:rede/:nicho` | Nova coleção editorial de um cruzamento específico; habilitada somente com oferta e conteúdo próprios |
| `/link/:id` | Detalhe estável do anúncio; preservar ID e caminho de saída rastreado |
| `/divulgar` | Divulgar grupo, canal, perfil ou site gratuitamente; canonical próprio e sitemap |

### Encontrabilidade dos links individuais

Cada anúncio público elegível tem uma página de detalhe própria, rastreável e preparada para aparecer por seu nome e assunto. A página apresenta nome, descrição útil, rede, nicho, breadcrumbs e links relacionados relevantes, com title/H1/description, canonical estável, dados estruturados coerentes e presença no sitemap. URLs de categoria não substituem as páginas individuais.

Preservar `/link/:id`, inclusive os endereços existentes: não migrar em massa para slugs apenas por estética. O nome do anúncio e o tema são sinais editoriais da página; não colocar a mesma lista de palavras-chave em todos os títulos. Evitar competir com a própria categoria: detalhe responde pelo anúncio específico, categoria pela descoberta de opções.

Tokens de impressão/clique e parâmetros de chegada não criam versões indexáveis do mesmo detalhe. O clique para o destino continua usando o fluxo rastreado atual. No +18, a página individual só se torna elegível após aprovação de sua prévia pública e testes da proteção do conteúdo restrito; título ou resumo aprovados da categoria não bastam.

Critério de aceite: a URL individual pode ser descoberta por navegação HTML e sitemap, responde com estado HTTP correto e contém conteúdo público próprio no HTML renderizado. O teste comprova preparo para indexação, não que o Google necessariamente indexará ou posicionará aquele anúncio.

Não criar sinônimos como páginas duplicadas. Não publicar toda combinação de rede, nicho, cidade, idioma e formato. Perfis e coleções públicas de usuários já existentes continuam com seus contratos; não reaproveitar favoritos privados como base editorial de SEO.

As novas coleções rede+nicho são superfícies do catálogo, não coleções de favoritos de um usuário. Reutilizam consultas e critérios públicos, respeitando prioridade comercial da superfície atual. O contrato HTTP novo compõe a consulta existente, sem chamar manipuladores HTTP internamente nem duplicar SQL/ordenação.

## Política editorial e indexação

Separar três decisões: pode ser acessado, exige idade e merece indexação. Nenhuma delas concede permissão às outras.

**Proposta de elegibilidade inicial:** faceta ou coleção pública só entra no índice/sitemap se tiver ao menos um anúncio atualmente público e disponível e um texto editorial aprovado que explique aquela intenção. Um anúncio é suficiente para elegibilidade técnica, não para afirmar competitividade. O editor pode manter a página fora do índice; filtros arbitrários e ordenações continuam fora. Remover do sitemap e aplicar `noindex,follow` quando o inventário elegível zera. Página continua 200 com estado vazio útil; entidade inexistente ou privada continua indisponível/404 conforme contrato.

Para redes/nichos existentes, o resumo administrativo já é texto editorial controlado e deve ser revisado, sem geração automática em massa. Para coleções rede+nicho, guardar título, introdução, classificação e decisão editorial em configuração editorial do catálogo com escopo de tenant, seguindo o padrão de persistência existente; a implementação decide o menor armazenamento que mantenha unicidade, auditoria e isolamento. Não colocar preços, quotas ou regras de autorização nesse conteúdo.

Títulos e H1 deixam de ser apenas o nome da plataforma. Descrever intenção e conteúdo real. Exemplos: `Grupos e canais do Telegram | Tem Link Aqui`, `Grupos de WhatsApp por categoria | Tem Link Aqui`, `Servidores Discord por categoria | Tem Link Aqui`. Para plataformas sem semântica de grupos, usar nomes corretos como perfis, sites e canais. Não prometer atividade, verificação, segurança, quantidade de membros ou resultados sem evidência.

Toda coleção aprovada tem canonical próprio, título/H1 coerentes, introdução visível, breadcrumbs visíveis e dados estruturados correspondentes. Busca interna, combinações não aprovadas e filtros mantêm `noindex`. Campos editoriais não podem conter HTML executável.

## +18: exposição pública e acesso restrito

### Classificação

Manter `requiresAge` para a regra de acesso e introduzir classificação explícita independente para a projeção SEO. Classificação sexual explícita deve ser controlada editorialmente, com auditoria. Não inferir sexualidade somente por idade, nome cadastrado ou palavra-chave. Enquanto não houver classificação, não liberar SEO adulto automaticamente. Classificação positiva de um item propaga às coleções/listagens que o expõem; uma categoria de apostas não recebe `rating=adult` apenas pela idade.

### Conteúdo visível sem confirmar idade

Publicar uma apresentação editorial não gráfica da categoria/coleção: título, finalidade, tipo de comunidades, como participar e aviso de idade. Ela precisa ser útil por si mesma, e igual para usuário e crawler, sem detecção de bot.

Cards de detalhes adultos só podem aparecer nessa projeção quando houver título e resumo públicos especificamente revisados para a prévia, diferentes dos campos restritos quando necessário. Antes da revisão, a coleção pode explicar seu conteúdo, mas não inclui automaticamente nomes, imagens, descrições ou contagens que exponham anúncios restritos. Não inventar grupos ou listas vazias para captar palavras-chave. Uma coleção sem material público suficiente permanece sem indexação até curadoria.

### Conteúdo após confirmar idade

Listagem completa, mídia e caminhos de participação continuam condicionados à idade e à disponibilidade. Sem confirmação ou com recusa, respostas HTTP, HTML, payload React/RSC, Open Graph, JSON-LD e pré-carregamentos não podem carregar mídia explícita, convites diretos ou descrições restritas escondidas por CSS/estado React.

Reutilizar o diálogo e fluxo de confirmação, mas a projeção restrita deve ser resolvida pelo servidor. O cookie de idade conserva apenas seu papel de autodeclaração, não autenticação ou autorização. Não criar exceção de User-Agent para Googlebot. Respostas que variam por idade precisam de cache privado/sem armazenamento ou chave de cache correta; um cache nunca serve o conteúdo confirmado a um visitante sem confirmação.

### Detalhes individuais adultos

Para competir também com detalhes, adicionar prévia editorial opcional por anúncio: título público e resumo público, revisão e classificação. Disponibilidade/status/tenant permanecem verificações obrigatórias. Sem prévia aprovada, o detalhe adulto continua `noindex`; com prévia, título/H1/resumo e canonical públicos podem ser indexáveis, enquanto conteúdo restrito só é carregado após confirmação. Alterar o conteúdo/classificação do anúncio invalida a revisão da prévia até nova conferência. Não permitir que edição do usuário revalide a própria prévia.

O sitemap inclui somente as URLs adultas com prévia/editorial elegíveis. O resumo de categoria não torna todos os seus anúncios indexáveis. Dados estruturados públicos descrevem a prévia visível, sem serializar campos restritos.

Para a elegibilidade de coleções adultas, contar somente anúncios com prévia pública aprovada e ainda disponível. Contagens internas de itens restritos podem orientar o administrador, mas não são publicadas como prova de oferta pública. A mesma coleção não fica elegível apenas porque um visitante confirmou a idade: SEO e sitemap usam a projeção anônima estável.

O fluxo de revisão reaproveita autenticação administrativa, auditoria e padrões de validação existentes. Somente administrador ativo do tenant aprova ou revoga a prévia/classificação; o anunciante não recebe novo privilégio. Aprovação fica ligada à versão dos campos de nome, descrição, rede, nicho e mídia aprovados. Mudança desses campos invalida a prévia; indisponibilidade ou banimento a remove imediatamente da projeção. Reativação não recupera uma revisão invalidada. Edições sem efeito no conteúdo público não exigem revisão artificial.

Aplicar `meta name="rating" content="adult"` nas superfícies classificadas como sexualmente explícitas, inclusive diretórios que encaminham a esse conteúdo. Não aplicar globalmente na home ou em categorias sem conteúdo explícito. SafeSearch e classificação do domínio continuam controlados pelo Google; manter a área adulta organizada não garante alcance nas buscas gerais.

**Composição das superfícies gerais (proposta do agente):** home, rede e nichos gerais, na representação anônima ou com recusa de idade, exibem somente anúncios não restritos. Prévias adultas aprovadas ficam nas páginas adultas específicas; não são injetadas na home nem no hub genérico de Telegram para aumentar palavras-chave. A navegação pode indicar a seção +18 por rótulo não gráfico. Após confirmação, as superfícies mistas preservam o comportamento e a prioridade comercial autorizados, sem transformar a confirmação em filtro SEO. Se essa representação exibir conteúdo sexual explícito, recebe a marcação adulta correspondente e não pode vazar por cache; isso não impõe a marcação à representação anônima que não o exibe. Não haverá versão especial para crawler. O Google ainda pode classificar superfícies e o domínio conforme os links e conteúdo que encontrar.

### Operação editorial incluída na entrega

**Proposta do agente:** ampliar o painel administrativo existente, sem scripts obrigatórios ou edição manual de banco como produto final. Em `/admin/configuracoes`, aproveitar a administração de facetas para revisar textos/classificação/elegibilidade e adicionar gestão das coleções rede+nicho. Em `/admin/moderacao`, incorporar ao detalhe do anúncio publicado os campos de prévia pública, estado da revisão, aprovação e revogação. A implementação pode extrair componentes locais, mantendo as rotas conhecidas.

Somente admin ativo do tenant cria, aprova ou retira os conteúdos editoriais. A primeira versão não oferece submissão de prévias pelo anunciante nem geração por IA. Alterações de texto invalidam a aprovação anterior; salvar rascunho não publica. A tela mostra por que uma página não está elegível: sem inventário, sem texto aprovado, classificação pendente, prévia desatualizada ou decisão editorial de exclusão. Não duplicar a decisão no frontend. Testar que admin de outro tenant, papel em cookie e usuário comum não executam essas ações.

## Rastreamento, paginação e canonicalização

- Navegação por links HTML descritivos entre home, redes, nichos, coleções e detalhes, sem exigir clique em botão para descobrir o restante do acervo.
- Paginação server-rendered na home, facetas e coleções. “Mostrar mais” pode permanecer como melhoria de interação, com link HTML equivalente e URL navegável.
- Preservar separação e ordem comercial de patrocinados/orgânicos. O cursor deve continuar ligado a tenant, filtros, superfície e idade. Mudança de idade reinicia cursor; cursor incompatível não pode vazar conteúdo ou misturar resultados.
- Definir URLs navegáveis de sequência e canonical próprio por página; não apontar indiscriminadamente todas as páginas para a primeira. A implementação escolhe cursor ou outra representação estável após verificar determinismo do ranking; não inventar paginação por offset que quebre o contrato atual.
- Canonical de coleção editorial aponta para a coleção. Filtro equivalente continua fora do índice, com canonical coerente para a coleção somente quando forem equivalentes. Filtros distintos não devem todos alegar equivalência à primeira página.
- `/go`, `/r`, tokens de superfície, parâmetros de campanha e URLs internas nunca são promovidos como URLs canônicas de conteúdo.
- Sitemap vem da mesma decisão de elegibilidade da resposta pública, sem campos restritos ou atualizado em toda requisição. Particionar quando o limite real exigir; o cap atual de 49 mil links não é gargalo comprovado e não exige infraestrutura preventiva.

## Conteúdo, confiança e crescimento

Revisar toda a taxonomia existente por intenção e oferta, não apenas Telegram. Usar o mesmo contrato em todas as redes, com vocabulário correto por plataforma. Priorizar lotes que já possam entregar valor; categorias sem oferta precisam de aquisição, não páginas repetidas.

Cada rede ganha introdução própria e orientação útil sobre encontrar e participar, compatível com o produto. Cada nicho explica seus tipos de conteúdo. Não publicar data de atualização fictícia nem “links verificados” sem rotina e evidência correspondentes. Guias editoriais só devem existir quando responderem dúvidas reais e encaminharem a coleções úteis; blog automático não é requisito do primeiro lote.

Preservar denúncia, indisponibilidade e retirada de conteúdo. Backlinks devem ser legítimos: administradores compartilhando a página de seu grupo e referências editoriais pertinentes. Sem compra, spam, raspagem do concorrente ou promessas de “autoridade” fabricada.

Reconciliar a descrição de análise humana de `/divulgar` com a automação condicional já existente antes de reescrever essa promessa. Não alterar o fluxo de moderação por causa do texto.

## Entregas e ordem

1. **Fundação profissional:** contrato de elegibilidade, títulos/H1/introduções, canonical de `/divulgar`, consistência entre metadata/sitemap e estados vazios. Reconciliar documentação antiga; testar isolamento e regressões.
2. **Catálogo navegável:** paginação SSR e ligações internas. Inspecionar o DOM real da home antes de corrigir suposto H1 duplicado observado apenas no HTML com streaming.
3. **Piloto +18 completo:** classificação, prévias públicas aprovadas, projeção restrita no servidor, markup adulto, sitemap e testes de vazamento/cache. Adulto permanece excluído até esses requisitos estarem implementados e verificados juntos.
4. **Coleções rede+nicho:** catálogo editorial controlado, rotas específicas, piloto com inventário e textos reais, expansão para redes/nichos elegíveis. Revisar oferta adulta e geral sem dados inventados.
5. **Qualidade e acompanhamento:** medir laboratório mobile com condições reproduzíveis, Core Web Vitals de campo quando disponíveis e dados Search Console por rede/nicho; ampliar conteúdo e relações editoriais legítimas.

A ordem respeita as dependências de segurança e infraestrutura, mas a seleção editorial do piloto prioriza adulto e apostas. Detalhes individuais não restritos entram já na fundação; detalhes adultos entram no mesmo lote das prévias adultas, sem adiar o SEO individual para uma fase indefinida. As verticais não restritas continuam sendo implementadas e verificadas em cada contrato compartilhado.

Cada lote precisa funcionar e ser validado antes do próximo; não declarar o programa inteiro concluído ao terminar o primeiro. O pedido de melhoria não autoriza publicação em produção, assinatura ou mensagens a administradores de grupos.

## Alcance técnico confirmado

- Backend: `domain/catalog/index-policy.ts`, `http/controllers/@Catalog/routes.ts`, `http/controllers/@Links/routes.ts`, `repositories/links-repository.ts`, `http/sitemap-index.ts`, consultas de catálogo, projeção de mídia, consumidores administrativos e respectivos testes.
- Frontend: `domain/crawler-policy.ts`, rotas home/rede/nicho/link/divulgar, `features/catalog/server/load-link.ts`, `components/domain/facet-catalog.tsx`, paginação e componentes existentes de idade; metadados/JSON-LD e seus consumidores/testes.
- Persistência: adições mínimas para classificação e prévias/revisão. Não alterar o catálogo inteiro, migrações preexistentes de laboratório de produtos ou dados em produção. Migração local de teste é permitida no ambiente isolado conforme setup; rollout produtivo é separado.
- Os campos restritos de `getPublicLink` e `loadPublicLink` hoje chegam ao frontend antes de `AgeWall` renderizar. A implementação precisa verificar e corrigir projeção/RSC ao introduzir prévias; ocultar no cliente não é prova de proteção.
- Reaproveitar componentes e organização do projeto; regras puras no domínio, transporte e sessão nas camadas existentes. CSS Modules só onde houver composição nova/migrada, sem redesign global.
- Consultar Taste, Impeccable e Emil antes de alterar composição/interação; temlink-icons se houver mudança de ícones. Este desenho não escolhe uma nova identidade visual.

## Testes e aceite

Antes de implementar cada comportamento novo, teste que demonstre o contrato. Cobertura mínima:

1. Meta robots/canonical e sitemap concordam para página elegível, vazia, desabilitada, filtro e coleção.
2. Texto editorial não é interpretado como HTML; metadata/JSON-LD não permitem injeção.
3. Outro tenant, rascunho, banimento, link indisponível e prévia revogada não aparecem no índice público.
4. +18 sem cookie, com recusa e com confirmação; nenhuma mídia/convite/texto restrito em resposta pública, HTML/RSC ou caches; confirmação não contorna moderação.
5. Restrição não sexual não recebe markup sexual; coleção com item sexual recebe classificação correta.
6. Prévia aprovada permite detalhes elegíveis; edição relevante invalida revisão; sitemap reage à retirada/banimento.
7. HTML oferece caminho para resultados seguintes; cursor inválido, outra idade e outro tenant não funcionam como atalho.
8. URLs/ações de patrocínio, impressões, surfaceToken, saídas e consentimento mantêm contratos.
9. Desktop/mobile, teclado, foco do diálogo, recusa, navegação e layout com textos longos inspecionados em navegador real. Renderização inicial sem JavaScript contém apresentação pública útil.

Executar lint, typecheck, testes afetados e build em backend/frontend; testes PostgreSQL quando a persistência mudar; Playwright Test nas jornadas alteradas e inspeção real. Ler setup/teardown e verificar portas 3000/3333/4099, PostgreSQL/Redis de teste; não encerrar processos alheios. Não usar produção como fixture.

Registrar medições LCP/INP/CLS separando laboratório de dados de campo. Comparar mesmo ambiente antes/depois; não alegar aprovação de Core Web Vitals com Lighthouse isolado. Custo de manutenção de conteúdo e inventário faz parte do programa, sem automação recorrente contratada por este desenho.

## Mensuração, limites e reversão

Sucesso técnico: URLs úteis elegíveis, crawl consistente, conteúdo público correto, proteção de idade efetiva e navegação completa. Resultado orgânico: impressões e cliques não relacionados à marca, CTR e posições por consulta/rede/nicho, índice real e acessos úteis. Comparar períodos e dispositivos equivalentes; não transformar ausência de `site:` em diagnóstico de desindexação.

Sem Search Console, registrar implementação verificada e métricas disponíveis, deixando desempenho orgânico pendente. Não há garantia de dominar todas as buscas. SafeSearch limita conteúdo explícito; baixa oferta, links inválidos e ausência de referências legítimas não são corrigidos apenas por tags.

Reversão por lote, preservando URLs existentes e dados de usuários. Para prévias adultas, desabilitar elegibilidade retorna `noindex`/retirada do sitemap sem apagar anúncios ou remover proteções de idade. Migração reversível lógica deve preservar dados; não fazer rollback destrutivo automático. Nenhum deploy implícito.

Fontes: [guia SEO](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [conteúdo útil](https://developers.google.com/search/docs/fundamentals/creating-helpful-content), [conteúdo explícito](https://developers.google.com/search/docs/specialty/explicit/guidelines), [paginação](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading), [spam](https://developers.google.com/search/docs/essentials/spam-policies), [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals).

## Revisão do desenho

Uma revisão independente de planejamento identificou três pontos: composição das páginas gerais ao incluir adulto, mínimo de prévias para coleções adultas e interface de operação. As decisões acima os resolvem como propostas do agente: projeção anônima geral sem anúncios restritos, mínimo de uma prévia adulta aprovada e extensão das telas administrativas existentes. A revisão não validou código executável, ranking ou produção; desenho permanece pendente de aprovação do usuário.
