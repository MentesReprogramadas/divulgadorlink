# Resumo — pré-marketing

Branch `feat/pre-marketing-02-legal`. Sete etapas, nesta ordem. Nada foi para o remoto. Nenhuma campanha foi criada. O `.env` e a chave da API de conversões não entraram no git. O link `VHG promo fitness #01` não foi mexido.

| Etapa | O que fechou | Prova que segurou a etapa |
| --- | --- | --- |
| 1 Landing | `/divulgar` para quem publica, sem a home do catálogo | Playwright do anúncio, 3 testes |
| 2 Legal | Privacidade e termos com operador, sem endereço, destino fora da jurisdição | Vitest, sitemap HTTP, Playwright legal |
| 3 Atribuição | Primeiro toque, funil sem dado pessoal, pixel só depois do aceite | Playwright do funil, zero request à Meta |
| 4 Cadastro | Sem telefone; conta some se o código não sai | HTTP 201/503 e Playwright de cadastro, 22 na leva |
| 5 Envio | Rede, URL viva, duplicata, “Enviado para análise.” | `links.spec` 10 e Playwright do envio, 3 |
| 6 Índice | Faceta só com 3 links substantivos; lastmod da home pelo conteúdo | Vitest de política, sitemap e catálogo HTTP, 39 no conjunto |
| 7 Operação | E-mail da fila, headers com nonce, expurgo de analytics em 12 meses | Catálogo Playwright inteiro mais headers |

Relato de cada uma: `2026-10-09-01-landing.md` até `2026-10-09-07-operacao.md`. O que o código não faz: `2026-10-09-acoes-humanas-pre-marketing.md`.

## O que ainda é gente, não deploy

1. No Railway, `META_PIXEL_ID=2981954672158122` e `META_CAPI_TOKEN`. Sem isso o funil existe no banco e a conta de anúncio continua cega. Se este chat vazou, gere outra chave e não cole aqui.
2. No dia em que a mídia gastar, abrir `/admin/moderacao` e decidir a fila no mesmo dia. O e-mail avisa. Não publica. A IA de moderação continua desligada de propósito.
3. Redirect 301 de `www` para o apex, se quiser um host só. Os dois já respondem 200. Não bloqueia o anúncio.
4. Não apagar pedido nem pagamento por idade. Analytics de sessão, sim, depois de 12 meses.

## O que quebrou e foi consertado em vez de empurrado

- E2e logava no tenant de produção porque `TENANT_HOST` voltava do `.env`.
- Sonda de URL recusava `example.com` no teste. Produção continua sondando.
- CSP sem nonce deixou o login em branco. A política ficou no middleware, com nonce, Stripe e o pixel. `'unsafe-inline'` de script não entrou.
- Frase de sucesso do catálogo e2e ainda dizia “Em revisão”.

## Onde o programa é frágil se o gasto subir

A fila humana é o teto. A R$ 30/dia cabe. Se o anúncio passar a gerar dezenas de envios por dia, o atraso de aprovação vira o custo do anúncio, e o e-mail por admin vira barulho.

A atribuição é o primeiro anúncio, por 30 dias. O gerenciador da Meta, em último clique, não vai bater com `FunnelEvent`. Tratar a diferença como bug e “corrigir” o cookie apaga a decisão da etapa 3.

Quase nenhum nicho entra no Google até ter 3 links substantivos. Isso é o índice honesto. Inchá-lo com resumo longo devolve a página fina que a auditoria apontou.

A sonda de URL e a CSP são as duas travas que alguém vai pedir para afrouxar na primeira semana de anúncio. Afrouxar as duas publica link morto e abre script de terceiro. Não faça isso para fazer o número do dia parecer melhor.
