# Auditoria SEO competitiva — Tem Link Aqui

Data: 26/10/2026. Escopo: análise do código atual, HTTP público sem cookies, sitemap, concorrente Telegrupos e documentação oficial do Google. Pedido: competir por buscas de plataformas, nichos e categorias. Nenhuma mudança de aplicação, regra comercial ou publicação foi realizada.

## Diagnóstico

O Tem Link Aqui tem fundamentos técnicos úteis, mas a apresentação editorial e a arquitetura atual não cobrem bem as intenções específicas de busca. Não há evidência suficiente para atribuir a diferença de posições a uma causa única. Primeiro lugar, prazo para alcançá-lo e “SEO perfeito” não são resultados garantíveis.

A captura enviada mostra uma busca com resultados adultos. Ela não prova a posição nacional do concorrente para “telegram grupos” ou “telegram links”. O link share.google não pôde ser aberto pelo mecanismo de pesquisa; o domínio telegrupos.com.br foi identificado pela captura e inspecionado diretamente.

O acesso ao GSC Wizard retornou `payment_required` / `subscription_required`. Não foi contratada assinatura nem alterada configuração. Sem dados reais do Search Console, não se conhecem impressões, cliques, CTR, posição, canonical escolhido pelo Google, exclusões, ações manuais ou desempenho por consulta. Exportações do Search Console podem suprir essa ausência sem contratar o plugin.

## Evidência pública

Coleta reproduzida em [http-audit.json](evidencias/seo/2026-10-26/http-audit.json). São respostas HTTP e HTML bruto com streaming, sem renderização de navegador. Contagens de links são URLs distintas de detalhes no HTML recebido; não medem todo o inventário nem a indexação do Google.

| Superfície | Observado | Interpretação |
| --- | --- | --- |
| `/` | 200; title `Tem Link Aqui`; canonical próprio; `index, follow` | Marca bem definida, título pouco descritivo para descoberta genérica |
| `/rede/telegram` | 200; title `Telegram \| Tem Link Aqui`; H1 Telegram; `index, follow`; 3 URLs de detalhes | Página existente, mas título não explicita grupos/canais; inventário inicial público pequeno na amostra |
| `/rede/whatsapp` | 200; title `Whatsapp \| Tem Link Aqui`; 12 URLs de detalhes | Potencial de busca; resumo menciona um único grupo, incompatível com a amplitude sugerida pela listagem atual |
| `/rede/discord` | 200; `index, follow`; 0 URLs de detalhes | Validar inventário e aplicar critério editorial antes de promover página vazia |
| `/nicho/tecnologia-internet` | 200; canonical próprio; `index, follow`; 5 URLs de detalhes | Nicho geral existente; não equivale a uma coleção específica de Telegram |
| `/rede/telegram?nicho=tecnologia-internet` | 200; `noindex, follow`; canonical em `/rede/telegram`; 0 URLs de detalhes | O cruzamento não disputa uma intenção própria no índice; neste exemplo também faltam resultados públicos |
| `/nicho/adulto` | 200; `noindex, nofollow`; sem JSON-LD | Exclusão intencional, confirmada no código |
| `/divulgar` | 200; título próprio; nenhum canonical encontrado | Oportunidade técnica na aquisição, separada do catálogo |
| URL inexistente de controle | 404 | A amostra não apresentou soft 404 nessa rota |
| HTTP e `www` | Destino final HTTPS sem `www` | Convergência observada; a coleta não registrou cada salto ou código intermediário |
| `/robots.txt` | 200; catálogo permitido; áreas privadas bloqueadas; sitemap declarado | Não apareceu um bloqueio global do catálogo |
| `/sitemap.xml` | 200; 182 URLs: 139 links, 24 nichos, 16 redes, home e 2 legais | Disponibilidade comprovada; envio, leitura e indexação pelo Google não comprovados |

O HTML bruto da home contém duas ocorrências de H1 e JSON-LD. Como há streaming e fallback, isso precisa de inspeção do DOM após renderização. Não foi classificado como duplicação visível ou penalidade.

