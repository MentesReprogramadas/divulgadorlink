# Auditoria Pré-Marketing — Tem Link Aqui

Data da evidência: 9 de outubro de 2026.
Escopo: código, configuração e o que estava no ar em `https://temlinkaqui.com`.
Esta etapa não implementa correção e não cria campanha.

A campanha ainda não deve ir ao ar. O produto publica link de verdade, mas a página que o anúncio abriria vende outra coisa, expõe categorias que a Meta costuma recusar, e não guarda de onde veio o visitante. Sem isso, R$ 30 por dia compram clique, não aprendizado.

## A. Resumo executivo

**Preparação para aquisição paga: não pronta.** O diretório, a conta, a moderação e o destaque pago existem e estão ligados. O caminho do anúncio até uma publicação mensurável não existe.

**Os cinco maiores riscos de desperdiçar o orçamento**

1. A home diz “Encontre o que você procura.” O anúncio, se for para quem tem um link, promete o contrário. Não há chamada para divulgar no primeiro bloco.
2. Em 390px de largura, os primeiros nichos visíveis são Adulto 18+, Apostas e Ganhar Dinheiro. OnlyFans, Fansly, Fatal Model e Privacy aparecem em Redes. Isso é risco de reprovação da conta de anúncios, não só de estética.
3. `/privacidade` e `/termos` respondem 404. O cadastro exige nome, e-mail, telefone e senha sem aviso de privacidade.
4. Não há Meta Pixel, UTM persistida nem evento de cadastro, envio ou publicação. O Ads Manager veria clique. O banco não saberia quais contas vieram do anúncio.
5. O catálogo público tem um link (`VHG promo fitness #01`) e dezenas de nichos e redes indexáveis vazios. Quem chega para “ser encontrado” vê um diretório vazio. Não invente depoimento para tapar isso.

**O que já aguenta uso**

- Publicar é grátis no código: o pagamento só entra no destaque, e só com o link já `PUBLISHED`.
- Conta com sessão em cookie `HttpOnly`, CSRF nas mutações e e-mail obrigatório antes do envio.
- Toda submissão nasce `PENDING_MODERATION`. Aprovação e recusa disparam e-mail. Recusa libera a vaga.
- URL só entra como `https`, host privado é recusado, e `utm_`/`fbclid` saem da URL guardada.
- Patrocinado tem rótulo. Busca, painel e admin estão fora do índice. Há sitemap, canonical e `noindex` para faceta sem conteúdo próprio — a regra foi furada pelos resumos, ver C.

**Recomendação: lançar depois das correções, não agora e não “um testezinho”.** Um teste às cegas não mede publicação e pode queimar o ativo da conta de anúncios. As correções de bloqueio são cópia, ordem das categorias na URL do anúncio, páginas legais e atribuição no banco. Não é reescrita.

Ponto cego: R$ 30/dia não valida o marketplace. Valida se essa página convence alguém a mandar um link e se você consegue moderar no mesmo dia. Demanda (gente buscando link) continua zero. Tratar o teste como prova de que “o produto funciona” é o jeito mais rápido de concluir a coisa errada.

## B. Inventário do projeto

**Stack.** Monorepo. Frontend Next.js 15.5.26 e React 19, BFF em `/bff` para a API. Backend Fastify 5, Prisma 6, PostgreSQL, Redis e BullMQ. Auth JWT em cookie. E-mail via Resend. Destaque via Stripe e Woovi (Pix). Embeddings e texto de edição via OpenAI. Observabilidade HyperDX/OpenTelemetry. Produção atrás de Cloudflare e Railway (`x-railway-edge: gru1`). Domínio canônico `https://temlinkaqui.com`. HTTP redireciona para HTTPS. `www.temlinkaqui.com` não resolveu neste ambiente (curl exit 6). `divulguelinkaqui.com.br` também não; só aparece em `allowedDevOrigins`.

**Arquitetura.** Multi-tenant pelo host. O Next renderiza no servidor chamando a API. Quase toda página pública é `force-dynamic`, com `Cache-Control: private, no-store`.

**Rotas públicas.** `/` home, `/busca` (noindex), `/nicho/[slug]`, `/rede/[slug]`, `/link/[id]`, `/go/[id]` (redirect, noindex).

**Conta.** `/cadastro`, `/login`, `/esqueci-senha`, `/recuperar-senha`, `/painel`, `/painel/verificar`, `/painel/links/novo`, edição, contestação, destaque, pedidos, conta.

