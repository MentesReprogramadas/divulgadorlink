# Auditoria da experiência frontend — 23/10/2026

Branch: `codex/roadmap-f37-testes`. Comparação dos 34 tópicos da pesquisa com o frontend atual. Análise dirigida ao código real de catálogo/busca, primitivas, conta, transporte e amostras de painel/administração; não é certificação de todas as rotas nem de produção.

Segunda rodada após “Ajuste tudo”: implementação das lacunas comprovadas de mídia, formulário, recuperação global, cache e retorno ao catálogo. Evidências e limites finais em [fechamento da experiência](fechamento-experiencia-2026-10-23.md). Os números da primeira rodada abaixo permanecem como histórico.

## Prioridades executadas na primeira rodada

| Prioridade | Antes | Depois | Impacto / aceite |
| --- | --- | --- | --- |
| P1 — distinguir falha de vazio | Autocomplete convertia HTTP não-200 e falha de rede em lista vazia. | Mensagem de falha com retry; ausência de sugestões só após sucesso vazio. | Usuário pode recuperar a consulta sem acreditar que não existe conteúdo. Testes HTTP/rede e browser. |
| P1 — recuperação de segmento | Somente o perfil público tinha error.tsx próprio. Erros de renderização nas demais rotas não tinham fallback local da marca. | `app/error.tsx` reutiliza ErrorState e reset, com saída para catálogo. | Não revela mensagem interna; não recria layout nem mexe em autorização. Não captura falhas do root layout. |
| P1 — teclado em diálogo | Filtro manual de Tab omitía select nativo e incluía botões de diálogos filhos. | Controles visíveis/habilitados, tabindex válido, sem inert e pertencentes ao próprio diálogo. | Tab/Shift+Tab incluem select; filhos não contaminam o ciclo. Fechamento protegido continua. |
| P2 — trabalho de busca | Cada tecla gerava consulta; respostas antigas eram ignoradas, mas o trabalho seguia ativo. | Pausa de 350 ms + AbortController; invalidação ao mudar consulta/filtros, sair, limpar, fechar e desmontar. | Entrada continua imediata; somente a consulta atual pode alterar sugestões. Não impede trabalho que o servidor já iniciou. |
| P2 — acessibilidade do autocomplete | aria-controls apontava para lista ausente; descendente ativo sobrevivia ao fechamento; composição IME não era tratada. | ARIA acompanha a lista real, seleção é limpa; composição não dispara busca intermediária nem navegação. | Testes de Escape/blur/limpeza/IME/filtro e axe em erro e resultado. Retry devolve foco ao campo antes de remover o botão. |
| P2 — página de resultados | Proteção por sequência já existia; não havia cancelamento, anúncio explícito do total nem saída contextual do vazio. | Cancelamento de consulta superada, contagem anunciada, limpar filtros preservando q ou explorar catálogo. | Preserva surfaceToken, queryId, idade, patrocínio e filtro; não mantém conteúdo de outra consulta durante carregamento. |
| Validação — tipos dos testes | Quatro consultas de Testing Library em dois testes usavam `exact`, opção inexistente em ByRoleOptions. | Removida somente a opção; strings de nome já são comparadas exatamente pela biblioteca. | Libera typecheck sem mudar as assertivas de moderação. |

## Matriz dos 34 tópicos

Estado descreve a base encontrada e as melhorias desta tarefa. P1 = falha funcional/acessibilidade; P2 = melhoria direta; P3 = investigar com medição ou aplicar somente quando necessário. “Condicional” não significa funcionalidade obrigatória ausente.