Dois detalhes recentes do sitemap responderam 200 com canonical próprio e `index, follow`. Um título é muito longo e outro tem erro de redação; a amostra indica necessidade de qualidade editorial do conteúdo publicado, sem justificar alterar automaticamente anúncios de usuários.

## Achados por prioridade

### Alta: títulos e cabeçalhos descrevem a plataforma, sem explicitar a intenção

Fonte: `backend/src/domain/catalog/index-policy.ts`, funções `documentTitle` e `facetBlurb`; `backend/src/http/controllers/@Catalog/routes.ts`, `homeTitle` e `heading`; `frontend/src/features/catalog/server/home-page.tsx`.

Hoje rede/nicho recebem título a partir do nome cadastrado. A home foi desenhada para a marca, conforme a especificação anterior. A nova ambição pede reconciliar essa direção com descoberta por tema; não tratar a mudança como simples correção de bug.

Propostas editoriais, sujeitas ao inventário real:

| URL existente | Intenção principal | Título proposto |
| --- | --- | --- |
| `/` | Catálogo de comunidades e links | Grupos, canais e links por categoria \| Tem Link Aqui |
| `/rede/telegram` | Encontrar grupos/canais e seus convites | Grupos e canais do Telegram \| Tem Link Aqui |
| `/rede/whatsapp` | Encontrar grupos de WhatsApp | Grupos de WhatsApp por categoria \| Tem Link Aqui |
| `/rede/discord` | Encontrar servidores | Servidores Discord por categoria \| Tem Link Aqui |
| `/nicho/tecnologia-internet` | Comunidades e links de tecnologia | Comunidades e links de tecnologia \| Tem Link Aqui |
| `/divulgar` | Publicar/divulgar gratuitamente | Divulgue seu grupo, canal ou site grátis \| Tem Link Aqui |

Discord só deve ser promovido quando entregar conteúdo útil. Ajustar H1, introdução e links internos de maneira coerente. A home continua catálogo; `/divulgar` continua aquisição. Não criar páginas separadas para cada sinônimo de “telegram grupos”, “grupos Telegram” e “links Telegram”.

### Alta: faltam coleções indexáveis para rede + nicho

Fonte: `getFacet` em `backend/src/http/controllers/@Catalog/routes.ts`; rotas `frontend/src/app/rede/[slug]/page.tsx` e `nicho/[slug]/page.tsx`.

O filtro atual recebe `noindex` e canonical na faceta geral. Isso controla duplicação e não é um erro por si só. Porém, não oferece uma página dedicada para “grupos Telegram de tecnologia”, por exemplo.

Proposta: coleções editoriais selecionadas, com URL própria e estável, conteúdo distinto, links reais e canonical próprio. Exemplos de formato a projetar: `/rede/telegram/tecnologia-internet` e `/rede/whatsapp/compras-ofertas-cupons`. Essas rotas ainda não existem; não são URLs prontas para divulgar.

Começar por combinações com oferta e demanda comprovadas. Não indexar todos os filtros, cidades, idiomas e combinações. Não duplicar a mesma coleção em duas hierarquias. Sem oferta suficiente, melhorar aquisição e conteúdo antes de criar a página.

### Alta: qualidade e atualização editorial precisam acompanhar o catálogo

Fonte: `facetIndexable` e `linkRobots` em `backend/src/domain/catalog/index-policy.ts`; sitemap e repositório.

A política atual permite indexação de facetas públicas não restritas sem exigir quantidade mínima ou texto substantivo. A especificação de 06/10 descreve uma régua antiga de três links ou resumo de 80 caracteres; ela não corresponde à implementação atual. Não restaurar essa regra silenciosamente. Quantidade de palavras e caracteres não é garantia de qualidade ou requisito universal do Google.

Criar um critério editorial explícito para coleções úteis: oferta disponível, propósito claro, descrições próprias, ausência de duplicação e convites utilizáveis. Página vazia precisa de tratamento coerente; eventualmente `noindex,follow` e exclusão do sitemap, sem mudar o status comercial dos anúncios.

