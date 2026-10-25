# Ondas — fechamento da validação visual, 24/10/2026

## Escopo e evidência

Pedido: concluir as telas e variações pendentes, em desktop e mobile, aplicando o material da preview Ondas em todas as superfícies da plataforma.

A matriz contém 95 famílias de rotas e foi confrontada com os arquivos `page.tsx` existentes, sem rota de página omitida. O inventário atual contém 540 arquivos de produção (420 TSX e 120 CSS), incluindo cinco composições novas desde o inventário de 535. Leitura de fonte, herança de tokens e compilação não substituem a revisão dos pixels. Cada estado nomeado recebe PNG, SHA256, rota, viewport e origem dos dados. Os revisores abrem os recortes de toda a altura e registram a cobertura real. Uma imagem antiga somente fornece evidência de pixels para uma nova captura se o SHA for idêntico; os checks de comportamento da nova execução permanecem independentes.

Referência: `/dev/homes/ondas` e seu detalhe. Demo: `http://ondas.localhost:3013/`. Branch preservada: `codex/roadmap-f37-testes`; sem commit, branch, push ou deploy nesta etapa.

As 32 alternativas experimentais continuam comparáveis entre si. As páginas publicadas por autores preservam os temas contratados; seus controles de gestão e os estados da plataforma seguem Ondas. Não há recoloração silenciosa de conteúdo publicado. A enumeração cobre estados finitos implementados e exercitados, sem alegar todas as combinações possíveis de conteúdo, permissão, conta e regra comercial.

## Correções desta etapa

- Controles compartilhados: checkbox/radio compactos em vidro, estados desabilitados, contraste forçado e foco; calendários usam posicionamento compatível com diálogos e preservam os limites de data. Campos nativos de data nas áreas migradas passaram ao componente existente.
- Popups e disclosures: lente no host persistente, incluindo estados fechados, listas longas, menus e scroll interno. Cabeçalhos de diálogo mantêm leitura sobre prévias claras.
- Feedback: alertas, toasts, badges, suporte e suspensão; mensagens de campo não recebem uma segunda caixa opaca. Estados vazios e falhas de leitura não confirmam falsamente ausência de dados.
- Publicação e moderação: resumo de erros, confirmação de envio e diálogos de destaque receberam material legível, mantendo validações, filas, decisões, preços e elegibilidade.
- Relatórios: tabelas preservam palavras/datas legíveis com rolagem local; avisos de cobertura e ajuda de interpretação usam vidro. Capturas adicionais percorrem colunas e carrosséis, sem presumir aprovação de conteúdo oculto.
- Galeria: a imagem lazy não dispara fallback antes da seleção da fonte. A captura espera também a decodificação da imagem. Um erro real502 do proxy foi registrado como fallback, seguido de recaptura bem-sucedida, sem ocultar o erro.
- Catálogo: o primeiro caractere digitado durante a hidratação deixa de ser apagado; o seletor de links comuns não sobrescreve a cor de texto do botão primário. O aviso de favorito tem superfície própria suficientemente opaca para impedir que os metadados atravessem o texto.
- Imagens e vídeo: falhas de imagem concluídas antes da hidratação agora acionam o fallback. A CSP permite somente os dois hosts de iframe emitidos pelos provedores VIDEO já validados (YouTube sem cookies e Vimeo), preservando as demais diretivas. Os testes interceptam os players localmente; não certificam reprodução em provedores reais.
- Perfil e equipe: nomes de coleções refletem seu texto visível; abas de integrações conservam os alvos ARIA durante erros; cancelamento de diálogos devolve foco ao acionador após o commit. Checkboxes e radios nativos remanescentes usam os controles existentes, mantendo propriedades e regras. Estados de falha de busca e endereço não exibem uma falsa ausência de dados; a falha da prévia do mídia kit usa o shell de plataforma.
- Fechamento dos menus: o menu do editor mantém tinta navy e refração durante toda a rolagem interna; o texto da página não atravessa os itens. A confirmação de desativação monta LiquidLens e usa o mesmo raio do host. Foram recapturados e abertos em desktop e mobile.
- Fechamento de equipe e filtros: carregamentos mostram Skeletons reais; falhas não exibem um segundo cartão de vazio. O feedback dos campos de data fica abaixo da borda. O filtro de estornos sem resultados foi separado do cenário combinado de erro409 com filtro, sem movimentar valores.

Os detalhes e testes focais de cada família estão em `2026-10-24-ondas-{admin,profile,public}-visual.md`. As alterações reutilizam a stack, os contratos e as primitivas existentes; não adicionam bibliotecas de UI, dependências, infraestrutura global ou regras comerciais.

## Hidratação: diagnóstico e regressão

O erro intermitente React418 foi preservado como falha. A instrumentação CDP no chunk original registrou o Fiber esperando `div#main-content` enquanto o cursor DOM já apontava para o `main` dentro desse mesmo elemento. O experimento com efeito de sessão não resolveu o problema e foi revertido.