| # | Tópico | Já temos / evidência | Falta, melhoria ou decisão |
| --- | --- | --- | --- |
| 1 | Skeletons | `components/feedback/skeleton.tsx`, `workspace-skeleton.tsx`, skeletons de features e 37 loading.tsx encontrados na consulta inicial. Conteúdo decorativo oculto e inert. | Existe. Validar alinhamento na jornada afetada; não adicionar mais skeletons indiscriminadamente. |
| 2 | Skeleton/spinner/progresso | SkeletonRegion, Button.loading e Loading. | Existe. Progresso determinado é condicional a operação que exponha progresso real; não inventar porcentagens. |
| 3 | Lazy loading | CatalogImage usa lazy por padrão e eager opcional; perfil tem imagens lazy. | Existe. Auditar a primeira imagem efetivamente visível antes de mudar prioridades. |
| 4 | Prioridade de conteúdo principal | Home e facetas têm conteúdo inicial no servidor; capa do detalhe já usa eager. | P2 executado: fetchPriority=high somente nessa capa; catálogo continua lazy. Medição local de duas rotas, sem inferir resultado de campo ou de todas as imagens. |
| 5 | Reserva de espaço | Capa de LinkRow tem aspect-ratio 1.6; ícones têm 32×32; avatar de perfil tem dimensões; skeletons estruturais. | Parcial: não medimos CLS de todas as rotas e falhas de mídia. CSS também reserva espaço; ausência de width no HTML não prova CLS sozinho. |
| 6 | Imagens responsivas | CatalogImage usa DTO de mídia aprovada e fallback; perfil preserva entrega existente. | P2 executado: srcset/sizes em cards, detalhe e coleções, ícones 64/128 e capas 320–1600. Variantes WebP limitadas no endpoint existente, após autorização; private,no-store preservado. URLs externas/privadas não são reescritas. |
| 7 | Código sob demanda | `ui/metric-chart.tsx` e gráficos de performance usam dynamic. Server Components no catálogo/landing. | Existe. Extender somente com evidência de bundle/rota pesada. |
| 8 | Fontes | RootLayout usa next/font, Source Sans 3/Outfit, latin, display swap. | Existe. Não medimos deslocamento causado pela troca de fonte. |
| 9 | Prefetch | Muitos links públicos são âncoras nativas; alguns fluxos usam router. | Condicional/P3: ausência de prefetch generalizado não é defeito. Medir próxima navegação e consumo antes de ativar. |
| 10 | Atualização sem apagar dados | `use-resource-state.ts` preserva ready para mesma chave; home mantém itens ao paginar; várias features adotam o hook. | Parcial por jornada. Busca troca o conjunto ao mudar critério de propósito, evitando mostrar dados da consulta anterior. |
| 11 | Estados vazios | EmptyState reutilizável com action, usado em várias features. | P2 executado: busca oferece limpar filtros/explorar; home oferece limpar filtros ou publicar conforme o contexto. |
| 12 | Erros recuperáveis | ErrorState com retry; home preserva itens quando paginação falha. | P1 executado: falha distinta no autocomplete, fallback de segmento e global-error independente de providers/root layout; sem detalhes internos. |
| 13 | Debounce | useDebouncedValue em descoberta, contatos, clientes e webhooks; filtros usam 350 ms. | P2 executado no SearchBox compartilhado por home, facetas e busca. Timer segue padrão já usado nos filtros. |
| 14 | Cancelamento/ordem | Busca e autocomplete já tinham identificação de sequência. | P2 executado: AbortController + manutenção da proteção de sequência; não prometer cancelamento do processamento no backend. |
| 15 | Feedback ao clicar | Button oferece loading, disabled, spinner e aria-busy. Home bloqueia duplicação com ref. | Existe. A presença da prop não comprova uso correto em todas as ações; amostragem de login/cadastro/paginação. |
| 16 | Retry seguro | Cobrança e destaque enviam idempotency-key; API só repete chamada após refresh conforme contrato existente. | Preservado. Nenhum retry automático de POST adicionado. |
| 17 | Preservar formulário | Login/cadastro mantêm valores; novo link já tinha rascunho local. | P1 executado: falhas de storage não destroem rascunho anterior, avisam o usuário e mantêm edição em memória; falha de POST preserva dados. Falha ao apagar rascunho após 201 mantém sucesso. Nenhuma persistência de senhas adicionada. |
| 18 | Erros de campo/resumo | Field associa erro/hint ao controle, com aria-invalid. | P1 executado no formulário longo de novo link: resumo focado por etapa com links que levam ao campo real, inclusive combobox; validação nativa preservada. Sem abstração global nova. |
| 19 | Labels/instruções | Field cria label associado; SearchBox possui label acessível. | Existe nas superfícies inspecionadas. Não equivale a inventário completo de controles. |
| 20 | Autofill/teclado | Login/cadastro/recuperação usam autocomplete; campos financeiros e outros usam inputMode. | Existe, com amostragem. Validar aparelho real e provedores de autofill depois. |
| 21 | Status acessível | SkeletonRegion/EmptyState/status de paginação e várias operações. | P2 executado: contagem da busca e anúncio de sugestões; ARIA só referencia opções existentes. |
| 22 | Semântica/teclado | Button/âncoras, landmarks, cabeçalhos, Field; Select composto existente com Base UI. | P1 executado no ciclo de Tab do OverlayDialog. Não substituir controles existentes. |
| 23 | Foco visível/obstrução | foundations.css define focus-visible; SiteShell fornece skip link; banner de consentimento mede sua altura. | Parcial: não há prova de todos os overlays/zoom. Retry da busca agora restaura foco; não alteramos banner nesta tarefa. |
| 24 | Modais | OverlayDialog usa dialog.showModal, cancel/Escape, scroll lock e returnFocusTo opcional; testes já existiam. | P1 executado: ciclo de foco por diálogo. Retorno automático depende também do comportamento nativo e do consumidor. |
| 25 | Toque | Botão global com min-height 44px, menu com 44px, links de sugestões com 64px. | Existe nas amostras. Não certificamos todas as ações pequenas. |
| 26 | Contraste | Tokens de texto/foco e suíte axe já instalada. | Verificar a renderização dos estados desta fatia; vidro depende do fundo. Não concluir conformidade de toda plataforma por tokens. |
| 27 | Reflow/zoom | CSS responsivo e suítes desktop/mobile existentes. | Teste desta fatia em 320px equivalente à referência de reflow; emulação não substitui aparelho ou todos os modos de zoom. |
| 28 | Motion reduzido | Skeleton, spinner e várias folhas respeitam prefers-reduced-motion; fundo tem controles/fallbacks próprios. | Existe. Não medimos FPS/bateria; nenhuma animação nova adicionada. |
| 29 | Restauração de contexto | Filtros na URL e scroll:false; suporte mantém padrão próprio. | P2 executado após reproduzir 48 → 24 no retorno: histórico guarda caminho, quantidade de lotes e posição; recarrega pela cadeia atual de cursores. Sem cartões/tokens persistidos. SSR encaminha idade validada pelo transporte existente, preservando o contexto da paginação. |
| 30 | Listas grandes | Home usa cursor/deduplicação; várias telas usam paginação. | Virtualização condicional, sem necessidade comprovada. Não adicionar biblioteca nem alterar semântica do catálogo. |
| 31 | Resposta durante visita | Gráficos lazy, debounce em várias jornadas e controles pendentes. | Consultas do autocomplete reduzidas; laboratório local registra tarefas longas e interação máxima sob condições fixas. Essa interação não equivale ao INP de campo; sem ganho percentual prometido. |
| 32 | Cache privado | BFF encaminha cache-control; transporte separa host/cookies/workspace. | P1 executado: upstream sem Cache-Control recebe private,no-store; política explícita é preservada. Testes de cookies, host, 204 e cabeçalhos; sem inferir estado de CDN/produção. |
| 33 | Core Web Vitals reais | Ferramentas locais, sem telemetria de campo ativada. | Medição local repetida antes/depois em desktop/mobile com CPU/rede fixas, LCP/CLS/tarefas longas e interação. Campo e aparelhos físicos dependem de infraestrutura/consentimento; nenhum serviço ou evento novo. |
| 34 | Estados difíceis | E2E já cobrem loading, descoberta, conta e checkout. | Cobertura ampliada para retry/cancelamento, resumo por teclado, storage bloqueado, POST sem rede, falha do root layout, mídia aprovada/removida e retorno ao catálogo. Resultados da segunda rodada no fechamento vinculado acima. |

