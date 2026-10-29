# Sugestões automáticas e imagens dos produtos

Pedido após finalizar contas/sessões: mostrar fotos na listagem e encontrar sugestões pelo tema da segmentação sem exigir buscas manuais repetidas. A etapa de contas está validada; não há autorização para envio automático de novas ofertas.

## Direção e alcance

- Descoberta automática por segmentação no worker existente, com termos configuráveis e o nome como padrão. Coleta periódica e atualização manual sem redigitar termos; navegação apresenta cache e estado em segundo plano.
- Usar modelo dedicado de descoberta para não alterar o updatedAt usado nas proteções de provisionamento do grupo. Cache limitado, lease/CAS, isolamento de tenant e pausa. Mudanças de configuração invalidam resultados antigos.
- Reutilizar busca autenticada e rodar páginas/termos em rodízio limitado, sem repetir eternamente os mesmos 20 resultados. Não contornar403 nem prometer cobrir todos os produtos elegíveis do ML.
- A interface exibe Sugestões para a segmentação, consulta em andamento/última atualização, fonte e limites. Busca manual e URL são complementares recolhidos. A preparação e o envio continuam exigindo revisão humana.
- Fotos do ML na lista de sugestões, catálogo e ofertas preparadas; dimensões estáveis, carregamento tardio e fallback quando não há imagem. Manter o vínculo exato entre anúncio e preço.
- Novo modelo/migration, worker, use case/rotas, contratos, UI, fixtures e testes. Aplicar migration somente aos bancos locais identificados; não alterar produção VHG.

## Validação

- [x] Diagnosticar fonte e imagens nos dados reais, confirmar contratos oficiais.
- [x] Coleta persistente com exclusão mútua, rotação, cache e regressões de autorização/configuração.
- [x] UI automática e fotos com estados, revisão e testes desktop/mobile.
- [x] Checks dos pacotes, E2E integrado, inspeção real, documentação e Graphify incremental.

No fechamento, a suíte revelou um erro preexistente de atomicidade Pix. Conforme autorização original para corrigir erros encontrados, a mesma liberação de reserva foi movida para a transação do estado terminal, sem alterar regras comerciais. Quatro regressões PostgreSQL, revisão independente e as provas originais passaram. Evidência em `docs/relatorios/2026-10-28-pix-expiracao-atomica.md`.

As consultas oficiais distinguem produto de catálogo e anúncio vendável. O buscador de produtos foi documentado para identificar fichas de catálogo, não como índice completo de ofertas de afiliados: https://developers.mercadolivre.com.br/buscador-de-produtos . A resposta consultada de Natal trouxe um anúncio após 20 fichas verificadas; isso não significa que existe só um produto de Natal no marketplace.
