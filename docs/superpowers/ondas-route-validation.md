# Ondas — navegação real por rotas, 23/10/2026

## Alcance e ambiente

Inspeção de leitura sobre o build real do frontend em `http://tenant-a.localhost:3100`, API de teste em 3433, PostgreSQL próprio em 5533 e Redis em 6480, coordenados pelo runner do agente principal (`E2E_PORT_OFFSET=100`). Este agente não iniciou runner, setup, teardown ou build.

Chromium 153.0.8010.12, Windows, contextos novos e separados de visitante, usuário da fixture, administrador da fixture e proprietário de `profiles.localhost:3100`. Credenciais foram lidas localmente de `frontend/e2e/state.json` e não foram gravadas nas evidências. Consentimento negado, movimento reduzido e viewports 1440×1080 e 390×844. Login foi a única submissão autorizada; depois dele, requisições de mutação em `/bff/` foram bloqueadas no contexto. Nenhum campo de editor foi alterado, nenhum pagamento, upload, salvamento ou moderação foi acionado.

Foram navegadas **75 das 95 rotas**, nos dois tamanhos: **150 estados**, medidos individualmente por status HTTP, URL final, h1, texto principal, overflow, erros de página e Axe WCAG 2 A/AA, 2.1 A/AA e 2.2 AA. IDs dinâmicos de links vieram exclusivamente de `fixture.receitas`, confirmado pelo próprio detalhe renderizado. Nenhum ID foi inventado ou testado por tentativa.

Todos os 150 estados auditados passaram no Axe de página fechada e tiveram medição de overflow horizontal sem excesso. Isso inclui estados sem recurso/perfil e redirecionamentos e **não significa 75 jornadas aprovadas**. A matriz registra essas diferenças. O h1 está ausente na prévia de mídia kit sem página criada, e duas rotas redirecionaram conforme a sessão usada.

O lote principal terminou com código 0. Quatro estados de Aparência/Conteúdo foram repetidos com código 0 após corrigir o helper de captura que encontrava dois rodapés, um do produto e outro da prévia. `merged.json` usa os quatro resultados corrigidos. Essa correção foi apenas no script de evidências.

## Matriz e evidências

`docs/superpowers/ondas-route-matrix.csv` preserva rota, arquivo, família e coluna de implementação. Somente as colunas de evidência foram atualizadas.

| Situação registrada | Rotas |
| --- | ---: |
| Renderização de leitura | 66 |
| Formulário de denúncia aberto sem enviar | 1 |
| Estado sem token em convite, cancelamento de resumos e recuperação | 3 |
| Página explícita de não encontrado | 1 |
| Prévia bloqueada por ausência de perfil | 2 |
| Verificação redireciona usuário já verificado | 1 |
| Alias `/painel/visao` redireciona para `/painel` | 1 |
| Recurso dinâmico/publicação ainda não resolvido | 14 |
| Galeria `/dev` excluída do build de produção | 6 |
| **Total** | **95** |

As 14 pendências de recurso são: três rotas de campanhas/canais de perfil, distribuição de convite, três rotas de equipe, coleção, verificação e cinco publicações personalizadas. Não houve navegação para slugs ou IDs desconhecidos nem aprovação baseada em um 404.

As ferramentas de perfil foram visitadas com a fixture de `profiles.localhost`, que estava sem perfil salvo. Dependendo da ferramenta, o resultado foi editor inicial, seleção de temas, bloqueio de plano ou convite para criar uma página. O editor populado, recursos pagos, campanhas e publicações não foram validados por esses estados.

Pasta absoluta de evidências: `C:/VSCODE/divulgadorlinks/output/ondas-platform-routes/`.

- `audit.cjs`, `report.json`, `recheck.json` e `merged.json`: navegações e resultados por rota/tamanho.
- `public-interactions.cjs` e `public-interactions.json`: busca `q=receitas`, opções de idioma abertas e home a 928×884.
- `select-focus-guards.json`: repetição do achado Axe após 1,2 s e sequência de foco por Tab.
- `chart-contrast.json`: amostras de pixels da barra e fundo adjacente no gráfico administrativo.
- `zoom-overflow.cjs` e `zoom-overflow.json`: caixas, estilos e ancestrais de overflow a 320 px com fonte normal e ampliada.
- `finalize.cjs` e `summary.json`: consolidação e verificação de 95 registros sem alterar as quatro primeiras colunas da matriz.

## Revisão visual executada

Foram abertas e examinadas **24 capturas**, correspondentes a 12 rotas nos dois tamanhos: home, busca vazia, nicho Jogos, detalhe Receitas, painel, novo link, visão geral do perfil, aparência, conteúdo, diagnóstico, configurações administrativas e visão administrativa. Outras **cinco capturas** foram abertas: busca com resultado em desktop/mobile, opções de idioma em desktop/mobile e home a 928 px. A coluna `reviewed-initial` significa somente revisão inicial do estado capturado; as demais rotas continuam `pending` nas colunas visuais.

