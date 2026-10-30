# Desconto informado pela Shopee — 30/10/2026

O anúncio `SHP1021296752_58254144707` retornou preço único de R$ 28,80 e `priceDiscountRate: 3` na Open API real. A consulta do adaptador não selecionava esse campo e o parser descartava o percentual. O Explorer oficial BR descreve `priceDiscountRate` como inteiro entre 0 e 100. Seu tipo `ProductOfferV2` não informa um preço anterior exato: o percentual arredondado não permite reconstruir os R$ 29,80 mostrados no print.

A busca e a revalidação exata passam a solicitar o campo. Percentuais inteiros positivos até 100 são preservados como `reportedDiscountPercent`; zero, ausência e valores inválidos não produzem selo e não invalidam um preço utilizável. `oldPriceCents` e sua origem continuam nulos para Shopee. Nenhum preço anterior é calculado por divisão do percentual.

A lista e a revisão exibem “3% de desconto informado pela Shopee”, com o preço atual. Os detalhes identificam a fonte e a ausência do preço anterior exato. O percentual arredondado não substitui a evidência usada para seleção automática. Elegibilidade, reputação, histórico próprio, preço, link, assinatura e mensagem aprovada para WhatsApp mantêm seu comportamento. O desconto exibido como informação administrativa não é inserido silenciosamente na mensagem de envio.

## Verificações locais

- Regressão do parser reproduziu primeiro a ausência do campo; depois passou, incluindo busca e revalidação, taxa ausente/zero/inválida e preço anterior nulo.
- Backend: lint, typecheck, build e 208 testes afetados aprovados; um teste existente ignorado. A limpeza posterior de uma expressão de validação passou novamente nos seis testes de avaliação.
- Frontend: lint, typecheck, build e 139 testes de afiliados aprovados. O build manteve avisos existentes de CSS/autoprefixer e configuração do workspace, sem falha.
- Playwright Test: seis cenários aprovados em desktop/mobile, incluindo fontes juntas, desconto na lista e revisão, foto e nova tentativa de título.
- Playwright MCP: interação local com os dados públicos reais do anúncio e respostas administrativas de fixture. Foto obtida do CDN real, sem interceptar sua requisição, decodificada em 800 × 800. Desconto conferido na lista e no diálogo. Sem overflow a 390 px ou a 320 px com texto a 200%. Capturas inspecionadas em `docs/frontend-profissional/evidencias/shopee-desconto-2026-10-30/`. Esse replay não é uma sessão autenticada em produção.
- Graphify incremental code-only: 22 arquivos reavaliados, 1753 reutilizados; 8930 nós e 32097 relações. Índice local, sem LLM/API ou envio externo.

## Publicação e cache

A publicação exige a CI integral. Depois dela será conferida a resposta real de descoberta e prévia, sem chamar a rota de envio. A atualização dos metadados de desconto dos anúncios já em cache será limitada à conta administrativa solicitada, com revalidação oficial do mesmo anúncio/loja, comparação do preço atual, proteção contra concorrência e backup. Preços, timestamps, decisões, ofertas e entregas não serão alterados.

Reversão: reverter somente o commit deste reparo e, se necessário, restaurar somente o metadado de percentual a partir do backup privado. Sem nova migração, dependência ou credencial. Descontos e disponibilidade continuam dependentes da Shopee. Nenhuma mensagem real de teste foi enviada ao WhatsApp.
