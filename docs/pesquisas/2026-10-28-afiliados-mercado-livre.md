# Mercado Livre na Central de Afiliados

Referência analisada: clone privado `C:/VSCODE/vhg-promos-reference-20261028`, revisão `e68fac8642f1bdb8c9a9f2e22b2b261965a58b88`. Foram lidos `lib/mercadolivre.ts`, `lib/catalog-prices.ts`, `lib/offers.ts`, `lib/affiliate.ts`, `lib/affiliate-utils.ts`, `affiliate/server.mjs`, schema e operação. A implementação nativa usa Prisma/PostgreSQL e autenticação do Tem Link Aqui; não importa banco, credenciais, destino ou identificação fitness do VHG.

## Fontes primárias consultadas em 28/10/2026

- [Autenticação e autorização](https://developers.mercadolivre.com.br/autenticacao-e-autorizacao): authorization code, PKCE e rotação de refresh token.
- [Buscador de produtos](https://developers.mercadolivre.com.br/buscador-de-produtos): `/products/search` com `site_id=MLB`, produtos ativos e autorização.
- [Itens e buscas](https://developers.mercadolivre.com.br/itens-e-buscas): identidade do anúncio e campos do recurso.

As fontes documentam os protocolos; não comprovam liberação do catálogo para uma conta ou aplicativo específico.

## Configuração

1. Gerar e conservar `WEBHOOK_ENCRYPTION_KEY`, base64 de 32 bytes. É a chave AES-256-GCM já usada pelas integrações; não trocar sem migração dos segredos existentes. O módulo usa contexto separado por tenant e provedor.
2. Definir `MERCADO_LIVRE_REDIRECT_URI` para a URL pública HTTPS do BFF: `https://SEU_DOMINIO/bff/v1/admin/affiliates/catalog/callback`. Sem valor explícito, usa `APP_PUBLIC_URL` com esse caminho. Registrar exatamente a mesma URL no aplicativo ML. Localhost HTTP só é permitido fora de produção.
3. Em Admin > Afiliados > Catálogo, salvar App ID e Client Secret e abrir Conectar Mercado Livre. Somente o administrador ativo que iniciou a conexão pode concluir o retorno. State expira em dez minutos, é ligado ao administrador e consumido antes da troca de código. Uma nova tentativa de conexão invalida a anterior.
4. Buscar produtos. A conta conectada ainda depende das permissões do ML. 403 informa falta de acesso; 429 pede espera. Esses casos não viram listas vazias nem ativam scraping silencioso.

## Preços e vendedores

A busca consulta até oito produtos e compara os quatro primeiros catálogos distintos, até cinco páginas de cem vendedores por catálogo. A URL mantém `wid` e `pdp_filters=item_id:` do anúncio escolhido. Preço, vendedor, moeda BRL, estado e condição nova permanecem juntos. Sem referência maior que o preço atual, o desconto é omitido. Não inclui frete, desconto pessoal, cupom, cashback ou estimativa de comissão.

Comparação incompleta, página repetida ou falha de consulta excluem aquele produto e geram aviso; não se promove um preço parcial como menor preço de todo o ML. Os demais catálogos integralmente consultados podem ser apresentados. Há limite de tempo e resposta de 1 MiB. Tokens renovam sob `SELECT FOR UPDATE`, impedindo duas instâncias da API de consumir simultaneamente o mesmo refresh token.

## Geração de afiliados

Definir no backend:

```dotenv
AFFILIATE_SERVICE_URL=https://SEU_SERVICO_PRIVADO
AFFILIATE_SERVICE_KEY=SEGREDO_DO_SERVICO
AFFILIATE_TAG=SUA_TAG
AFFILIATE_PROFILE=SEU_PERFIL
```

O adaptador é compatível com o endpoint privado `POST /api/generate` do serviço VHG: autenticação `Authorization: Bearer`, corpo `{ "url": "URL_DO_PRODUTO" }`, resultado `{ "url", "fullUrl", "tag", "profile" }`. É permitido `http://affiliate:8080` exclusivamente para rede privada Docker. Em dev/test também é permitido HTTP em `127.0.0.1`, `localhost` ou `[::1]`; loopback é recusado em produção. Não segue redirects com o segredo. O serviço precisa ter sessão de afiliado conectada pelo operador. A central não copia sessão de navegador nem conta do VHG e não finge ter gerado links quando esse serviço está ausente.

O link recebido é validado contra a tag/perfil configurados, a URL social ML, `matt_word`, `matt_tool` e `ref`. Nenhum link de afiliado é sintetizado por concatenação. Sem gerador pronto, permanece possível inserir um link de afiliado revisado manualmente no formulário de oferta. `affiliateConfigured` indica somente presença da configuração, não atesta login ou disponibilidade do serviço remoto.

Desconectar elimina tokens armazenados localmente e invalida OAuth pendente. A revogação da autorização no próprio Mercado Livre continua sendo ação da conta no ML. Ofertas e histórico não são excluídos.

## Ponte local autorizada para teste de integrações existentes

O modo `CENTRAL` permite testar o catálogo e a geração de afiliados já operados pelo VHG sem importar seu banco, navegador ou refresh token no Tem Link Aqui. A ponte local é iniciada separadamente pelo operador; não modifica o código nem a implantação remota. Ela usa a conexão SSH autorizada para consultar o token de acesso vigente e executar somente as consultas de catálogo permitidas. A geração é delegada à API existente do painel de origem.

```dotenv
AFFILIATE_CATALOG_GATEWAY_URL=http://127.0.0.1:4452
AFFILIATE_CATALOG_GATEWAY_KEY=CHAVE_ALEATORIA_LOCAL
AFFILIATE_SERVICE_URL=http://127.0.0.1:4452
AFFILIATE_SERVICE_KEY=CHAVE_ALEATORIA_LOCAL
```

`AFFILIATE_TAG` e `AFFILIATE_PROFILE` continuam obrigatórios para validar a atribuição. As chaves ficam apenas no backend e na ponte, nunca em variáveis `NEXT_PUBLIC`, resposta de status ou navegador.

Contrato da ponte: `GET /catalog/status` retorna somente estado, App ID e expiração; `POST /catalog/request` recebe `{path}` e só permite `/products/search?...` ou `/products/MLB.../items?...`; `POST /api/generate` mantém o contrato de afiliados acima. Todas as rotas exigem `Authorization: Bearer`. O adaptador recusa redirects, limita o corpo a 1 MiB, preserva bloqueios 403/413/429 e não devolve corpos privados de erro. Um token de acesso expirado informa necessidade de renovação na operação de origem; o Tem Link Aqui não toma posse do refresh token.

O modo central só é acessível ao tenant cujo host no banco é exatamente `TENANT_HOST`, após a autorização administrativa usual. Outro tenant não recebe identidade da conta e não pode consultar ou gerar por essa ponte. Configurar, conectar, retornar OAuth ou desconectar pelo Tem Link Aqui são recusados em modo central: a conta permanece gerenciada na origem. Retirar as duas variáveis `AFFILIATE_CATALOG_GATEWAY_*` restaura o fluxo OAuth nativo; não elimina histórico.

Esta ponte não fornece endpoint Evolution e não importa, conecta, sincroniza ou reutiliza instâncias/grupos WhatsApp do VHG. O operador criará instâncias e grupos novos na central. Acesso real e resultados da ponte devem ser registrados separadamente pelo executor após a verificação local; os testes deste módulo usam mocks.

## Validação e reversão

Testes unitários de contratos, conectores, lifecycle e HTTP usam mocks locais, sem conta real nem WhatsApp. A prova PostgreSQL `src/use-cases/@Affiliates/catalog.pg.spec.ts` exige `AFFILIATE_DATABASE_URL` local descartável e testa refresh concorrente e callback de uso único. Resultados efetivamente executados são registrados no relatório da tarefa raiz.

Reversão do catálogo: remover o registro de `registerAffiliateCatalogRoutes`, as rotas/adaptadores/domínio/serviço deste módulo e suas configurações de ambiente. Não apagar registros de ofertas, grupos ou histórico. Não rotacionar a chave compartilhada como forma de desativar o módulo.

Não houve migração de conta real, chamada paga, geração de link no serviço real nem validação live de acesso ao ML nesta implementação. Esses pontos precisam da configuração e da conexão explícita do operador.