A home real mostrou os dois itens públicos da fixture. O texto sentinela de XSS permaneceu texto visível. Os cards sem imagem não reservaram área vazia. O detalhe mostrou a descrição e os links relacionados; busca por receitas retornou a entrada esperada. Campos, menus de seleção e ações apresentaram texto legível sobre superfícies escuras. A prévia personalizada do editor manteve sua paleta clara, distinta da ferramenta Ondas.

Arquivos representativos, todos nessa pasta absoluta:

| Alvo | Arquivos |
| --- | --- |
| Home real | `1440-home.png`, `390-home.png`, `928-home.png` |
| Busca vazia e com resultado | `1440-busca.png`, `390-busca.png`, `1440-search-results.png`, `390-search-results.png` |
| Idioma aberto | `1440-language-options.png`, `390-language-options.png` |
| Nicho e detalhe | `1440-nicho-slug-.png`, `390-nicho-slug-.png`, `1440-link-id-.png`, `390-link-id-.png` |
| Painel e novo link | `1440-painel.png`, `390-painel.png`, `1440-painel-links-novo.png`, `390-painel-links-novo.png` |
| Ferramentas de perfil | `1440-painel-perfil.png`, `390-painel-perfil.png`, pares `painel-perfil-aparencia`, `painel-perfil-conteudo` e `painel-perfil-diagnostico` |
| Administração | `1440-admin-configuracoes.png`, `390-admin-configuracoes.png`, `1440-admin-visao.png`, `390-admin-visao.png` |

## Achados materiais

### Gráficos navy sobre painel escuro

Em `/admin/visao`, as barras de “Publicação no catálogo” ficam quase indistintas do fundo em desktop e mobile. A amostra da captura desktop encontrou barra RGB(10,25,47) no ponto (600,715) e fundo adjacente RGB(14,41,61) no ponto (750,715): **1,18:1**. Isso fica abaixo da referência de 3:1 para objetos gráficos essenciais e dificulta comparar comprimentos. O modo Tabela continua disponível, mas não corrige a leitura da visualização gráfica.

Causa confirmada no build inspecionado: `frontend/src/components/ui/metric-chart-renderer.tsx`, linha 15, usa `var(--color-brand-navy)` em `Line` e `Bar`; o token de marca continua navy. O agente principal informou ter trocado a série para cor legível no código-fonte. **Essa correção precisa ser conferida no próximo build**; as evidências deste relatório ainda mostram o build anterior. `/admin/visao` permanece `issues-chart-contrast` na matriz até nova captura.

### Marca transborda com fonte ampliada a 320 px

Teste adicional em `/painel` e `/admin/visao`, com `document.documentElement.style.fontSize='200%'`, reproduziu `scrollWidth=361` para viewport de 320 px. Em tamanho normal, ambas mediram 305 px, considerando a reserva da barra de rolagem.

A marca e sua imagem mediram x=16, largura=345 e borda direita=361, enquanto header/body mediram 305 px. A marca não tinha limite máximo de largura; a imagem escalava com a altura em rem. No admin, o botão Tabela alcançou 325,7 px, porém ficou contido no ancestral `overflow-x:auto`, sem explicar um transbordamento de 1753 px.

O agente principal informou estar corrigindo o limite da marca no código-fonte. A correção não foi validada neste build. O transbordamento de 1753 px informado em outro cenário administrativo não se repetiu na seção Métricas inicial; falta reproduzir a seção/estado exato. Este ensaio de tamanho de fonte **não equivale a testar zoom real do navegador em 200%**.

### Select aberto e guards de foco da dependência

Com Idioma aberto na busca, Axe retornou `aria-hidden-focus` em quatro spans `data-base-ui-focus-guard`, nos dois tamanhos. O resultado persistiu após 1,2 s. O código instalado de `@base-ui/react/utils/FocusGuard.js` define esses spans com `tabIndex=0` e `aria-hidden=true` no Chromium.

O teste por Tab saiu corretamente para Participação, favorito, link e Termos, sem parar nos guards. O popup e o foco estavam visíveis e legíveis. Registrar como **achado automático da dependência a revisar**, sem afirmar armadilha de foco nem certificar que seja falso positivo. Nenhuma regra Axe foi suprimida.

## Limites e próxima conferência

Dois erros de página `Failed to fetch` no detalhe coincidiram com o bloqueio intencional dos POSTs de métricas. O bloqueio impediu interferência nas contagens usadas pelo runner; esses erros não foram tratados como prova de falha real do catálogo. Fora de analytics não houve tentativa de mutação registrada após o login.

As capturas usam o estado vivo da fixture, compartilhado com os testes do agente principal. Ordem de cards e contagens podem mudar durante a suíte; estas imagens são evidência de inspeção, não goldens determinísticos para aprovação automática.

Não foram testados upload, publicação, moderação, pagamento, estados populados de perfil, fixtures dinâmicas ausentes, ausência de GPU/backdrop, aparelho físico, leitor de tela ou zoom real. Lint, tipos, Vitest, build e Playwright Test são coordenados pelo agente principal e não foram repetidos aqui.

Nenhum arquivo de implementação foi alterado por este agente. Próximo passo: conferir o novo build com os ajustes de gráficos/marca e resolver recursos pendentes com fixtures apropriadas, sem marcar a migração completa apenas por herdar tokens.