## Matriz de jornadas e proteções

| Rota / público | Tarefa | Estados avaliados | Proteção preservada |
| --- | --- | --- | --- |
| `/`, facetas e `/busca` / visitante | Encontrar e abrir conteúdo | sugestão carregando, falha, vazio, pronta, fechada; consulta superada | facetas, idade, patrocinado e surfaceToken; SearchBox compartilhado |
| `/busca` / visitante | Consultar resultados | falha, retry, vazio, contagem, filtro e resposta antiga | queryId, URLs e cartões de resultados; sem mudança de regra de busca |
| `/login`, cadastro / visitante | Autenticar | falha com campos preservados e botão liberado | sessão, CSRF, consentimento e capacidade do servidor |
| painel/administração / autenticado | Operar diálogos e formulários | Tab, Shift+Tab, diálogo filho e fechamento protegido | readOnlyAllowed e política de suporte existentes |
| segmentos sob app / qualquer público | Recuperar renderização | erro com mensagem pública e reset | layout compartilhado preservado; sem revelar detalhes internos |

## Validação da primeira rodada e limitações

| Verificação | Resultado |
| --- | --- |
| Vitest completo, snapshot isolado | 180 arquivos, 628 testes passaram (`unit-isolated.log`). |
| Typecheck, incluindo E2E | Passou (`types-isolated.log`). |
| Lint frontend | Passou (`lint-isolated.log`). |
| Detector Impeccable dos cinco alvos de UI | `[]`, nenhum achado mecânico. Não certifica acessibilidade nem comportamento. |
| Revisão independente final | Quatro suítes/17 testes passaram; nenhum bloqueio restante no escopo revisto. |
| Playwright MCP | Chromium isolado: falha de sugestões em 390×844 sem overflow; em 1440×900, retry devolve foco, setas selecionam e Escape limpa expanded/descendente ativo. Duas capturas geradas e examinadas. |
| Build de produção | Passou pelo Next 15.5.26 do pacote, chamado pelo setup E2E (`next build`, mesma execução do script npm build), em `.next-e2e` do snapshot. Com avisos CSS/ESLint preexistentes; sem relaxar checks. |
| E2E desktop/mobile | 6/6 passaram em 3,3 min (`e2e-final.log`), incluindo preparação/build. Buscas reais usam banco isolado; erros/atrasos/login indisponível são respostas controladas no navegador. Axe sem violações nos estados de erro/sugestões/vazio exercitados. |

