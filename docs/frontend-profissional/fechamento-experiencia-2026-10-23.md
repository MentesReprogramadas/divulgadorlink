# Fechamento da experiência frontend — 23/10/2026

Branch `codex/roadmap-f37-testes`. Segunda rodada da [matriz de 34 tópicos](auditoria-experiencia-2026-10-23.md), após o pedido “Ajuste tudo”. Sem commits, push, deploy, dependências ou serviços novos. Preservadas as alterações preexistentes e concorrentes da árvore.

## Prioridade e resultado

| Prioridade | Lacuna comprovada | Ajuste |
| --- | --- | --- |
| P1 | Falhas de rede/storage interrompiam inicialização e podiam confundir sucesso de envio com falha de limpeza do rascunho. | Novo link permite repetir carregamento de facetas/vagas; preserva edição em memória; avisa sobre persistência indisponível. HTTP 201 continua sucesso mesmo se removeItem falhar. |
| P1 | Formulário longo não orientava o foco entre campos inválidos da etapa. | Resumo focado com links para os controles reais, incluindo combobox; mantém validação de campos visíveis/habilitados. |
| P1 | Erro do root layout não era coberto pelo fallback de segmento. | global-error com html/body, CSS próprio, mensagem pública, recarregamento do documento e saída para o catálogo, independente de providers. |
| P1 | BFF sem política explícita do upstream ficava sem padrão de privacidade. | private,no-store somente quando Cache-Control está ausente; políticas explícitas preservadas. |
| P1 | Home SSR não encaminhava idade; paginação usava esse contexto. | Reutilizado loadCatalog, que encaminha somente age=yes/no validado, sem sessão. Preserva contexto de cursor e proteção do backend. |
| P2 | Voltar do detalhe perdia os lotes adicionais. | Histórico conserva somente caminho, quantidade de lotes e posição; replay pela cadeia atual do backend. Teste anterior reproduziu 48 → 24 em desktop/mobile. |
| P2 | Capas/ícones locais recebiam a mesma imagem em todas as larguras. | srcset/sizes nas superfícies existentes; variantes WebP após os mesmos controles de acesso/moderação/idade/tenant. Só a capa eager do detalhe recebe prioridade alta. |
| P2 | Home vazia não oferecia próximo passo contextual. | Limpar filtros ou publicar, conforme o contexto. Busca já recebeu ações na primeira rodada. |
| P3 | Faltava evidência local repetível de carregamento e resposta. | Laboratório isolado com três amostras por rota/viewport, sem telemetria ou eventos novos. Não representa INP de campo. |

## Decisões de implementação

- Mídia: query de largura aceita somente 64, 128, 320, 640, 960, 1280 e 1600; leitura/transformação ocorre depois dos controles existentes. URLs privadas, externas, data URLs e URLs com query própria não ganham srcset. private,no-store evita reutilização após remoção de aprovação. Sem cache novo. Imagens pequenas não são ampliadas; candidatos maiores podem entregar os mesmos pixels do original. Transformação por requisição conserva esse contrato, mas precisa observação de CPU sob carga real antes de adotar cache.
- Formulário: anexos permanecem somente em memória. Falha ao ler storage não sobrescreve silenciosamente um rascunho existente; gravação ocorre após edição. Nenhum armazenamento de senhas nem retry automático de POST.
- Navegação: o backend sorteia um seed a cada primeira página; persistir/comparar cursores antigos impediria a restauração. Replay usa quantidade e cursores novos, reavaliando elegibilidade e tokens. Itens/ordem podem mudar ao voltar. Limite de replay de 50 lotes, documentado no código; falha preserva as páginas já obtidas e permite continuar manualmente.
- Posição: após lotes adicionais, scroll é salvo no máximo a cada 500 ms, com flush antes de navegação por clique/teclado e em pagehide. Cleanup remove listeners/timer e aborta replay. Teste reproduziu o erro de posição antiga após filtros SPA antes da correção.
- Recuperação global: injeção controlada na cópia de RootLayout provou que reset sozinho mantinha o documento com falha. Retry usa recarregamento nativo para refazer a requisição. O fallback de segmento mantém seu reset existente.
- Escopo: sem prefetch global, virtualização, framework novo ou RUM, pois não há evidência que justifique essas mudanças. Mantidos consentimento, métricas existentes, patrocínio, autorização, moderação e regras comerciais. A divergência histórica sobre análise humana não foi alterada por uma melhoria de apresentação.

## Validação da segunda rodada

Snapshot local em `output/frontend-round2-2026-10-23/validation`, com dependências já instaladas por junction. Frontend/backend são pastas próprias; banco, Redis e portas exclusivos da suíte. Nenhum processo alheio encerrado e nenhuma baseline visual substituída.