**Admin.** `/admin/visao`, moderação, planos, estornos, configurações. O middleware só esconde a UI; a API exige JWT de admin.

**Fluxo real de publicação.** Cadastro cria usuário e tenta enviar o código de e-mail. Sessão abre mesmo sem confirmar. `canSubmitLink` exige e-mail confirmado e conta `ACTIVE`. O telefone é obrigatório no cadastro e não entra nessa regra. Em produção o provedor de SMS é sempre “não selecionado”: o telefone não tem como ser confirmado. O formulário pede nome, descrição, URL, rede e nicho. A API grava `PENDING_MODERATION` e abre caso. Cota de 4 vagas ocupadas por dono (`LINK_QUOTA`). A resposta `runAi: true` não enfileira job nenhum. O handler `moderate-link` existe e não grava publicação. Quem publica é o admin. Aí o status vira `PUBLISHED` e sai e-mail. O destaque só é vendido depois disso.

**O que está ausente.** Landing de quem divulga. Texto de gratuidade. Política de privacidade e termos. Consentimento de cookies. Pixel, GTM, GA4, UTM. Checagem de URL viva (`safeFetch` só é usado em teste). Uso de `knownHosts` na submissão (o campo existe e o seed preenche; o `POST /links` não compara o host). Unicidade de URL. Job que apague analytics com mais de 12 meses ou pedido com mais de 5 anos: o prazo está no spec de LGPD e não há job.

**Analytics que existe.** Só impressão e clique de link no catálogo, em `AnalyticsEvent`, com deduplicação por sessão, link, superfície, dia e tipo. Dono e admin não contam. Não há evento de funil de aquisição.

## C. Matriz de problemas

| ID | Categoria | Gravidade | Confiança | Problema |
|---|---|---|---|---|
| P-01 | Conversão | Crítica | Alta | Home e anúncio falam com públicos diferentes |
| P-02 | Política de anúncio | Crítica | Alta | Categorias adultas e de aposta lideram a home |
| P-03 | Privacidade | Crítica | Alta | Sem política, sem termos, com dado pessoal obrigatório |
| P-04 | Mensuração | Crítica | Alta | Sem UTM, sem evento de publicação, sem pixel |
| P-05 | Confiança | Alta | Alta | Um link público e páginas de nicho vazias indexadas |
| P-06 | Conversão | Alta | Alta | Depois do cadastro o usuário cai no painel de métricas, não no formulário |
| P-07 | Produto | Alta | Alta | Telefone obrigatório e impossível de confirmar em produção |
| P-08 | Integridade | Alta | Alta | Rede escolhida não precisa bater com o host da URL |
| P-09 | SEO | Alta | Alta | Resumo longo torna faceta sem link indexável |
| P-10 | Conversão | Média | Alta | Sucesso do envio é a frase “Em revisão”, sem próximo passo |
| P-11 | Abuso | Média | Alta | O botão não trava durante o POST; dois cliques gastam duas vagas |
| P-12 | UX mobile | Média | Alta | Chip cortado (“Ganhar Dinhe”) e scroll horizontal sem barra |
| P-13 | SEO / ads | Média | Alta | Sem `og:image`; título do cadastro é só “Tem Link Aqui” |
| P-14 | Operação | Média | Alta | Publicação é manual; o código de autoaprovação não está ligado |
| P-15 | Segurança | Baixa | Alta | Sem CSP, HSTS, `X-Frame-Options` nem `Referrer-Policy` na resposta vista |

**P-01. Home vende busca, o anúncio venderia divulgação.** Evidência: `frontend/src/app/page.tsx` (h1 “Encontre o que você procura.”) e produção em 9 out 2026. O header oferece Busca, Entrar e Criar conta. Não existe “Divulgar” nem “Novo link” fora do painel. Impacto: o clique pago não encontra a ação que você quer pagar. Correção: uma URL só para o anúncio, com a frase para quem tem link, o que é aceito, que a publicação é grátis e passa por análise, e um único botão para `/cadastro` ou, se já logado, para `/painel/links/novo`. A home de descoberta pode ficar para orgânico. Validar: em 390px, a primeira tela mostra essa frase e o botão, sem precisar rolar até Explorar.