Os primeiros 16 testes direcionados passaram; a primeira suíte completa teve 625/627 e os dois casos passaram numa repetição dirigida posterior, enquanto a árvore recebia mudanças concorrentes. Não atribuir esses reparos a esta tarefa. A suíte congelada posterior passou integralmente, com 628 testes.

Primeiro E2E não chegou aos testes: build compartilhado falhou ao coletar módulos de páginas. Há outro `e2e/serve.mjs` ativo e escrita concorrente no log/build compartilhado; isso é evidência de ambiente não isolado, não prova da causa única. Validação repetida em snapshot local sem locks/copias de runtime, usando frontend/src atual, dependências instaladas por junction, banco/Redis/portas próprios com offset 47. Nenhum processo alheio encerrado. Comando que incluía remover um lock copiado foi bloqueado pela revisão automática; foi abandonado em favor da cópia limpa.

Revisão independente somente leitura encontrou ARIA expanded sem lista real e perda de foco no retry; ambos corrigidos e revistos novamente. Testes exigem foco real no campo após retry, sem foco artificial no E2E. Nenhum novo bloqueio foi relatado nos demais trechos revisados.

O primeiro E2E isolado teve dois casos passando e quatro interrompidos por seletores que capturavam também o anunciador de rotas do Next (`role=alert`). Seletores corrigidos para o main; nenhuma expectativa de produto relaxada. Na inspeção MCP após o teardown dessa primeira passagem, o documento já carregado foi mantido e as sugestões receberam respostas controladas; falhas de transporte no conteúdo subjacente eram esperadas, pois a API de teste havia sido encerrada. Essa inspeção prova o popup e o teclado, não disponibilidade da API. Evidências principais: `mcp-mobile-error.png`, `mcp-desktop-suggestions.png`. Na passagem final, MCP confirmou também `1 link encontrado.`, link Receitas e surfaceToken contra a API própria ativa, sem overflow (`mcp-desktop-results.png`, imagem examinada). Captura final E2E `search-reflow-320.png` do projeto mobile examinada: leitura e controles íntegros em 320px. Nenhuma baseline visual antiga foi substituída.

O snapshot compartilha somente dependências instaladas por junction. A fixture de seed foi sincronizada entre os dois diretórios locais de validação porque o caminho físico do backend resolve a junction; estes testes públicos não consomem IDs de state.json. Hashes dos onze arquivos próprios de implementação/testes/configuração conferidos entre workspace e snapshot (`source-hashes.json`). O grafo foi atualizado incrementalmente sem LLM/API: 7555 nós/26945 relações, incluindo mudanças concorrentes. Ajuste posterior de seletores E2E não altera as relações estruturais.

Não executados: auditoria de todas as rotas, suite completa E2E do produto, Safari/Firefox, aparelho físico, leitor de tela real, medição de campo LCP/INP/CLS e auditoria de CDN/cache/backend. Reflow de 320px não equivale a validar toda combinação de zoom. Fallback de segmento e select nativo em diálogo têm testes de componente; não foi injetada falha de root layout nem validado select nativo em um diálogo de produção. Sem novas dependências, serviços externos, cobranças, mudanças comerciais ou deploy.

## Fontes e divergências

- Código e grafo local consultados antes das mudanças; relações confirmadas nos consumidores. CSS não é modelado pelo grafo.
- `README.md` do programa ainda descreve ausência de Base UI, mas package.json/código atuais já a usam. A auditoria segue a implementação existente; não instalou dependências.
- Carbon: [loading](https://www.carbondesignsystem.com/building-blocks/core/patterns/loading), [empty states](https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states). Fundamentam distinção de estados e recuperação, preservando a marca Ondas.
- WAI: [dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/), [status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). Fundamentam teclado/foco e anúncio dos resultados.
- Next: [error.js, documentação v15](https://nextjs.org/docs/15/app/api-reference/file-conventions/error). A documentação consultada identifica v15.5.28; pacote local v15.5.26. Não houve atualização de versão.

## Reversão

Não usar git reset/revert nem restaurar arquivos inteiros: a branch tem centenas de alterações preexistentes e concorrentes. Remover somente os trechos desta tarefa e seus arquivos novos. Cópias anteriores dos arquivos tocados e logs em `output/frontend-experience-audit-2026-10-23/`; mudanças de outras tarefas após essas cópias também devem ser preservadas. Nenhum commit/push/deploy executado.
