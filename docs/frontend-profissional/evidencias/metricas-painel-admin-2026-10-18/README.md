# Métricas — Meu Painel e administração

18/10/2026. Continuação do padrão aprovado no resultado do destaque: cards, gráficos Recharts, visualizações separadas e tabelas paginadas. Sem novas dependências nesta etapa.

## Auditoria e escopo implementado

| Rota / área | Dados existentes | Aplicação do padrão |
| --- | --- | --- |
| /painel e /painel/visao | Totais cumulativos e contagem por link | Cards com hierarquia; ranking de cliques com gráfico e tabela; links para o resultado; ausência de contagem preserva indisponibilidade. Não inventa série diária. |
| /painel/perfil/metricas | Agregados de visitas, sessões, rolagem e blocos | Resumo em cards, gráficos de comparação para rolagem e cliques por link, tabela com visualizações/cliques/CTR; filtros automáticos. Amostras nulas continuam indisponíveis. |
| /painel/convites — histórico e acessos | Acessos diários por versão | Cards de acessos/versões; linha temporal com soma dos acessos por dia entre versões; tabela paginada geral e de cada versão; datas automáticas. |
| /admin/visao — métricas | Contas, links, cliques, receita e situação dos links | Hierarquia dos cards e gráfico/tabela por situação. |
| /admin/visao — tráfego | Entradas e vistas diárias, páginas, funil, campanhas e consentimento | Cards permanentes; linhas temporais de entradas/vistas; comparação do funil/páginas/campanhas; tabelas; períodos de 7, 30 ou 90 dias aceitos pelo backend. |
| /admin/visao — financeiro | Receita diária, métodos, horários, produtos, estornos, campanhas e pagantes | Cards de receita/líquido/ticket/pagantes; linha de receita; gráficos/tabelas nas demais distribuições; CSV com filtros aplicados; filtros automáticos. |
| /admin/visao — mais clicados / pagadores | Rankings já retornados pela API | Comparação em gráfico e tabela com status, contagens e valores. |
| /admin/visao — buscas | Agregados de termos com limiar de privacidade e paginação no servidor | Cards de total de termos; gráfico e tabela da página atual; filtro automático; servidor mantém 25 itens por página, sem uma segunda paginação no cliente. |
| /admin/visao — retenção | Corte e eventos fora do prazo | Dois cards operacionais; ação preservada. Sem gráfico artificial para uma contagem única. |

Listas operacionais de moderação, contas, pedidos e edição permanecem com suas ações e contratos. O trabalho se concentra nas superfícies de métricas dessas jornadas, não transforma toda lista administrativa em um relatório.

## Componentes e decisões visuais

Primitivas de apresentação em `frontend/src/components/ui`: `metric-cards.tsx`, `metric-chart.tsx`, `metric-chart-renderer.tsx`, `report-view.tsx` e `report.module.css`. Não acessam transporte, sessão, elegibilidade ou preços remotos. O formatador monetário apenas apresenta centavos já calculados.

Recharts é carregado dinamicamente. Cada gráfico apresenta uma métrica com eixos e tooltip, sem misturar escalas monetárias e contagens. As linhas respeitam datas e lacunas nulas; rankings exibem os primeiros 10 itens e indicam que a tabela contém os demais. Tabelas locais têm 7 linhas por página, contador e Anterior/Próxima. As buscas preservam os 25 registros por página da API. Labels longos abreviados no eixo permanecem completos em tooltip e tabela.

