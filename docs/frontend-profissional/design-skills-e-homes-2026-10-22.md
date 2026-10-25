# Skills de design e segunda exploração das homes

Configuração em 22/10/2026. Pedido: instalar as skills oficiais, tornar o fluxo padrão no Codex e refazer/ampliar as alternativas do catálogo Tem Link Aqui.

## Instalação verificada

| Fonte oficial | Revisão instalada | Pastas globais |
| --- | --- | --- |
| [Emil Kowalski](https://github.com/emilkowalski/skills) | `2d228630ba1446365f614a108cb8252f1feda202` | emil-design-eng, animate, review-animations, animation-performance, animation-vocabulary, find-animation-opportunities, improve-animations |
| [Impeccable](https://github.com/pbakaus/impeccable) | `5cb95eea9c96479f57afe0732a45470d30183326` | impeccable |
| [Frontend Taste](https://github.com/Leonxlnx/taste-skill) | `6010f91a9935f1c167dfc500fb1a475681892e6b` | taste-skill; nome interno design-taste-frontend |

Instaladas com o helper oficial skill-installer, em `C:/Users/ferna/.codex/skills`. Cada pasta recebeu `SOURCE.json` e `LICENSE.upstream` da mesma revisão. Taste frontend é distinta de ecc:taste para vídeo. As regras em `C:/Users/ferna/.codex/AGENTS.md` e no AGENTS.md do projeto aplicam essas skills às tarefas pertinentes; briefing, identidade do produto e proteções do projeto prevalecem. Não foram instaladas bibliotecas no frontend nem hooks automáticos.

## Playwright MCP

Servidor global habilitado em `C:/Users/ferna/.codex/config.toml`, preservando os demais servidores. Usa `npx.cmd -y @playwright/mcp@latest`, `--headless`, `--isolated` e o Chromium já instalado pelo Playwright. O executável explícito evita exigir Chrome adicional nesta máquina. Timeout inicial 90s, ferramenta 60s. O uso de `latest` segue o pedido e poderá resolver uma versão diferente futuramente.

Teste real por cliente MCP em `output/design-skills-2026/check-mcp.mjs`: inicialização, listagem de **25 ferramentas**, navegação `about:blank`, snapshot e fechamento passaram. Servidor reportou `Playwright 1.64.0-alpha-1790635538000`. Evidência: `output/design-skills-2026/playwright-mcp-smoke.json`. Não controlou sessão pessoal. Uma nova sessão/recarregamento do Codex pode ser necessária para descoberta automática; a configuração não injeta ferramentas no turno atual. Playwright Test permanece o executor de regressão.

## Aplicação à tarefa

Impeccable context executado uma vez; contexto do produto registrado em PRODUCT.md a partir do briefing e das regras já existentes. A revisão inicial identificou repetição da estrutura, catálogo distante, alturas vazias nos cards, metadados pequenos e resposta lenta no hover. Os ajustes atingem essas cinco questões.

Taste sorteado no modo community app, seed **22102026**, direção **Accent ladder**, preservando paleta e tipografia. Artefato em `output/design-skills-2026/taste/direction.json`. A recomendação de catálogo compacto alimenta as direções de diretório; não é imposta às demais, pois o pedido explícito é comparar muitos mundos visuais. Vidro, gradientes, shaders e movimento foram pedidos pelo usuário e não são proibidos por preferências estéticas genéricas das skills.

Emil: controles recorrentes respondem em 220–240ms; movimentos ambientais permanecem mais lentos e podem ser pausados. Reduced-motion, toque, foco e alternativas sem GPU continuam no escopo de validação.

A galeria experimental não altera a home pública, preços, quotas, rastreamento de negócio ou permissões. As nove entradas são sintéticas, com fotos e favoritos locais reutilizados. Nenhuma das direções é aprovação estética do usuário.

## Evidências consolidadas da segunda rodada

- Lint e typecheck passaram no frontend final. Suite completa: **162 arquivos, 563 testes unitários passaram**; depois do último acabamento, os três arquivos diretamente afetados passaram novamente, **10 testes**.
- Playwright Test da galeria: **68 testes passaram em 3,9 minutos**, sem atualização de snapshots na execução final. **64 aberturas comparadas** (32 desktop +32 mobile); fotos, contenção dos textos, Axe A/AA, filtros, favoritos, vazio, foco, busca com largura útil, reflow320/768/1280 e zoom CSS200% verificados. Galeria/sequência, retorno de detalhe,404, pausa e WebGL/fallback passaram. Sem escritas BFF pela demo.
- Build final de produção passou na cópia isolada em `output/home-preview-validation/frontend`, preservando o servidor3012. Avisos existentes de workspace/lockfiles, plugin Next ESLint e alinhamento CSS em outras áreas foram registrados em `output/design-skills-2026/build-final.log`. Rotas: galeria6,08kB/112kB FirstLoadJS; estilo11kB/176kB; LiquidGlass5,96kB/170kB. Esses números não medem FPS, LCP, INP ou bateria.
- 33 miniaturas JPEG totalizam5,91MB, secundárias lazy; não são32 fundos rodando juntos. 64 PNGs de regressão das aberturas totalizam27,88MB. Capturas integrais permanecem nas evidências, sem aumentar tolerância.
- Proveniência embutida nos33 JPEGs e varredura de assets: **33rasters,0missing**. São screenshots do app com fotos fixas, não composições geradas por IA.
- Playwright MCP navegou na galeria real e leu **32 entradas**, com snapshot e avaliação sem erro, em contexto isolado. Servidor global25ferramentas; skill discovery exige recarregar o Codex.
- Revisão independente: **ship no escopo das quatro correções pontuadas**, todas resolved. Não equivale à aprovação estética do usuário.

- Liquid Glass e detalhes: **8 testes E2E passaram** na execução final, sem atualizar snapshots, com quatro comparações visuais. Total da rodada: **76 E2E e68 comparações de imagem**. A grade nova do catálogo foi escopada para preservar três relacionados por linha no detalhe desktop.