O runtime embarcado pelo Next15.5.26 é React19.2.0-canary-0bdb9206-20250818, diferente do React19.0.0 usado normalmente pelos testes unitários. A retomada imediata de conteúdo assíncrono reproduz a falha descrita no [PR35494 do React](https://github.com/react/react/pull/35494). A regressão usa o RootLayout e o SiteShell reais com os módulos React/DOM embarcados pelo Next: falhou antes e passou após delimitar os filhos assíncronos com Suspense. Verifica zero erros recuperáveis e preserva a identidade dos nós SSR. Nenhuma dependência foi trocada e nenhum erro foi suprimido.

O fallback desse limite é visível (`RoutePending`), evitando o intervalo de main oculto observado na produção de revisão. `GlobalError` possui uma apresentação autônoma com vidro CSS e ondas estáticas, sem depender dos providers que podem ter falhado. Seus estados de teclado e cores forçadas foram abertos em desktop/mobile na story; isto não equivale a provocar uma falha real de raiz em produção.

## Verificação concluída

Build final de revisão: `OyrbyxuCIMhZESMWfrFDa`, com saída0 e servidor de revisão pronto. A última diferença após o build funcional anterior foi a remoção de linhas vazias no final de três arquivos, sem alterar lógica, estilos ou imports.

| Verificação executada | Resultado |
| --- | --- |
| Lint do frontend | Aprovado; `output/ondas-v24/frontend-lint-verified.log` |
| Tipos da aplicação e E2E | Aprovado; `frontend-types-verified.log` |
| Vitest completo | 200 arquivos e 739 testes aprovados; `frontend-unit-verified.log` |
| Build de produção | Aprovado, incluindo os reparos finais e a CSP restrita |
| Playwright Test, casos únicos por arquivo/título/viewport | 436 de 436 com última execução aprovada; 32 relatórios preservados |
| Rotas, fontes e estados finitos | 95 rotas × desktop/mobile; 540 fontes com hash atual; 1.989 combinações nominais de rota/estado/viewport conciliadas |
| Whitespace e grafo local | `git diff --check` aprovado; Graphify incremental final: 7.741 nós e 27.732 relações |

Os resultados anteriores com falhas permanecem nos relatórios originais. O total436 considera a última execução de cada caso, sem somar repetições como testes novos. O filtro incorreto que retornou “No tests” foi registrado como falha do harness e não conta como caso executado. Diagnóstico e associação exata dos resultados: `output/ondas-demo/reconciliation-closure-proposal/report-outcomes.json` e `output/ondas-v24/closure-evidence-diagnostic.json`.

Desktop principal 1440×900; mobile 390×844. Padrões compartilhados também exercitados em 320/768/1280, texto200%, teclado, foco, reduced-motion, transparência reduzida e cores forçadas. O inventário de pixels inclui 2.928 SHA elegíveis e preserva 861 ocorrências excluídas; SHA idêntico reutiliza somente inspeção de pixels. Confirmar um arquivo atual não libera automaticamente uma ocorrência antiga do mesmo SHA que tinha falha ou estado incorreto.

As 14 diferenças nominais restantes foram lidas e aceitas individualmente pela raiz em `output/ondas-v24/closure-evidence-dispositions.json`: seis identificadores antigos de região horizontal renumerados; duas referências completadas por capturas sobrepostas dos carrosséis; dois players comprovados em viewport; quatro combinações auxiliares de popup/tabela comprovadas separadamente. Os arquivos antigos incompletos continuam excluídos. Não resta recaptura visual pendente no escopo finito enumerado.

As matrizes reais foram atualizadas pela raiz após a revisão: [rotas](ondas-route-matrix.csv) e [componentes](ondas-component-audit-coverage.csv). O fechamento registra hash, consumidores, escopo e limites por arquivo em `output/ondas-v24/component-runtime-closure.json`; resumo em `matrix-closure-summary.json`. O inventário antigo errou ao classificar `home-explore.module.css` como legado: o CSS está ativo nas páginas de nicho, rede e exploração e sua linha foi corrigida. Seis arquivos sem consumidor de produção identificado são registrados como não aplicáveis a uma tela; um arquivo gera metadados. Boundaries do Next têm fonte e composição compartilhada conferidas, sem alegar que todos os timings de streaming foram provocados. As matrizes anteriores permanecem separadas em `output/ondas-v24/*matrix-before-closure.csv`.

A demo foi reiniciada em `http://ondas.localhost:3013/` e inspecionada com Playwright MCP isolado. Home e detalhe usam o mesmo CSS de composição e LiquidLens da referência Ondas. Movimento normal confirmou ondas em execução e refração, sem overflow ou erro de console nos estados examinados; sugestões ficam acima do “Explore no”. Os sete registros válidos da revisão suplementar D/M foram abertos integralmente. Duas capturas feitas antes de rolar as imagens lazy ficaram excluídas e foram substituídas depois da carga/decodificação das dez imagens. Evidência: `demo-restart-verified-profile-review.json`.

Houve revisão independente de busca, RootLayout/RoutePending, retorno de foco, CatalogImage e CSP de VIDEO, confirmando callers e testes sem achar nova regressão concreta. Ela é leitura estática adicional e não substitui os resultados de runtime. Capturas determinísticas, fixtures de apresentação e temas de autores estão identificados nos ledgers das famílias.

## Limites e reversão

Chromium com emulação mobile; Safari, Firefox e aparelhos físicos não foram certificados. A indisponibilidade do iframe externo de pagamento é exercitada como tal; screenshots de fixtures não validam cobrança real, entrega de WhatsApp/e-mail, moderação no servidor ou serviços externos. Nenhuma mensagem real foi enviada nesta validação.

O ambiente utiliza banco/Redis e provedores locais de revisão, sem reset do banco da demo. A API e a demo permanecem processos próprios. A árvore já continha alterações de outras etapas: reversão deve ser por trechos específicos da revisão, preservando alterações anteriores; não usar restauração global dos arquivos como atalho.

O grafo estrutural é atualizado localmente, sem LLM/API ou envio externo. CSS, fotografias, capturas e os arquivos excluídos por proteção continuam fora da comprovação do grafo.