| Verificação | Resultado |
| --- | --- |
| Frontend Vitest completo | 184 arquivos / 671 testes passaram após a correção de scroll SPA (`unit-final-current.log`). Após ajustar retry global, suas duas suítes afetadas passaram novamente: 14/14 (`recovery-navigation-final.log`). |
| Frontend lint e tipos, incluindo E2E | Passaram. |
| Backend lint, tipos e build | Passaram. |
| Backend testes de mídia | Cinco testes de domínio passaram; duas provas HTTP com PostgreSQL real passaram na frente de mídia, incluindo variantes, isolamento, idade e remoção. |
| Build frontend de produção | Next 15.5.26 pelo setup E2E, equivalente a next build, em .next-e2e; passou. Avisos preexistentes de CSS/ESLint/raiz do workspace preservados, sem relaxar checks. |
| Recuperação independente | Falha de RootLayout realmente injetada somente na cópia: fallback, ausência de detalhes internos, axe e recuperação por nova requisição passaram em desktop/mobile. MCP isolado confirmou Enter, recuperação e ausência de overflow em 320 px; captura examinada. |
| Integração final | 30/30 passaram em 2,7 min (`e2e-final-current.log`, `final-results.json`): busca/autocomplete, login, formulário, falha global, volta do detalhe e dos filtros, sete cenários de envio/consentimento, publicação/aprovação/substituição/recusa/remoção de anexos. Dois viewports, banco/Redis próprios. |
| Mídia no navegador | currentSrc selecionou variante com width, imagem decodificou, variante retornou 200/no-store/nosniff e depois 404 após remoção. Capa eager/high e cards lazy preservados. Capturas do detalhe e formulário examinadas em desktop/mobile. |
| Axe e detector | Axe sem violações nos estados exercitados de busca, formulário e falha global. Impeccable: seis alvos, resultado []; somente regex no código, sem alegar análise completa da página. |
| Paridade e índice | 27 arquivos próprios conferidos por hash entre workspace e snapshot; nenhuma diferença. RootLayout difere intencionalmente só pela injeção de falha do harness. Grafo incremental local: 7.580 nós / 27.028 relações, sem LLM/API ou clustering. Inclui a árvore compartilhada; CSS/capturas não são modelados. |

A primeira integração teve 28/30: os dois casos de retry global revelaram reset sem nova requisição e motivaram a correção. A seguinte teve 27/30: a fixture de 55 links do teste de histórico não era limpa e podia excluir o link do teste de mídia da primeira página aleatória; o teste de filtro mobile também usava um helper que exigia foco no mesmo controle após navegação/remontagem. Corrigidos cleanup em finally e seleção explícita com assertivas de URL, controle novo habilitado e valor selecionado. O helper de foco permanece intacto nos fluxos sem troca de rota. A rodada final de 30 passou integralmente; não houve retry automático nem atualização de baseline para ocultar falhas.

O único desvio de produção no snapshot é esta condição no início de RootLayout: `if ((await headers()).get('x-e2e-root-failure') === '1') throw new Error('fixture-root-secret')`. E2E usa `E2E_ROOT_FAILURE_FIXTURE=1`, `E2E_RUN_ID=round2-final-20261023` e offset 67. A condição não existe no workspace de produção; o teste a ignora explicitamente em execuções sem esse harness. O teardown removeu os containers próprios e encerrou o servidor da suíte.

## Medição local

Chromium desktop 1440×900 e mobile 390×844; CPU 4×, latência 100 ms, download 200.000 bytes/s e upload 75.000 bytes/s. Três visitas por rota, fontes prontas, janela de observação e interação de busca idênticas. Rotas `/?languageTag=pt` e `/busca?q=Receitas`; fixture estável com um link público. Primeira amostra inclui custo de visita fria; posteriores podem reaproveitar cache. São medidas locais de páginas com texto, sem garantir resultado de capas reais/CDN.

LCP usa a última entrada observada; CLS usa a maior janela de sessão (gap 1 s / máximo 5 s), excluindo deslocamento com interação recente. Tarefas longas e duração máxima de interação são diagnósticos locais. A duração máxima não é INP de campo. Três amostras, servidor localhost e interferência do computador impedem inferência estatística de ganho percentual.

Medianas de três amostras, antes → depois. O “antes” usa a cópia preservada da primeira rodada; a fixture pública/rotas/condições são iguais. CLS máximo é o maior valor observado entre essas três visitas.

| Viewport / rota | LCP (ms) | CLS máximo | Tarefas longas (quantidade / tempo total em ms) | Interação máxima por visita, mediana (ms) |
| --- | --- | --- | --- | --- |
| Desktop / home filtrada | 400 → 384 | 0,00069 → 0,00069 | 1 / 112 → 1 / 138 | 96 → 104 |
| Desktop / busca | 396 → 384 | 0,02057 → 0,02057 | 1 / 111 → 1 / 110 | 128 → 128 |
| Mobile / home filtrada | 664 → 680 | 0,00035 → 0,00035 | 1 / 123 → 1 / 135 | 40 → 32 |
| Mobile / busca | 348 → 340 | 0 → 0 | 1 / 115 → 1 / 104 | 40 → 40 |

Há variação nos dois sentidos; essas amostras não comprovam ganho geral nem regressão causal. Dados completos locais: `performance-samples.json`, `performance-summary.json` e relatórios originais em `output/frontend-round2-2026-10-23`. Nenhum byte economizado, FPS, bateria ou comportamento de CDN foi estimado como medição real.

## Limites e reversão

Não validados: aparelhos físicos, Safari/Firefox, leitores de tela reais, todas as rotas e combinações de zoom, carga/CPU do servidor de mídia em produção, CDN e Core Web Vitals de campo. Nenhuma alegação de conversão, conformidade total ou produção validada.

Reverter somente os trechos desta tarefa e seus arquivos novos. Backups por frente em `output/frontend-round2-2026-10-23/*-before`; preservar mudanças posteriores de outras tarefas. Não restaurar arquivos inteiros nem usar reset/revert indiscriminado. A injeção de falha do root layout pertence exclusivamente à cópia de validação, nunca ao frontend de produção.