Referências: a tela local de resultado aprovada pelo usuário fundamenta hierarquia, densidade, abas e navy; os padrões já documentados de [Carbon Data Table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) fundamentam separação entre dados e navegação inferior; [Recharts](https://github.com/recharts/recharts) fundamenta composição SVG e teclado. Refero não está disponível na sessão. Não houve incorporação de outra identidade ou instalação de biblioteca adicional.

Os únicos ícones adicionados a novos consumidores são voltar/próximo na paginação e download nos CSVs, todos para os mesmos significados existentes. Não alterados os desenhos nem o mapa de navegação.

## Proteções preservadas

- Totais, taxas de conversão, valores monetários, retenção e autorização continuam calculados/validados pelo backend.
- Não foram criados endpoints nem séries fictícias nas telas sem histórico diário. Não foi populado o banco local nesta etapa.
- Não alterados anúncios, surfaceToken, eventos, consentimento, tenant ou amostras mínimas. Sessões diárias de perfil não são apresentadas como pessoas únicas.
- No tráfego, atribuição UTM e cadastros com aceite continuam distintos; etapas de funil não provam percurso da mesma pessoa.
- No financeiro, truncagem continua alertada; taxas/líquido são estimativas existentes. CSV usa o filtro efetivamente aplicado. Salvar taxas permanece ação explícita, sem salvar junto de filtros automáticos.
- Pausar/ativar medição, desativar convite e pedir expurgo mantêm as ações explícitas anteriores. A mudança visual não executa essas operações.

## Validação

Lint e typecheck aprovados. 26 testes em 9 arquivos aprovados: consultas/filtros, indisponibilidade, amostras, efeitos de preferência, taxas, CSV, privacidade, paginação e navegação de ícones. O teste novo da primitiva comprova a última página incompleta, limites e alternância de visualização; os gráficos reais são exercitados no E2E.

E2E usa banco/Redis/serviços próprios com `E2E_PORT_OFFSET=200`, `E2E_RUN_ID=f31-metrics-panel-admin`, `.next-e2e`, frontend 3200 e API 3533. Setup/teardown foram lidos. O nome `f31-...` é exigido pela proteção existente do teste de expurgo; a primeira execução usou outro nome e a proteção recusou somente aquele teste. Não foi enfraquecida para obter aprovação.

Falhas encontradas e corrigidas: nome acessível no fallback de carregamento do gráfico agora tem role status; o seletor da nova tabela de buscas foi corrigido para o papel row; testes aguardam a consulta automática terminar antes de capturar o perfil. Na atualização de buscas, o relatório preserva geometria e fica inerte enquanto aguarda resposta. Não houve aumento de tolerância nem máscaras em regiões alteradas.

## Arquivos e reversão

Além das primitivas novas: `components/domain/panel.tsx`, `components/layout/workspace-dashboard.module.css`, os painéis office/traffic/finance/retention em `app/admin/visao`, `features/profile-interaction/interaction-results.tsx` e seu screen, histórico/screen de redirects e painel de search-opportunities. Testes afetados e novos cenários W07/W08 em workspace-layout foram atualizados. Outros arquivos já modificados no workspace foram preservados.

Reverter somente o diff desta etapa nesses arquivos e retirar os novos módulos compartilhados/InteractionResults. Não desfazer o resultado do destaque da etapa anterior nem mudanças locais de outras tarefas. Sem branch, commit, push ou deploy.

## Resultado final

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm test -- src/app/admin/visao src/components/domain/panel.test.tsx src/features/profile-interaction/interaction-screen.test.tsx src/features/search-opportunities/search-opportunities-panel.test.tsx src/features/redirects src/components/ui/report-view.test.tsx src/components/layout/navigation-icons.test.tsx`: 26/26 testes em 9 arquivos aprovados.
- Build de produção aprovado no setup das duas execuções finais, com `.next-e2e` isolado.
- Execução ampliada de quatro arquivos em desktop/mobile: 38/39 aprovados (3,5 minutos). Inclui W07 (financeiro/tráfego, linha temporal, tooltip por teclado, última página e filtros) e W08 (Meu Painel com gráfico/tabela), além dos testes de navegação, operações, consentimento, autorização e isolamento. Relatório: `e2e-ampliado.json`.
- O único caso restante era F08-E01 mobile: a altura do relatório estava correta, mas o teste comparava coordenadas do viewport antes/depois de o clique rolar a página. A comparação passou a usar posição absoluta no documento, mantendo a tolerância original de 1 px.
- Reexecução dirigida F31-E01/F08-E01 em ambos os viewports, após essa correção e a remoção de um card duplicado na rolagem do perfil: 5/5 aprovados (setup + 4 jornadas, 1,1 minuto). Relatório: `e2e-direcionado-final.json`. Nenhuma falha conhecida ficou pendente.

As verificações Axe dos cenários cobertos não apontaram violações após as correções. Capturas revisadas em Chromium, desktop 1280×720 e mobile emulado 390×844; reflow e zoom de fonte em 320 px/200% nos cenários existentes. Isso não certifica acessibilidade total. Não houve medição de desempenho antes/depois, validação em aparelho físico ou produção; não foi criada baseline visual automaticamente. W07/W08 usam respostas determinísticas somente no navegador de teste para exercitar série longa/paginação; não comprovam números comerciais nem inserem métricas no banco local. As demais jornadas usam fixtures e serviços reais isolados.

| Tela | Desktop | Mobile |
| --- | --- | --- |
| Meu Painel | [Captura](meu-painel-desktop.png) | [Captura](meu-painel-mobile.png) |
| Financeiro | [Captura](financeiro-desktop.png) | [Captura](financeiro-mobile.png) |
| Tráfego | [Captura](trafego-desktop.png) | [Captura](trafego-mobile.png) |
| Métricas do perfil | [Captura](perfil-desktop.png) | [Captura](perfil-mobile.png) |
| Busca administrativa | [Captura](buscas-desktop.png) | [Captura](buscas-mobile.png) |
| Convites | [Captura](convites-desktop.png) | [Captura](convites-mobile.png) |

O teardown removeu apenas os containers e serviços das execuções isoladas; localhost:3000/3333 continua disponível. Nenhum dado demonstrativo adicional foi inserido no ambiente do usuário nesta etapa.