O resumo de WhatsApp menciona um único grupo enquanto o HTML recebido contém 12 URLs de detalhes. Revisar textos presos ao inventário antigo. Acrescentar informações úteis sobre tema, formato e entrada nos grupos, sem inventar atividade, segurança, número de membros ou revisão humana.

### Média/alta: descoberta de resultados além da primeira página

Fonte: `frontend/src/components/domain/home-more.tsx`, `frontend/src/features/catalog/components/home-catalog.tsx`, `frontend/src/components/domain/facet-catalog.tsx`.

A home usa botão “Mostrar mais” com fetch. A faceta recebe uma primeira lista e não apresenta paginação nesse componente. Há sitemap para descoberta alternativa, portanto não se conclui que os itens restantes sejam inacessíveis ao Google. Ainda assim, falta navegação HTML entre páginas de resultados, reduzindo caminhos internos para o catálogo completo.

Projetar paginação navegável preservando ordenação, cursor, patrocínio e surfaceToken. Resolver canonicals e indexabilidade da sequência explicitamente; não apontar automaticamente todas as páginas equivalentes à primeira. O Google geralmente não aciona botões para carregar mais.

### Média: completar e validar metadados

Adicionar canonical consistente em `/divulgar` e avaliar sua inclusão no sitemap por ser uma aquisição pública permanente. Conferir breadcrumbs visíveis e JSON-LD correspondente, consistência dos detalhes e ausência de dados inventados. Já existem `WebSite`, `ItemList`, `CollectionPage` e `BreadcrumbList` no código: reutilizar antes de acrescentar marcações.

Schema ajuda a descrever conteúdo; não garante posição nem resultado enriquecido. Não adicionar avaliações, contagens, FAQ ou informações de organização fictícias.

### A medir: desempenho e autoridade

Não foram medidos Core Web Vitals de campo, Lighthouse, backlinks ou domínios de referência. Não existe base para afirmar que velocidade ou autoridade sejam a causa principal do ranking atual. Medir LCP, INP e CLS em mobile, por modelo de página, antes de prescrever reestruturação.

Trabalhar referências legítimas: administradores compartilhando suas páginas, parcerias editoriais pertinentes e comunidades que reconheçam o diretório. Não comprar backlinks, automatizar comentários ou copiar o catálogo concorrente.

## O que o Telegrupos oferece

Páginas examinadas: home, tecnologia e adulto. A home apresenta títulos explícitos sobre grupos/canais, navegação por temas, listagens, explicação de uso, links entre páginas e paginação HTML. A categoria tecnologia tem URL e título orientados a plataforma + tema. Essas características fundamentam oportunidades de relevância e descoberta para o Tem Link Aqui.

Isso não comprova a causa da posição do concorrente. A afirmação de operar desde 2020 e as promessas de revisão são declarações do próprio site, não fatos auditados. Não foram medidos inventário total, tráfego, backlinks, idade do domínio ou taxa de links válidos. A paginação exibida não foi convertida em estimativa de grupos.

## Adulto: decisão de produto separada

O código e a resposta pública mantêm adulto fora do índice e do sitemap. Otimizar título e description não supera essa exclusão. A regra vale com ou sem confirmação de idade na política atual.

O desejo de competir no exemplo +18 conflita com essa decisão anterior. Esta auditoria registra a divergência e preserva a regra. Se houver decisão explícita de disputar essas buscas, será necessário um desenho próprio que mantenha as proteções de idade, moderação, autorização e privacidade.

O Google recomenda identificação apropriada de conteúdo explícito e, quando há quantidade significativa de conteúdo misto, separação em domínio/subdomínio. Isso não torna outro host obrigatório nem autoriza migração automática. SafeSearch e intenção da consulta continuam limitando exposição. Não liberar conteúdo restrito apenas confiando em um User-Agent declarado como Googlebot.

## Sequência recomendada