**P-02. A primeira impressão da home é conteúdo que a Meta restringe.** Evidência: `NICHE_LEAD = ['adulto', 'apostas', 'ganhar-dinheiro']` em `frontend/src/domain/facets.ts`. Snapshot e screenshot em 390px: Adulto 18+, Apostas e Ganhar Dinheiro são os três primeiros nichos. Redes incluem Fansly, Fatal Model, OnlyFans e Privacy. Apostas está no sitemap com `robots` `index, follow`. Impacto: o revisor do anúncio não precisa sair da primeira dobra para ver aposta e adulto. Correção mínima: na URL usada no anúncio, não listar nicho `requiresAge`, nem Apostas, nem “Ganhar Dinheiro” na ordem de destaque. Não apague o catálogo inteiro por causa do anúncio; separe a vitrine do anúncio da vitrine geral. Custo oculto: esconder na home e deixar a URL `/nicho/apostas` no mesmo domínio ainda pode ser seguida. Para o primeiro teste, a landing do anúncio não deve linkar essas facetas. Validar: snapshot da URL do anúncio sem esses nomes acima da dobra e sem link direto para elas.

**P-03. Coleta de dado sem página legal.** Evidência: `GET /privacidade` e `GET /termos` = 404. `frontend/src/app/cadastro/page.tsx` exige os quatro campos e não cita política. O spec `docs/superpowers/specs/2026-09-29-lgpd.md` descreve prazos e anonimização; a exclusão de conta existe (`anonymize-account`); a página para o titular não. Impacto: LGPD na coleta e exigência prática da Meta para veicular. Correção: duas páginas curtas, link no cadastro, contato e o que já é verdade (e-mail, telefone, hash de senha, analytics de sessão sem IP, pedido por 5 anos, analytics por 12 meses, exclusão anonimiza). Não copie política genérica que prometa o que o código não faz, inclusive o job de expurgo, que não existe. Validar: as duas URLs 200, noindex ou index conforme você queira, e o cadastro só envia com o link visível.

