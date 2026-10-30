# Busca conjunta de afiliados — 30/10/2026

O seletor de fonte da segmentação fazia a descoberta consultar somente Mercado Livre ou Shopee. A descoberta agora consulta as duas fontes em paralelo com o mesmo termo e página. A busca manual sem `provider` usa a mesma composição; o parâmetro explícito permanece compatível com consumidores anteriores.

A lista intercala lojas e termos, deduplica por anúncio e preserva avaliações, descartes manuais, envios anteriores e isolamento de tenant. Configurações antigas de fonte deixam de restringir a coleta e não apagam o cache. Não houve migração, alteração de credenciais, dependências ou envio real ao WhatsApp.

Falha parcial mantém os produtos da fonte disponível e avisa qual integração falhou. O cache ainda válido da fonte indisponível preserva o horário original; não gera nova observação de preço. A coleta repete essa página na próxima execução antes de avançar. O fim de paginação de uma fonte não encerra a outra. Se ambas falharem, o cache anterior é preservado e ocorre retentativa. A Shopee informa existência de próxima página, sem total exato; os números continuam representando cobertura parcial.

Na interface, não existe escolha de fonte. A busca manual passa a “Buscar nas duas lojas”; preparar cada produto usa a autorização da loja correspondente. Prévia, revalidação de preço, confirmação, assinatura, expiração, idempotência e entrega continuam nos fluxos existentes.

## Verificações locais

- Backend: lint, typecheck e build aprovados. Suítes afetadas: 205 testes aprovados e 1 já ignorado. Após acrescentar a regressão HTTP da busca conjunta, 28 testes focados aprovados.
- Frontend: lint e typecheck aprovados; 133 testes de componentes de afiliados aprovados. Build de produção do runner E2E e `npm run build` aprovados.
- PostgreSQL descartável `affiliate_combined_regression_20261030`: 85 migrações existentes aplicadas; 18 testes de descoberta/Shopee e 8 de revisão/envio aprovados. A primeira tentativa dos testes de revisão foi recusada pela lista de bancos permitidos; acrescentado somente o nome exato deste banco descartável e a suíte passou.
- Playwright Test: 34 cenários aprovados, desktop/mobile, incluindo lista conjunta, autorização por produto, ausência de seletor, teclado, axe, prévia e confirmação sem mensagens reais.
- O cenário legado de configuração Pets/Shopee foi ajustado para ambas as fontes, incluído no runner de afiliados e passou em desktop/mobile (2 testes adicionais). A primeira tentativa não selecionou testes porque o runner já havia carregado a configuração anterior; a execução com a nova configuração passou.
- Capturas desktop/mobile inspecionadas em `docs/frontend-profissional/evidencias/afiliados-busca-conjunta-2026-10-30/`.
- Playwright MCP em contexto isolado: ambas as lojas presentes, dois botões de revisão, Configurações pelo teclado, zero seletor de fonte e zero overflow em 320 px com texto a 200%.
- Graphify incremental local, code-only, sem LLM/API: 124 arquivos reavaliados e 1628 reutilizados; 8816 nós e 31732 relações. O índice anterior estava atrasado em relação à main; esse delta não é atribuído somente à alteração. Arquivos sem símbolos e CSS dependem das verificações reais. Índice atualizado permanece local, fora do release.

## Limites e reversão

A disponibilidade real depende das contas e das APIs de cada loja. As validações locais usam provedores simulados e não certificam disponibilidade contínua, checkout ou entrega real. Segmentações existentes passam a consultar ambas na próxima coleta; “Forçar atualização” antecipa a tentativa dentro do cooldown existente. Cache, revisão e horário de consulta continuam visíveis.

Reverter somente o commit desta correção. Não é necessário rollback do banco: esquema, credenciais, decisões e histórico não foram alterados. A publicação e os healthchecks serão registrados após o pipeline concluir.