1. **Base de medição:** obter Search Console por acesso disponível ou exportações; comparar consultas e páginas por Brasil/mobile e períodos equivalentes. Inspecionar URLs principais; confirmar canonical escolhido, sitemap lido e eventuais exclusões. Sem isso, não atribuir volumes ou posições.
2. **Primeiro lote de implementação:** títulos/H1/introduções de home, Telegram, WhatsApp e nichos com oferta; corrigir resumo desatualizado; canonical e sitemap de `/divulgar`; critério editorial para páginas vazias. Preservar URLs existentes e regras adultas.
3. **Navegação:** paginação rastreável e ligações descritivas entre redes, nichos e detalhes, sem alterar atribuição ou lógica comercial.
4. **Piloto de coleções:** selecionar poucas combinações com demanda e inventário, implementar páginas próprias e conteúdo útil. Manter filtros arbitrários fora do índice.
5. **Expansão:** ampliar acervo e referências legítimas, acompanhar convites indisponíveis e qualidade das descrições; expandir somente coleções sustentáveis.

Os indicadores são: páginas elegíveis efetivamente indexadas, impressões não relacionadas à marca, cliques, CTR, posição por grupo de consultas e acessos úteis ao catálogo. Separar redes/categorias e aquisição. Prazos de trabalho não equivalem a prazos de ranking.

## Alcance técnico e validação de implementação futura

Uma mudança completa alcançará política/títulos no backend, consumidores HTTP e testes de SEO, repositório/sitemap, rotas e componentes frontend, fixtures e testes E2E afetados. Novas coleções precisarão de contrato próprio antes de implementação. Não criar camadas ou dependências apenas para trocar textos.

Validar HTML e DOM renderizado, metadata/canonical/robots/sitemap, 404, filtros, paginação, SSR e JSON-LD; testar desktop/mobile e proteções de idade/tenant. Executar lint, typecheck, testes afetados, build e E2E da jornada implementada conforme AGENTS.md. Conferir portas e setup dos containers antes de E2E. Medir produção após publicação autorizada, sem prometer resultado antecipado.

## Fontes oficiais e concorrente

- [Guia SEO do Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide): elegibilidade, conteúdo e ausência de garantia de indexação.
- [Paginação e carregamento incremental](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading): links navegáveis e descoberta de resultados.
- [Políticas de spam](https://developers.google.com/search/docs/essentials/spam-policies): páginas de entrada, conteúdo em escala sem valor e links manipulativos.
- [Conteúdo explícito](https://developers.google.com/search/docs/specialty/explicit/guidelines): SafeSearch, marcação e organização de conteúdo misto.
- [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals): métricas e limites de boa experiência.
- [Telegrupos](https://telegrupos.com.br/), [tecnologia](https://telegrupos.com.br/categoria/grupos-telegram-tecnologia/) e [adulto](https://telegrupos.com.br/categoria/grupos-telegram-adulto/): observação comparativa, sem comprovação de métricas ou promessas do concorrente.

## Verificações e limites

Executados: consulta Graphify dirigida e confirmação no código; leitura do Git e instruções; HTTP público de 13 URLs na coleta persistida, robots e sitemap em coleta complementar; consulta pública do concorrente e documentação; tentativa de listar propriedades do Search Console. A análise local do grafo não enviou código a serviços externos; não houve reindexação por não haver mudança de código nesta tarefa.

Não executados: testes de aplicação, lint/build/E2E, inspeção visual de DOM, CrUX/Lighthouse, auditoria de backlinks ou URL Inspection do Google. Não necessários para declarar esta análise documental concluída; continuam necessários no escopo correspondente antes de validar uma implementação. A ausência do resultado em uma busca `site:` não foi usada para concluir desindexação.

Arquivos criados nesta tarefa: este relatório e `evidencias/seo/2026-10-26/http-audit.json`. Reversão: remover somente esses arquivos. Alterações preexistentes da árvore foram preservadas. Sem commits, branch, push, deploy, assinatura ou alteração de conteúdo do catálogo.
