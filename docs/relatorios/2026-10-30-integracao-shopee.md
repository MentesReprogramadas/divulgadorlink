# Integração Shopee Affiliate Open API Brasil

Implementação local, sem envio real ao WhatsApp, push ou deploy desta integração.

## Contrato e operação

Credenciais da Shopee usam `AffiliateConnection.provider = SHOPEE`, com criptografia autenticada por tenant e contexto do provedor. Nenhum segredo é devolvido pelo status, registrado no audit log ou adicionado ao código. A chave de criptografia do servidor continua sendo `WEBHOOK_ENCRYPTION_KEY`.

Rotas administrativas, sob `/api/v1/admin/affiliates/catalog`:

- `GET /shopee`: configuração, conexão, status, nome da conta e Sub IDs; sem App ID ou Secret.
- `PUT /shopee`: `{ appId, secret, accountLabel, subIds? }`; salva criptografado, sem afirmar que o acesso foi verificado.
- `POST /shopee/verify`: consulta limitada de ofertas e confirma conexão apenas se o provedor aceitar.
- `DELETE /shopee`: apaga as credenciais armazenadas e marca desconexão.
- `GET /search?q=...&provider=SHOPEE`: busca oficial de ofertas.
- `POST /affiliate`: mantém o contrato existente `{ productUrl }`; encaminha URLs completas da Shopee ao gerador oficial.

A configuração de descoberta aceita `provider: MERCADO_LIVRE | SHOPEE`. O padrão continua Mercado Livre. A troca remove páginas em cache dessa segmentação e invalida suas prévias anteriores; decisões e observações históricas permanecem. Produtos Shopee usam IDs `SHP{shopId}_{itemId}`, evitando colisão com anúncios MLB.

A prévia revalida o mesmo produto/loja e um preço recente, gera o link com a conta do tenant e assina o conteúdo aprovado. A aprovação mantém confirmação, expiração, idempotência, isolamento de tenant e revisão pelo administrador existentes.

## Evidência oficial

Fontes consultadas em 30/10/2026:

- [Explorer oficial Brasil](https://open-api.affiliate.shopee.com.br/explorer): código público de autenticação SHA256 sobre App ID, timestamp, corpo JSON exato e Secret; endpoint `/graphql`.
- [Explorer V2 oficial Brasil](https://open-api.affiliate.shopee.com.br/explorer/v2): metadados públicos de `productOfferV2`, paginação, filtros por keyword/itemId/shopId, tipos de preço e mutação `generateShortLink` com `ShortLinkInput` e Sub IDs.

O adaptador usa origem fixa HTTPS, recusa redirecionamentos, limita tempo e tamanho de resposta e não reflete mensagens livres do provedor em erros públicos.

## Limites

- Acesso real depende de aprovação e permissões da conta Shopee. Credenciais reais não foram utilizadas nesta validação automatizada.
- A fonte fornece ofertas com cobertura parcial, sem comparação completa de vendedores. O retorno usa `comparison = provider_offers`.
- O provedor informa existência de próxima página, sem total exato. O total retornado serve à navegação e não representa o catálogo completo.
- Produtos com faixa de preço são listados como indisponíveis para a prévia de preço único. Não se anuncia um preço de variante como preço universal.
- A taxa arredondada de desconto não é convertida em preço anterior. Reputação permanece desconhecida, sem aplicar a semântica verde do Mercado Livre à Shopee.
- URLs curtas de origem não são resolvidas pelo backend. Para gerar um link, informar a URL completa do produto com IDs de loja e anúncio.

## Validação executada

- Backend: lint e build aprovados; typecheck aprovado.
- Suítes de domínio, adaptadores e casos de uso de afiliados e HTTP de catálogo/produtos: 172 testes aprovados, 1 já ignorado.
- PostgreSQL descartável local: 84 migrações aplicadas; descoberta com 16 testes aprovados, incluindo troca de fonte e preservação de decisões.
- PostgreSQL Shopee: fluxo com banco real de configuração criptografada, descoberta, cache, revalidação, prévia assinada e aprovação idempotente, com uma entrega pendente. Somente a API externa foi simulada; nenhum envio ao WhatsApp ocorreu.

O banco descartável `affiliate_shopee_regression_20261030` foi criado no container de preview existente. Nenhum container ou processo alheio foi encerrado. A validação visual da interface pertence à etapa de frontend.

## Verificação operacional posterior pela raiz

Em 30/10/2026, consulta autenticada real `productOfferV2`, termo pet e limite de um produto, foi aceita pela Shopee e retornou um produto. Credenciais fornecidas pelo usuário foram configuradas no servidor de produção com AES-256-GCM e contexto por tenant para a conta administrativa solicitada. Nenhum segredo foi escrito neste relatório ou no código; saída operacional contém apenas confirmação e quantidade. As rotas novas permanecem dependentes da publicação da integração.

Smoke posterior no servidor, usando a configuração criptografada: consulta oficial com os mesmos campos do adaptador retornou 20 produtos, sendo 17 com preço único. `generateShortLink` com `ShortLinkInput` e Sub IDs foi aceito e retornou link HTTPS no domínio `s.shopee.com.br`. A saída omitiu credenciais, IDs e URL individual. Nenhum envio ao WhatsApp ocorreu. Este smoke comprova acesso e contrato real do provedor; não substitui teste HTTP das novas rotas após publicação.

## Reversão da integração

Desconectar a Shopee apaga suas credenciais. Selecionar Mercado Livre restaura a fonte anterior e limpa o cache da segmentação. Para remover o código, reverter apenas os arquivos da integração e sua migração, preservando o estado prévio de avaliação manual e as alterações paralelas de grupos. A remoção da coluna de fonte exige conferir e migrar segmentações Shopee antes.
