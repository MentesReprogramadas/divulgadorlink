# F18 — evidências locais, 18/10/2026

20 capturas finais nativas do Playwright inspecionadas, sem máscaras ou retoques: desktop 1280×720, mobile 390×844 e reflow 320px/fonte 200%. Busca pública, filtros AND, vazio, prévia privada, agenda servidor, idade confirmada, skeleton sem href antigo, erro/retry, cursor reiniciado e teclado. Composição mantém a largura dos links e cores pessoais dos campos/botões de busca/paginação. Os placeholders iniciais de identidade/dados desconhecidos continuam sendo estimativas; não se afirma equivalência de todas as páginas/temas possíveis.

129 E2E de regressão conjunta, seis finais próprios e seis de agenda sobrepostos. Rodada ampla inicial teve 127 aprovados e duas falhas de interceptação do endpoint antigo da agenda; logs/traces preservados e teste corrigido para a rota real, sem retirar assertions. Não somar as rodadas como casos únicos. Após acrescentar prova explícita de Enter/reload, 18 capturas permaneceram idênticas byte a byte às inspecionadas; as duas de zoom foram reabertas, agora mostrando foco de teclado (capture-delta-review.json). Axe A/AA nos estados exercitados; não equivale a acessibilidade total. CI, Safari e aparelho físico não validados.

- desktop-search-age-confirmed.png
- desktop-search-cursor-restarted.png
- desktop-search-empty.png
- desktop-search-error.png
- desktop-search-filtered.png
- desktop-search-pending.png
- desktop-search-private-preview.png
- desktop-search-public.png
- desktop-search-window-active.png
- desktop-search-zoom.png
- mobile-search-age-confirmed.png
- mobile-search-cursor-restarted.png
- mobile-search-empty.png
- mobile-search-error.png
- mobile-search-filtered.png
- mobile-search-pending.png
- mobile-search-private-preview.png
- mobile-search-public.png
- mobile-search-window-active.png
- mobile-search-zoom.png
