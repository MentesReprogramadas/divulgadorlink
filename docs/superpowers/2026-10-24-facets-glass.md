# Redes e nichos: categorias em liquid glass — 24/10/2026

FacetFilters passou a compor Button/ButtonLink existentes com LiquidLens, em lugar do badge textual. Ícones, ordenação, URLs, indicação18+, estado ativo e callback de seleção preservados. CSS local cuida de altura44px, espaçamento e botão Ver mais/menos. Sem dependências ou mudanças em regras de catálogo.

Inspeção Playwright MCP: /rede/telegram e /nicho/jogos em390/1440px, capturas abertas; lista expandida mobile também aberta, sem overflow e com ícones monocromáticos. Três testes existentes de HomeExplore aprovados; lint e tipos aprovados. Build e grafo nos logs output/facets-glass-*.log. Não foi executada a suíte integral E2E com containers nesta correção visual.

Investigação adicional do login relatado: os elementos shark-icon-container/kpm-field-badge e atributosdata-sharkid do erro não estão no Input nem no HTML SSR. No navegador isolado em390/1440px, zero elementos injetados e zero mensagens de hidratação capturadas; digitação foi preservada. A evidência aponta para extensão de preenchimento/senhas modificando o DOM antes da hidratação. Nenhum suppressHydrationWarning, remoção de SSR ou bloqueio do autocomplete foi aplicado. Não houve controle da sessão pessoal/extensão do usuário; é necessário testar com a extensão desativada apenas no localhost para confirmar no ambiente afetado.