**P-04. O gasto não fecha com uma publicação.** Evidência: busca no frontend por `fbq`, `gtag`, `GTM-`, pixel e `utm_` não achou nada. `canonical-url.ts` remove `utm_` e `fbclid` da URL do link e não grava em outro lugar. `AnalyticsEvent` só tem impressão e clique. Impacto: depois de uma semana você terá o custo no Gerenciador e, no banco, cadastros e links sem origem. Correção: gravar no servidor o primeiro toque (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`) na conta, no momento do cadastro, e copiar para o link no envio. Eventos internos na tabela que você já consulta, não só no navegador. Pixel só depois de P-03 e de um aviso de consentimento. A conversão que importa para o negócio é a mudança para `PUBLISHED`, disparada uma vez no servidor, com `event_id` estável. Validar: duas contas de teste, uma com UTM e outra sem; só a primeira aparece no recorte do anúncio; recarregar a tela não duplica a linha.

**P-05. A promessa “seja encontrado” não tem catálogo.** Evidência: sitemap de produção em 9 out 2026, `GET` 200, 42 URLs: home, 24 nichos, 16 redes e 1 link. `/nicho/apostas` e `/nicho/jogos` estão `index, follow` e mostram “Nenhum link publicado”. A home tem um orgânico. O `lastmod` da home é a hora do request (`sitemap-index.ts` usa `new Date()`). Impacto: confiança na hora do clique e, em paralelo, um domínio que o Google pode encher de página fina. Correção: faceta só entra no sitemap e em `index` com um mínimo de links úteis (a regra dos 3 já existe em `facetIndexable` e perde para resumo com 80+ caracteres). Não indexe página vazia para “não parecer abandonado”; página vazia indexada é pior. O link `VHG promo fitness #01` parecia item de teste na leitura de 9 out 2026. Correção do dono, na mesma noite: não é teste e permanece no ar. Nenhuma etapa pode despublicá-lo. Validar: sitemap sem nicho de contagem zero. A home pode continuar mostrando esse link.

**P-06. O cadastro não entrega o formulário.** Evidência: `cadastro/page.tsx` faz `window.location.assign('/painel')`. O painel abre `UserDesk` (métricas, cliques, atenção, pedidos). “Novo link” fica no canto. Impacto: passo extra justo depois do esforço de criar senha. Correção: se `canSubmit` for falso, ir para `/painel/verificar`; se for verdadeiro, ir para `/painel/links/novo`. Validar os dois destinos.

**P-07. Telefone é atrito sem função.** Evidência: `registerBodySchema` exige `phone` com mínimo 8. `canSubmitLink` só olha e-mail e status. `confirmationProviders` usa `UnselectedConfirmationProvider` para `PHONE` sempre que `NODE_ENV=production`. O número entra na pré-recusa de banidos, mas sem confirmação qualquer um digita o telefone de outro. Impacto: campo a mais no mobile, dado pessoal a mais, ban key fraca. Correção: tirar o telefone do cadastro até existir SMS de verdade. Custo de mantê-lo: toda campanha paga um abandono que não compra segurança. Validar: cadastro com três campos publica depois do e-mail; ban por telefone deixa de ser prometido até a verificação existir.

**P-08. Qualquer URL em qualquer rede.** Evidência: `knownHosts` está em `initial-facets.ts` e no seed. `createLink` não lê esse campo. Impacto: Instagram com URL de outro site passa e só cai se um humano pegar. Com anúncio, a fila enche de lixo e o catálogo mente. Correção: se a rede tem `knownHosts`, o host da URL tem de ser um deles ou um subdomínio. Rede `site` e `outro` continuam abertas; `outro` já vai para moderação sem IA. Validar: `https://instagram.com/...` em Telegram retorna 422 com mensagem que diz qual rede usar.

**P-09. Resumo virou atalho de indexação.** Evidência: `facetIndexable` retorna verdadeiro se o resumo tem pelo menos 80 caracteres, mesmo com zero links. `summaryToApply` grava exatamente esses textos. O sitemap de produção lista os nichos com `lastmod` em 2026-10-09T03:17, em lote. Impacto: o cuidado de não indexar diretório vazio foi desfeito no dia em que os resumos entraram. Correção: resumo melhora o texto; não autoriza `index` sozinho. Exigir também o mínimo de links substantivos. Validar: nicho com resumo e zero links fica `noindex,follow` e some do sitemap.

**P-10. “Em revisão” não distingue as etapas.** Evidência: `painel/links/novo/page.tsx` mostra “Publicado” se o POST já vier `PUBLISHED`, e “Em revisão” no resto. O `POST` nunca devolve `PUBLISHED` (`decideSubmission`). O e-mail posterior existe (`moderationEmail`), mas a tela não avisa isso nem leva aos links do painel. Impacto: a pessoa não sabe se enviou, se está na fila ou se já está no ar. Correção: uma tela de enviado com status, “a análise é manual”, “você recebe e-mail” e link para a lista. Não chame isso de publicação. Validar: o POST 201 não usa a palavra Publicado.

**P-11. Duplo envio.** O botão de cadastro e o de envio não desabilitam enquanto a request corre. Não há chave de idempotência no link. Duas vagas, dois casos. Correção: desabilitar no submit e recusar a mesma URL canônica já ocupada por link ativo do mesmo dono, ou de qualquer dono, se a regra de negócio for uma ficha por URL. Validar: dois cliques rápidos geram um registro.

**P-12. Mobile corta o chip.** Em 390px não houve scroll da página (`scrollWidth === clientWidth`), mas `.facet-line` é `flex-wrap: nowrap` com `overflow-x: auto` e scrollbar escondida. O screenshot mostra “Ganhar Dinhe”. “Ver mais” existe, abaixo, e abre o restante. Impacto: rótulo quebrado na primeira dobra do tráfego de Instagram. Correção: quebrar linha no mobile ou ellipsis com nome acessível completo. Não é o bloqueio principal; P-02 é.

**P-13. Compartilhamento pobre.** `metadataFromSeo` manda título, description, canonical e Open Graph sem imagem. Cadastro herda o título genérico e está `noindex`, o que está certo para indexação e ruim se o anúncio cair nessa URL sem contexto. Correção: `og:image` estável na URL do anúncio. Não bloqueia o teste se a URL do anúncio tiver título e texto próprios.

**P-14. Moderação automática é código morto.** `runAi` volta no JSON e nenhum `queue.add('moderate-link')` existe. O worker só devolve `PUBLISH` ou `ADMIN` a partir de um veredito que o job precisaria trazer pronto. Edições de texto publicado usam `text-proposed` de verdade. Impacto: se ninguém olhar a fila, o anúncio gera “Em revisão” eterno. Não ligue a IA às pressas para “destravar” o teste: o handler não publica e um atalho aqui coloca spam no único catálogo que você tem. Correção de processo: SLA visível (mesmo dia) e um aviso interno quando abrir caso. Automação fica para quando houver volume e uma suíte que prove a transição de status.

**P-15. Headers.** A resposta de `https://temlinkaqui.com/` não trouxe HSTS, CSP, `X-Frame-Options` nem `Referrer-Policy`. `x-powered-by: Next.js` está presente. Não é o que impede o anúncio. Vale fechar antes de crescer o tráfego. CSRF, cookie de sessão e o fato de `catalogo_role` não autorizar admin estão implementados e cobertos por teste.

Não tratei como defeito: pagamento de destaque, rótulo Patrocinado, noindex de `/busca`, redirect `/go` só para a URL já armazenada, e a cota que libera vaga na recusa (`occupiesSlot: false` em `decideCase`).

## D. Jornada do usuário

Anúncio → `https://temlinkaqui.com/` → lê “Encontre o que você procura.” → busca ou explora nicho vazio → se insistir, “Criar conta” no header → nome, e-mail, telefone, senha → e-mail de código → `/painel` (métricas zeradas) → aviso para verificar, se o e-mail ainda não confirmou → `/painel/verificar` → `/painel/links/novo` → nome, descrição, URL, rede, nicho → “Em revisão” → espera humana → e-mail “Link publicado” ou “Link não publicado”.

| Etapa | O que a pessoa vê | Fricção | Evento hoje |
|---|---|---|---|
| Chegada | Home de busca, chips de adulto e aposta, um link | Promessa errada | Nenhum |
| Cadastro | 4 campos, sem preço, sem política | Telefone inútil, sem trava de duplo clique | Nenhum |
| Verificação | Código de 6 dígitos | Spam sem orientação; se o Resend falhar, a conta pode existir e a tela dizer que não criou | Nenhum |
| Formulário | 5 campos, URL só https | Rede livre, sem limite de 4 explicado | Nenhum |
| Enviado | “Em revisão” | Não diz que falta um humano | Nenhum |
| Publicado | E-mail, se o envio funcionar | Fora da sessão do anúncio | Nenhum |

Interrupção: a sessão persiste (refresh 7 dias, access curto com refresh no BFF). Dá para voltar. O rascunho do formulário não é salvo: sair no meio perde o texto. Não há `DRAFT` nesse fluxo; o status existe no enum e o envio não grava rascunho.

A gratuidade não está escrita. Está implícita porque ninguém cobra antes. Quem tem medo de golpe lê o silêncio como cobrança escondida. Diga “publicar é grátis; destaque é pago e só depois de aprovado” na URL do anúncio, antes da senha.

## E. Plano mínimo de analytics

Fonte da verdade: o banco. Pixel é espelho, depois do consentimento. Com R$ 30/dia a otimização automática da Meta em cima de publicação não vai sair da fase de aprendizado. Você calcula custo por publicação na mão. Não invente meta de CPA.

| Evento | Quando dispara | Onde | Parâmetros | Deduplicação |
|---|---|---|---|---|
| `PageView` | HTML da URL do anúncio | cliente, após consentimento, se houver pixel | `page_path`, `utm_*` já gravados | uma vez por carregamento, `event_id` = sessão + path + minuto |
| `ViewContent` | nicho, rede ou detalhe com conteúdo de verdade | cliente | `content_type`, `content_id` (slug ou id do link) | não disparar em página vazia |
| `CompleteRegistration` | `POST /auth/register` retornou 201 e a sessão gravou | servidor | `user_id` interno, UTM do primeiro toque | `event_id` = id do usuário |
| `StartLinkSubmission` | abertura de `/painel/links/novo` com e-mail confirmado | cliente ou servidor no GET autenticado | `user_id` | uma vez por usuário por dia |
| `SubmitLink` | `POST /links` 201 e status `PENDING_MODERATION` | servidor | `link_id`, `niche_slug`, `network_slug` | `event_id` = `link_id` |
| `LinkApproved` | admin aprova e o status passa a `PUBLISHED` | servidor, na mesma transação da decisão | `link_id` | `event_id` = `link_id` + `:published` |
| `LinkPublished` | o mesmo instante de `LinkApproved` para link que nunca tinha ido ao ar | servidor | igual | o mesmo `event_id` de `LinkApproved` |

`LinkPublished` é a conversão principal. `SubmitLink` é diagnóstico. Não mapeie os dois para o mesmo evento da Meta. Se usar Pixel e Conversions API, os dois mandam o mesmo `event_id` e a Meta deduplica. O disparo de publicação não pode estar na tela do usuário: ele não está no site quando o admin aprova.

Não enviar: e-mail, telefone, nome, senha, URL completa, texto do link, IP. `content_id` opaco basta. E-mail com hash só se um dia houver correspondência avançada e consentimento explícito. Fora do primeiro teste.

UTM: cookie de primeiro toque, `SameSite=Lax`, lido no cadastro e copiado para o usuário. Login no meio do caminho não pode apagar. Hoje o refresh de sessão não carrega campanha.

Conferência: por dia, `COUNT` de links que viraram `PUBLISHED` com UTM do anúncio contra eventos `LinkPublished` recebidos. Divergência acima de zero é bug de dedupe ou de perda, não “atribuição de janela”.

Validação: duas contas, UTM distinta, um envio, uma aprovação, uma recusa. A recusa não gera `LinkPublished`. Recarregar o admin não gera segunda linha. No Events Manager, o mesmo `event_id` aparece uma vez.

## F. Backlog priorizado

**P0 — bloqueadores**

| Tarefa | Esforço | Depende de | Aceite |
|---|---|---|---|
| URL de anúncio com proposta para quem divulga, gratuidade, análise humana e um CTA | M | — | Primeira tela em 390px e desktop bate com o texto do anúncio |
| Tirar adulto, aposta e “ganhar dinheiro” dessa URL e dos links dela | P | — | Snapshot sem esses nomes e sem href para essas facetas |
| Páginas de privacidade e termos fiéis ao código, link no cadastro | M | — | `/privacidade` e `/termos` 200; cadastro aponta para elas |
| Persistir UTM no usuário e no link; gravar os sete eventos no banco | M | — | Coorte do anúncio separável por SQL, sem dado pessoal no evento |

**P1 — antes de gastar**

| Tarefa | Esforço | Depende de | Aceite |
|---|---|---|---|
| Pós-cadastro vai para verificar ou para novo link | P | — | Conta nova não abre o painel de métricas primeiro |
| Remover telefone do cadastro | P | — | Publicar continua exigindo só e-mail |
| `knownHosts` na criação do link | M | — | Host incompatível retorna 422 |
| Faceta sem links substantivos fica `noindex` e fora do sitemap | P | — | `/nicho/jogos` sem links não entra no sitemap |
| Tela “enviado para análise”, sem dizer publicado | P | — | POST 201 não renderiza “Publicado” |
| Travar botão e impedir URL canônica duplicada | P | — | Dois cliques, um link |
| Aviso operacional da fila e compromisso de olhar no mesmo dia | P | — | Caso novo aparece sem abrir o admin por acaso |
| Consentimento antes de qualquer pixel | M | P-03 e eventos no banco | Sem consentimento, nenhuma request para `facebook.com` |

**P2 — pode esperar**

| Tarefa | Esforço | Aceite |
|---|---|---|
| `og:image` e título específico da URL do anúncio | P | Preview da Meta mostra imagem e frase de divulgação |
| Chips que não cortam texto no mobile | P | “Ganhar Dinheiro” legível ou com ellipsis e nome acessível |
| Orientação de spam no verificar | P | A tela cita a caixa de spam |
| Salvar rascunho se sair do formulário | M | Voltar restaura os campos |
| Headers de segurança | P | HSTS e CSP sem quebrar o checkout Stripe |
| Checar se a URL responde, usando o `safeFetch` que já existe | M | URL morta não ocupa vaga como se estivesse no ar |
| Explicar a cota de 4 | P | A pessoa vê quantas vagas restam antes do 409 |

**P3 — com volume**

Automação de moderação que de fato mude o status, com teste. Job de retenção de 12 meses e 5 anos. Paginação da home (`nextCursor` já volta da API e a home ignora). Pixel otimizando entrega, só quando `LinkPublished` deixar de ser evento raro. Destaque pago como segunda conversão, não como promessa do primeiro anúncio.

## G. Plano de validação

Não foi executado cadastro real em produção, para não criar lixo e não gastar e-mail. O que foi visto ao vivo: home, cadastro, sitemap, robots, nichos vazios, HTTPS, ausência de privacidade e termos, viewport de 390px.

1. Desktop e 390px na URL do anúncio: uma frase, um botão, sem categoria restrita acima da dobra, sem scroll horizontal da página.
2. Cadastro: sem telefone, com link de privacidade, botão trava, erro de e-mail repetido diz o que fazer (entrar), conta nova cai na verificação.
3. Código errado, reenvio, código certo. Confirmar que `canSubmit` vira verdadeiro e o próximo passo é o formulário.
4. URL `http://`, host privado e host que não pertence à rede escolhida falham com texto útil. URL `https` válida cria um caso.
5. Dois cliques: um link. Quinto envio com quatro pendentes: 409 legível.
6. Admin aprova: status `PUBLISHED`, e-mail, página pública, uma linha `LinkPublished`. Recusa: e-mail de não publicado, vaga livre, zero `LinkPublished`.
7. Recarregar aprovação não duplica evento. Usuário sem UTM não entra no recorte do anúncio.
8. `/nicho` sem link: `noindex` e ausente do sitemap. `/busca`: noindex. Link curto demais: noindex, como `linkRobots` já prevê (descrição com menos de 80 caracteres ou igual ao nome).
9. Destaque: só aparece para link publicado; preço visível antes do Pix ou do cartão. Não cobrar no teste sem querer.
10. Console da URL do anúncio sem request para domínios da Meta antes do consentimento.

## H. Critérios de prontidão para anúncios

**Bloqueadores absolutos**

- URL do anúncio fala com quem tem um link, diz que publicar é grátis e que há análise, e o botão leva ao cadastro ou ao formulário.
- Essa URL não destaca e não linka adulto, aposta nem “ganhar dinheiro”.
- Privacidade e termos no ar, acessíveis no cadastro, descrevendo só o que o sistema faz.
- Primeiro toque de UTM gravado na conta e consulta pronta de enviados e publicados por campanha.
- Alguém definido para moderar no dia em que o anúncio ligar.
- Nenhum link de teste no ar.

**Recomendado antes de ligar**

- Telefone fora do cadastro.
- Host da URL coerente com a rede.
- Nichos vazios fora do índice.
- Tela de “em análise” e e-mail de verdade testado com uma caixa sua.
- Botão sem duplo POST.
- Consentimento desenhado, mesmo que o pixel fique para a semana seguinte.

**Pode esperar**

- Pixel e CAPI.
- `og:image`.
- Moderação automática.
- Rascunho, paginação, expurgo, otimização de cache.
- Criativo e estrutura de campanha. Isso é outra etapa.

## I. Próximos passos

1. Escolher a URL do anúncio e escrever nela a oferta real: publicar grátis, análise humana, destaque só depois. Não reescreva a home de busca se o anúncio não precisa dela.
2. Cortar dessa URL as facetas que colocam a conta de anúncios em risco. O catálogo geral pode continuar existindo; o clique pago não precisa atravessá-lo.
3. Publicar privacidade e termos no tamanho do que já está implementado.
4. Gravar UTM e os eventos no banco. Só então faz sentido olhar o Gerenciador.
5. Ensaiar um ciclo completo com a sua caixa de e-mail: cadastro, código, envio, aprovação, linha no banco. Se esse ciclo passar de um dia, o anúncio vai pagar espera, não distribuição.
6. Aí sim, um criativo único, um público, uma URL, poucos dias. A pergunta do teste é uma: de cada visita com UTM, quantas viram link `PUBLISHED`. Cadastro sozinho não responde.

O custo de fazer isso antes é alguns dias. O custo de ligar agora é gastar o mês sem saber se alguém publicou, com chance de a Meta barrar a página na revisão. Com um link no ar e a fila 100% manual, o gargalo não é tráfego. É a primeira tela e a operação da aprovação.

## Limites desta auditoria

- Core Web Vitals (LCP, INP, CLS) não foram medidos em laboratório. Uma amostra de TTFB da home ficou em torno de 0,38–0,44 s, a partir desta rede, com a borda em GRU. Não é percentil.
- Variáveis de produção não foram lidas. A presença de chaves no `.env` local não foi usada como prova do que está no ar.
- Nenhum cadastro, pagamento ou aprovação foi executado em produção.
- Um fetch intermediário do sitemap devolveu erro; o `GET` direto respondeu 200 com urlset válido. O sitemap não foi tratado como quebrado.
- Não há afirmação de indexação no Google. O que está aqui é o que o código e o sitemap permitem indexar.
