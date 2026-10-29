# Geração automática do Mercado Livre — 28/10/2026

## Causa confirmada

O serviço recebeu HTTP 200 do gerador autenticado do Mercado Livre. O envelope trazia um único resultado bem-sucedido, `origin_url` com o anúncio/vendedor solicitado, etiqueta, perfil, link curto e link completo correspondentes. A falha ocorria depois: a releitura pública da página `/social/…` para validar esse resultado recebia HTTP 403. O erro foi atribuído incorretamente à geração do link.

## Correção local

`backend/scripts/local-vhg-bridge.mjs` valida diretamente o mapeamento origem → destino retornado pelo gerador autenticado:

- HTTP e status de envelope 200, um item, um sucesso e zero erros;
- uma única linha, `origin_url` do mesmo anúncio/vendedor e tipo `SOCIAL_PROFILE_ENCRYPTED`;
- etiqueta configurada e perfil exatos, HTTPS, origens permitidas, parâmetros de atribuição presentes;
- link curto e completo retirados da mesma linha e confirmados pelo parser de atribuição existente.

Não se fabricam parâmetros de atribuição nem se libera link de vendedor diferente. A geração deixa de consultar o cache de links do VHG e não depende da releitura pública bloqueada. Cada solicitação é enviada ao gerador; o próprio Mercado Livre pode devolver um link já existente para o mesmo anúncio/etiqueta.

O adapter distingue sessão ausente, recusa da sessão/acesso e resposta sem vínculo confirmado. Nenhum desses erros é apresentado como sucesso ou como catálogo vazio.

## Evidências

Requisição real para o anúncio `MLB4552665179`, catálogo `MLB20818317`, confirmou criação pelo gerador com `created: true`, `total_success: 1`, `total_error: 0` e `origin_url` exato. Uma chamada posterior ao programa remoto atualizado retornou HTTP 200 com o link `https://meli.la/1sFy5j9`, etiqueta e perfil esperados.

Vinte testes focados passaram: ponte local, adapter Mercado Livre e gateway de catálogo. Incluem rejeição de envelope parcial/ambíguo, outro vendedor, etiqueta/perfil incorretos, origens externas, ausência de parâmetros de atribuição e troca de link curto. A API e a ponte precisam carregar a versão atualizada para validação pelo BFF/painel; o coordenador controla esse reinício.

Atualização do coordenador: API3351 e ponte4452 reiniciadas. Login administrativo e chamada pelo BFF real retornaram200 com `url`, `fullUrl`, `tag` e `profile`, sem cookies/segredos na resposta. O helper `sameSellerItem` foi conferido no código da referência: compara um ID de anúncio MLB válido extraído de wid/item_id/path; `generatedAffiliate` aplica o parser de atribuição existente. A prova não depende apenas dos mocks unitários.

Credenciais foram decriptadas apenas no processo temporário dentro da VPS. O SQLite foi aberto em modo somente leitura. Não houve alteração do código, da configuração, dos tokens OAuth ou do banco do VHG. Nenhum grupo, instância ou mensagem do WhatsApp foi criado/importado/enviado nesta verificação.

## Limites

A correção comprova geração e vínculo pelo gerador autenticado. Ela não comprova acesso público irrestrito ao destino, entrega de WhatsApp, compra ou comissão. O Mercado Livre ainda pode retornar 403 ao abrir uma página pública. Não foi tentado contornar esse bloqueio.

O endpoint usado pela integração VHG pertence ao gerador web autenticado e não é apresentado aqui como API pública documentada de afiliados. Mudanças de formato ou expiração da sessão falham de forma fechada e exigem manutenção/conexão. O suporte oficial descreve o fluxo do gerador em [Gere seus links](https://www.mercadolivre.com.br/l/afiliados-gere-seus-links) e [Primeiros passos](https://www.mercadolivre.com.br/l/afiliados-primeiros-passos); a estrutura concreta do envelope foi verificada na resposta real, não inferida dessas páginas.
