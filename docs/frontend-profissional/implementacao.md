# Implementação e revisão das telas

Data: 15/10/2026. Execução autorizada pelo usuário para todas as telas, em lotes tecnicamente verificados. Este documento registra o resultado implementado; os documentos de proposta anteriores permanecem como histórico de decisões.

## Direção aplicada

Base: identidade própria navy/turquesa do Tem Link Aqui. A superfície esverdeada foi substituída por neutro frio para separar melhor conteúdo, controles e área de trabalho. Source Sans 3 permanece para leitura; Outfit unifica títulos, componentes e catálogo. Source Serif 4 deixou de ser carregada; o alias antigo foi preservado para os consumidores existentes.

Atlassian fundamenta hierarquia tipográfica, espaçamento e papéis; Linktree foi inspecionado para clareza de proposta/próxima ação, sem copiar sua identidade ou promessas; GOV.UK fundamenta identificação e recuperação de erros; referências de craft complementam foco, formulários e contraste. Refero não foi necessário como fonte exclusiva. A apresentação ilustrativa da landing está identificada como exemplo e não afirma audiência real.

## Mudanças concretas

- /divulgar ganhou composição própria, hierarquia clara, publicação gratuita, CTA derivado da sessão e processo de envio. Carregamento permanece exclusivo do servidor e apresentação fica em features/acquisition.
- SiteShell separa estrutura compartilhada do layout raiz, com navegação nomeada, atalho de teclado para o conteúdo e rodapé consistente. Links e destinos originais foram preservados.
- Tokens têm primitivas e nomes semânticos; aliases mantêm compatibilidade. globals.css virou um manifesto de imports ordenados. O CSS anterior foi separado em nove responsabilidades sem reordenar suas declarações: foundations, authentication, components, discovery, consent, catalog, workspace, promotions e operations.
- A área de sessão, proteção, suspensão e navegação saiu de panel.tsx para features/account/components/area-frame.tsx, com reexports compatíveis. O restante não sofreu uma reorganização artificial de toda a árvore.
- Field agora associa explicitamente label, controle, dica e erro; mantém ids e descrições externas. Button oferece loading, aria-busy e bloqueio enquanto aguarda. Estados comuns de vazio, erro e carregamento têm apresentação e semântica consistentes.
- Login, cadastro, recuperação de senha, novo envio e contestação recuperam o formulário após falha de rede. O envio mantém o rascunho e apresenta os campos em ordem adequada, com agrupamento semântico de tema/rede.
- Conta, pedidos e administração receberam contexto de tarefa e espaçamento consistente. Erros de configurações/estornos não são confundidos com sucesso ou lista vazia.
- Páginas não encontradas oferecem retorno ao catálogo e busca. Links no texto são distinguíveis sem depender somente de cor. A trilha identifica a página atual.
- A auditoria axe identificou e motivou correções na semântica de impressões e nos nomes acessíveis de arrastar planos e selecionar catálogos. A ordem de planos passou a poder ser alterada também pelas setas no teclado.

## Cobertura de navegação

A coleta real percorreu 31 destinos em 1440×900 e 390×844, incluindo alias, query de busca e página inexistente; são 62 capturas, não 31 templates diferentes. Não houve rolagem horizontal na coleta final em desenvolvimento.

A suíte de qualidade também percorre as seções internas da gestão e do painel e as abas de dados disponíveis, exercita abertura/fechamento do editor de planos, teclado e recuperação de falha na busca e no login. Os erros encontrados pela auditoria são corrigidos na aplicação; mudanças de localizadores de teste refletem o combobox real da busca e distinguem alertas da interface do anunciador de rotas do Next.

| Área | Destinos e estados observados |
| --- | --- |
| Descoberta | /, /busca, busca com consulta, /nicho/jogos, /rede/telegram e /link/:id |
| Aquisição/acesso | /divulgar, /login, /cadastro, /esqueci-senha e /recuperar-senha sem token |
| Informação/recuperação | /termos, /privacidade, /nao-encontrado e rota inexistente com 404 |
| Conta/publicação | /painel, alias /painel/visao, /painel/links, novo link, editar, destacar, contestar, pedidos, conta e verificar |
| Operação | /admin/visao, moderação, planos, configurações, integrações e estornos |

Usados somente dados do seed local e serviços de teste. Conteúdo como o nome de teste de XSS é fixture, não conteúdo de produção. Emulação mobile em Chromium não equivale a validação em aparelho físico. Visitas a uma rota não comprovam, sozinhas, todos os seus estados: a suíte funcional cobre as jornadas e a suíte de qualidade acrescenta acessibilidade/estados e screenshots estáveis.

## Catálogo de componentes

Storybook 10.6.2 com @storybook/nextjs-vite foi adicionado como ferramenta de desenvolvimento, sem biblioteca de UI. Stories cobrem ações primária/secundária/destrutiva, disabled, loading, navegação, campos com dicas/erros, feedback e landing. A prévia importa os mesmos tokens/estilos; sem next/font no ambiente isolado, usa fallbacks locais em vez de buscar fontes externas.

Executar npm run storybook no frontend para abrir o catálogo; npm run build:storybook produz a versão estática. Esta ferramenta tem custo de dependências de desenvolvimento e build, mas permite inspecionar estados fora das rotas. Não substitui o teste real de cookies, BFF, tenant e pagamentos.

## Regressão reproduzível

npm run test:visual usa playwright.visual.config.ts: verifica as jornadas públicas, de usuário e de administração em desktop/mobile, testa teclado, formulário e diálogos, procura controles sem nome e executa axe para critérios A/AA selecionados. Seis telas estáveis por viewport têm screenshots comparáveis; resultados mudam o status do teste, sem suprimir regras para obter verde.

As imagens iniciais foram produzidas no Windows/Chromium desta estação após revisão das capturas. Antes de executar comparação em Linux/CI, produzir e revisar baselines desse ambiente ou padronizar o runner. Não regenerar baselines automaticamente a cada execução. O comando normal deve passar comparando as imagens existentes, sem --update-snapshots.

O log do servidor de teste foi movido para e2e/.runtime/server.log, fora da pasta de resultados que o Playwright limpa. Isso preserva o diagnóstico durante execução e teardown. O caminho é ignorado pelo Git.

## Resultado das verificações do piloto anterior

| Verificação | Resultado final |
| --- | --- |
| npm run lint | Passou. |
| npm run typecheck | Passou, incluindo código de frontend, testes E2E e configuração visual. |
| npm test | 109 testes em 33 arquivos passaram. |
| Build de produção Next | Passou nos setups reais das suítes E2E, sem iniciar build concorrente com a prévia de desenvolvimento. |
| npm run test:e2e | 48 passaram, sem testes pulados; inclui Pix, publicação, moderação, consentimento, conta suspensa e isolamento de tenant. |
| npm run test:visual | 12 passaram, sem --update-snapshots, sem testes pulados ou instáveis; inclui seções internas, diálogos, teclado e recuperação de rede. |
| npm run build:storybook | Passou; catálogo também inspecionado no navegador. |
| git diff --check | Passou. |

As verificações automáticas de acessibilidade cobrem regras A/AA selecionadas do axe nos estados exercitados; não certificam toda a WCAG nem substituem testes com pessoas. Os baselines são locais de Windows/Chromium. Os avisos de tamanho do bundle do Storybook e interpretação de use client pelo Vite pertencem ao ambiente de documentação, não são falha de build da aplicação. O Next ainda emite o aviso preexistente de múltiplos lockfiles.

Os processos de prévia e os containers de teste foram encerrados após a validação. O repositório mantém o código e as evidências necessárias para repetir os checks.

## Proteções de produto

Sem alteração de APIs, banco da aplicação, preços, cotas, elegibilidade, estado de publicação, consentimento ou eventos comerciais. Banco/Redis usados nas suítes são descartáveis de teste. A promessa atual de análise humana continua explicitamente pendente de reconciliação com a moderação automática condicional; não foi alterada como efeito visual.

Nenhum commit, push, deploy ou contratação de serviço foi realizado. 21st continua desativado por ausência de credencial. As melhorias usam componentes locais e ferramentas especializadas, sem adoção de Tailwind, shadcn ou Radix na aplicação.

## Redesenho do painel e da administração — 16/10/2026

Pedido vigente: reorganizar integralmente as áreas privadas antes de continuar as features, com leitura rápida, seções, filtros e responsividade. Execução local em `C:\VSCODE\divulgadorlinks`, branch `codex/roadmap-features`; F19 não iniciada. Após o pedido explícito de select e tabs personalizados, foi acrescentado `@base-ui/react` 1.9.0 (MIT) apenas como base sem estilos para esses controles. A justificativa é reaproveitar seleção, teclado, foco e integração de formulário em vez de recriar esse comportamento; aparência e composição permanecem locais em CSS Modules. Não houve troca de framework ou adoção de um tema externo.

### Auditoria e direção

| Achado observado | Impacto / prioridade | Mudança / aceite |
| --- | --- | --- |
| Navegação principal horizontal e outra navegação interna competindo | Encontrar tarefas exige interpretar duas listas; alta | Sidebar por seções e subitens. No celular, somente o botão Menu do cabeçalho abre a sidebar sobre o conteúdo; removido Menu do painel. |
| Visão do usuário escondia resumo, atenção e ranking em abas | Próximos passos ficam invisíveis; alta | Resumo, pendências e comparação de cliques na mesma página, com ações diretas. |
| Gestão tinha oito seções com descrições lado a lado com o menu principal | Hierarquia e densidade confusas; alta | Seletor de área, KPIs legíveis, distribuição real por status e próximos passos separados. |
| Links sem busca textual/rede; pedidos sem busca/situação | Listas extensas exigem leitura manual; média | Filtros combinados e ordenação; limpar recupera a lista, sem contador solto. |
| Muitos botões nos cards e campos do perfil em um bloco | Ações competem e formulários parecem maiores; média | Ações secundárias em Mais opções; novo link em três etapas e perfil em quatro etapas. |
| Títulos repetidos e formulários junto das listagens | Duplicação e esforço de leitura; alta | Título principal fora dos cards; listagem primeiro e criação/edição em diálogo após ação explícita. |
| Favoritar ocupava uma faixa do card; remoção ficava fora | Ação compete com o conteúdo; média | Estrela amarela sem fundo no canto superior direito, preenchida após confirmação do servidor; remoção em vermelho dentro do card de favoritos. |
| Upload nativo e nomes de campos ambíguos | Pessoas confundem título do conteúdo com seu nome; média | Upload com área de seleção/arraste e prévia; título do link, link de acesso, rede e assunto com exemplos. |

Refero não está disponível entre as ferramentas desta sessão. Pesquisa documental primária: [Carbon UI shell](https://www.carbondesignsystem.com/building-blocks/core/components/ui-shell-left-panel/guidelines) fundamenta navegação lateral/área ativa; [Polaris resource index](https://polaris-react.shopify.com/patterns/resource-index-layout) fundamenta ordem título → ações → filtros → resultados. A URL antiga de Polaris falhou/redirecionou; a página de [referências Polaris](https://shopify.dev/docs/api/polaris) e a página Carbon foram abertas e inspecionadas visualmente. Isso comprova a inspeção dessas páginas públicas, não dos dashboards internos de Shopify. Nenhuma identidade ou tema dessas referências foi importado.

Direção aplicada: navy existente nas ações, seleção discreta em superfície azul clara, respiro de 16–32 px e comparação por barras acompanhadas dos números. Não fabricar séries temporais, tendências ou resultados. O ranking usa apenas contagens disponíveis; falhas de pedidos/analytics não viram zeros confirmados.

### Arquitetura e jornadas

`WorkspaceNavigation` apresenta grupos e rota ativa. `AreaFrame` mantém sessão, canSubmit, suspensão e autorização atuais. `workspace.module.css` delimita estrutura e compatibilidade com composições existentes sem reescrever globals.css. `WorkspaceSection`, `ComparisonBars` e os estilos de dashboard são compartilhados por usuário/admin. Transporte e decisões continuam nas features/infraestrutura existentes. Nenhuma API, preço, quota, regra de moderação, coleta ou configuração de produção foi modificada.

Complementos solicitados: `SiteNavigation` usa `OverlayDialog` com a variante sidebar no mobile; o mesmo menu de tarefas atende desktop/mobile. `details/summary` fornece os submenus Publicação e Revisões por teclado. O diálogo nativo mantém o foco e o fundo inerte; Escape, fechar e clique no fundo encerram o menu, devolvendo o foco. A rolagem do documento é bloqueada temporariamente e restaurada ao fechar ou passar para desktop. A animação de entrada/saída respeita movimento reduzido.

`OverlayDialog` também separa criação/renomeação de coleções, edição do convite permanente, grupos/links do perfil, correção de convite, preferências de lembretes e textos do catálogo das respectivas listagens. Campos em erro continuam preenchidos. `FormSteps` dá contexto e retorno às etapas anteriores; Novo link possui título/acesso → assunto/descrição → conferência. Perfil possui apresentação → foto/acesso → grupos/links → publicação. Só a etapa atual mostra o texto; as demais mostram apenas número e círculo, em uma única faixa. Os botões de persistência permanecem na última etapa. `ImageUpload` reaproveita `prepareAvatar` e o endpoint atual: limites, normalização, remoção de metadados e validação no servidor não foram substituídos pela apresentação.

`RefreshButton` compartilha o ícone, nome acessível e tooltip. `BackToPanel` mantém seta e texto quando há uma navegação de retorno relevante. `ActionIcon` reúne os ícones locais. O slot `cornerAction` de LinkRow mantém a estrela separada do caminho de saída do card; patrocinado, surfaceToken, impressões e cliques continuam com os contratos existentes. A estrela tem área de interação de 44 px e ícone de 24 px, sem fundo ou espaçamento visual extra.

### Complemento de padronização solicitado pelo usuário

O pedido inicial desta padronização separava ações e filtros em cards. Foi **substituído pelo complemento mais recente**: `WorkspaceActions` agora apresenta ações sem card e alinhadas à direita; `WorkspaceFilters` mantém os controles em card. O fundo, borda, espaçamento e altura dos filtros são compartilhados. Não há introdução genérica acima do filtro nem contador repetindo o vazio. A utilidade global Sair permanece no cabeçalho da área. Mensagens de erro, confirmação, condições comerciais e limitações dos dados são preservadas onde ajudam uma decisão.

Favoritos possui duas tabs, Favoritos e Coleções, acima das ações da aba. Criação, renomeação, exclusão, ordenação e associação continuam usando os mesmos endpoints e versões. A busca textual é local aos favoritos carregados e não promete pesquisar um total remoto. A contagem de status da gestão continua vindo do backend; os testes verificam a resposta de 49 itens e a lista limitada a 40 sem exibir esses números como texto solto na interface.

Menu mobile: gatilho de ícone à esquerda do logo no cabeçalho, sidebar com logo, alternância de contexto para administradores, seções, itens e um nível de subitens. Só o ramo da rota atual começa expandido. Catálogo e Busca ficam no rodapé da navegação. Não há mais um segundo Menu do painel na página. O padrão de hierarquia e chevrons foi confrontado com [Carbon UI shell](https://v10.carbondesignsystem.com/components/UI-shell-left-panel/usage/); o vazio conciso usa como referência a função descrita por [Atlassian Empty state](https://atlassian.design/components/empty-state/). A página de exemplos de Atlassian abriu, mas a captura externa falhou; não é registrada como inspeção visual concluída.

Select e tabs usam a documentação de Base UI 1.9.0 consultada por Context7. O select preserva `name`, valor, obrigatoriedade, opções desabilitadas e grupos; o menu é personalizado, com seleção visível e teclado. Dentro de um diálogo nativo, o popup é montado no próprio diálogo para respeitar a camada modal. Os testes passaram a selecionar opções visíveis em vez de chamar a API de select nativo. Tabs compartilham indicador animado e navegação por teclado; preferências de movimento reduzido são respeitadas. Há exemplos isolados de controles, tabs, vazio e etapas no Storybook, sem transporte real.

Complementos finais: filtros mobile exibem os dois primeiros controles e revelam os restantes com Ver mais/Ver menos; recolher preserva valores. A gestão usa ResponsiveTabs com medição real de largura e fallback para Select antes de quebrar a linha. Ícones foram adicionados às ações; controles de estado, números de paginação e etapas mantêm sua representação própria. Ações isoladas usam tratamento primário. Os intervalos entre composições privadas usam o mesmo token de 24 px.

Perfil foi apresentado como Minha página de links, com uma explicação curta dentro do formulário, Título da sua página e Personalize o link da sua página, incluindo exemplo do caminho compartilhável. O status usa um mapper e Badge: Rascunho, Publicado, Alterações em rascunho ou Alterações não salvas. Vagas em uso fica acima de Título do link, no primeiro passo de criar link. O selo de patrocinado das sugestões da busca usa o mesmo ícone de diamante dos cards, reaproveitando AdMark, sem mudar surfaceToken ou eventos.

Field mostra asterisco vermelho para required e feedback da validade nativa em português. O marcador fica ao lado do label, fora do seu texto acessível. Não foram duplicadas regras de cobrança, autorização ou disponibilidade. O nome acessível dos botões de etapas passou a incluir o número visível, corrigindo a divergência encontrada pelo axe em label-content-name-mismatch.

O usuário adiou explicitamente o complemento posterior do cabeçalho/menu: mover logo totalmente à esquerda, gatilho à direita e reunir Catálogo/Busca acima da alternância de contexto. Essas mudanças adicionais não foram implementadas nesta etapa; a navegação entregue antes desse complemento foi preservada.

Durante esta execução apareceram alterações concorrentes em `backend/src/http/checkout.pg.spec.ts`, `backend/src/http/controllers/@Payments/checkout.spec.ts` e `backend/src/http/controllers/@Payments/routes.ts`. Foram preservadas e não fazem parte da implementação visual desta entrega.

| Rotas | Público / tarefa | Estados e verificação |
| --- | --- | --- |
| /painel, /painel/links, /painel/pedidos | Usuário: resumo, localizar link/pagamento | Vazio, carregamento, falha de dados, filtros combinados, ordenação, limpar e ações secundárias por teclado. |
| /painel/perfil, convites, favoritos, lembretes, conta | Usuário: organizar/publicar e cuidar da conta | Estrutura compartilhada, formulário em seções, navegação mobile, isolamento e regressões funcionais existentes. |
| /admin/visao: métricas, contas, links, cliques, pagadores, tráfego, financeiro, retenção | Admin: observar e encontrar ação | Áreas navegáveis, números reais, gráficos acompanhados de texto, filtros existentes e busca recuperável. |
| /admin/moderacao, denuncias, disponibilidade | Admin: revisar e decidir | Busca/origem na moderação; filtros e ações existentes preservados nas filas; nenhum atalho que conceda autorização. |
| /admin/planos, estornos, integracoes, configuracoes | Admin: operação comercial e sistema | Busca/situação em estornos; exibição e textos do catálogo separados; diálogos/contratos existentes preservados. |

### Validação e evidências

Evidências revisadas em `evidencias/painel-admin-2026-10-16`. Resultados intermediários não substituem o fechamento registrado ao fim desta seção.

Falhas encontradas e corrigidas: descoberta indevida de cópias antigas em `e2e/.runtime` (pasta excluída do runner); transbordamento do título em 320 px/texto 200% (quebra de palavras e limites de flex); semântica inválida de dl nos KPIs (descrição dentro de dd); seletor Pago ambíguo depois de adicionar opções de filtro (teste agora verifica o badge no card do pedido). As asserções comerciais não foram removidas nem tiveram timeouts aumentados. Treze testes direcionados passaram antes da regressão final.

O harness agora usa `.next-e2e` mediante `TEMLINK_E2E_BUILD=1` para não sobrescrever `.next` do servidor do usuário; produção mantém o diretório padrão. Configuração consultada via Context7 Next 15.1.11: a versão exata 15.5.26 não estava no índice; `distDir` foi confirmado na documentação versionada da mesma major. A suíte usa containers próprios e offset 100; não encerra os processos do usuário em 3000/3333.

Na padronização final, a inspeção encontrou cards encostados em Meus links, padding duplicado em Favoritos e um seletor CSS de cabeçalho que alcançava os diálogos de coleções/lembretes. Foram corrigidos no componente responsável, sem aumentar a especificidade global. Novo link passou a reunir gratuidade e vagas dentro do formulário, retirando a introdução genérica solta. Coleções vazias usam diretamente EmptyState, sem um segundo card envolvendo o vazio.

Os testes de catálogo passaram a abrir uma sessão real por cenário: o conjunto ampliado ultrapassou os cinco minutos do token salvo pelo setup. O TTL da aplicação não foi alterado. As verificações antigas de títulos, nomes de ações e mensagens foram atualizadas para os controles visíveis; confirmação de e-mail, status HTTP de acesso negado, isolamento e contratos comerciais continuam sendo exigidos. A navegação por teclado aponta para summary, em vez de tentar focar o span do seu texto.

Para a conta sem confirmação, o cenário aguarda o redirecionamento real a `/painel/verificar` e verifica o bloqueio 403 da API. A antiga tentativa de localizar um botão do formulário durante o redirecionamento não comprovava esse estado. Na abertura do painel, foi retirado também o segundo título Seu resumo; Novo link e Gerenciar links compõem o card de ações abaixo do título principal.

Na validação dos campos, o navegador encontrou interferência de eventos de captura no valor de um input controlado após erro de obrigatoriedade. O feedback foi movido para a propagação após o handler do campo. O cenário W03 exige foco no primeiro inválido, preenchimento recuperável, avanço e preservação ao voltar; a regressão também tem um teste unitário com evento input. As etapas passaram a expor número e texto com o mesmo espaçamento do nome acessível.

Uma repetição visual encontrou deadlock entre a limpeza das fixtures de destaque e o worker. O rollback deixava 49 links de teste e alterava o contador de vagas da captura seguinte. A limpeza agora bloqueia suas próprias linhas de links antes das dependências e repete somente deadlocks, no máximo três tentativas. Não há aumento de tolerância visual, supressão de regras do axe ou alteração de asserções comerciais.

### Evidências principais

| Jornada | Desktop / mobile |
| --- | --- |
| Resumo | [Desktop](evidencias/painel-admin-2026-10-16/panel-overview-desktop.png), [mobile](evidencias/painel-admin-2026-10-16/panel-overview-mobile.png) |
| Links e filtros | [Desktop](evidencias/painel-admin-2026-10-16/panel-links-desktop.png), [mobile](evidencias/painel-admin-2026-10-16/panel-links-mobile.png), [select aberto](evidencias/painel-admin-2026-10-16/select-mobile.png) |
| Pedidos, favoritos e coleções | [Pedidos](evidencias/painel-admin-2026-10-16/panel-orders-mobile.png), [favoritos](evidencias/painel-admin-2026-10-16/favorites-mobile.png), [coleções](evidencias/painel-admin-2026-10-16/collections-mobile.png), [criação em diálogo](evidencias/painel-admin-2026-10-16/collection-dialog-mobile.png) |
| Formulários | [Criar link](evidencias/painel-admin-2026-10-16/submission-mobile.png), [página de links](evidencias/painel-admin-2026-10-16/profile-mobile.png), [foto e etapa compacta](evidencias/painel-admin-2026-10-16/profile-upload-mobile.png) |
| Gestão e moderação | [Gestão desktop](evidencias/painel-admin-2026-10-16/admin-overview-desktop.png), [gestão mobile](evidencias/painel-admin-2026-10-16/admin-overview-mobile.png), [moderação desktop](evidencias/painel-admin-2026-10-16/admin-moderation-desktop.png), [moderação mobile](evidencias/painel-admin-2026-10-16/admin-moderation-mobile.png) |

As 12 baselines estáveis foram revisadas visualmente no Windows/Chromium antes da repetição de comparação. Foram verificadas a hierarquia, os espaços, os controles, os selos e o cabeçalho compartilhado; a repetição normal não usa --update-snapshots. As verificações W01–W03 agora integram também o runner visual em 1440 px e 390 px, além da suíte funcional em 1280 px/mobile.

### Resultado final desta entrega

| Verificação | Resultado |
| --- | --- |
| Lint e typecheck | Passaram; conferir logs finais em output/panel-redesign. |
| Unitários | 205 testes em 63 arquivos passaram. |
| Build de produção Next | Passou nos setups das suítes e em TEMLINK_E2E_BUILD=1 npm run build, com saída isolada em .next-e2e. |
| Storybook | Build estático passou. |
| Playwright visual | 22 passaram na execução normal, sem atualizar snapshots, testes pulados ou retries do runner. |
| Playwright funcional | 106 passaram, sem testes pulados ou retries do runner. Conta não confirmada validou redirecionamento, bloqueio 403 e liberação após confirmação. |
| git diff --check | Passou. |

Capturas são de dados sintéticos; não comprovam produção. Axe cobre as regras A/AA selecionadas, não acessibilidade total. Teclado, foco, reflow e contraste complementam a inspeção em Chromium desktop/mobile; não houve ensaio em aparelho físico ou leitor de tela. O ambiente das baselines existentes é Windows, conforme registro anterior.

Reversão: reverter apenas o diff desta entrega em componentes, CSS, rotas, package.json/package-lock.json, testes e baselines juntos. Preservar as alterações concorrentes do backend. Nenhuma migration ou reversão de dados é necessária. Não executar reset/revert automaticamente nem remover arquivos preexistentes de output.

Para repetir as suítes no frontend mantendo os servidores locais em 3000/3333, usar PowerShell com `$env:E2E_PORT_OFFSET='100'` e um identificador próprio, por exemplo `$env:E2E_RUN_ID='ui-check-local'`, antes de `npm run test:e2e` e `npm run test:visual`. Cada suíte prepara e remove seus próprios serviços. Logs finais desta execução: `output/panel-redesign/e2e-release-final.log`, `visual-final-verified.log`, `unit-final.log`, `lint-final.log`, `typecheck-final.log`, `build-final.log` e `storybook-final.log`.

### Ajuste posterior: posição do Sair — 16/10/2026

O Sair foi removido do conteúdo do painel, admin, verificação de e-mail e conta suspensa. A ação compartilhada fica no cabeçalho desktop e no final da sidebar mobile, em vermelho e com ícone. A navegação acompanha os eventos de sessão para disponibilizar a saída após login/cadastro sem exigir recarga. Isso representa estado de apresentação; a autorização continua no servidor.

O componente LogoutButton reutiliza o POST existente com CSRF e limpa o cache local após encerrar a sessão. Enquanto envia, desabilita o botão; falhas preservam a sessão e oferecem nova tentativa. W04 verifica as posições desktop/mobile, ausência de duplicação, remoção do cookie e do cache e resposta 401 em recurso protegido após sair. W01 preserva o ciclo de foco da sidebar tendo Sair como última ação.

As capturas anteriores desta pasta documentam a entrega original; as evidências logout-desktop.png e logout-mobile.png registram a posição atual. As quatro baselines privadas foram atualizadas. Reversão deste ajuste: restaurar juntos o diff de SiteNavigation, site-shell.module.css, AreaFrame, página verificar, LogoutButton, testes e baselines privadas, preservando o restante da entrega e alterações concorrentes. Não há mudança de dados nem de backend.

Validação do ajuste: 207 unitários passaram; lint, typecheck e build de produção no harness passaram. A rodada final do Playwright passou nos 27 casos (24 visuais/layout em desktop e mobile, sem atualizar snapshots, mais três regressões de cadastro sem confirmação, logout idempotente e jornada mobile). A primeira rodada identificou uma falha do cliente HTTP do teste na resolução de tenant-a.localhost no Windows; a checagem após logout passou a usar fetch no navegador, mantendo a exigência de resposta 401. O teste de foco usa Sair como última ação da sidebar. Não houve retries nem testes pulados na rodada final.

Logs: output/panel-redesign/logout-unit.log, logout-lint.log, logout-typecheck.log, logout-verification.log e logout-server.log. O config temporário usado foi frontend/e2e/.runtime/logout-verification.config.ts; a mesma cobertura pode ser repetida com npm run test:visual e npx playwright test e2e/catalog.spec.ts --project=catalog --grep "logout idempotente|mobile: home, busca|cadastro sem confirmação não envia link", configurando offset 100 e um E2E_RUN_ID próprio como acima. Os serviços de teste foram removidos; os servidores locais em 3000/3333 foram preservados. A mudança permanece local, sem commit, push ou deploy. As limitações de Chromium/dados sintéticos e ausência de ensaio físico descritas acima continuam aplicáveis.


## Navegação, skeletons e prévia privada — 17/10/2026

### Escopo entregue

Cabeçalho mobile com logo à esquerda e Menu à direita; sidebar pela direita, destinos do site antes das áreas, uma coluna no catálogo/busca e duas no painel/admin. SidebarLink compartilha ícones, hover e seleção com os itens internos. Saída permanece vermelha no final da sidebar.

Carregamentos assíncronos receberam composições por jornada: catálogo/busca/relacionados, painel/links/pedidos, formulário de publicação, favoritos/coleções, página de links, convites, lembretes, disponibilidade, denúncias/contestação, checkout/planos/PIX/resultado, conta/verificação e áreas do admin. Skeletons reutilizam CSS dos componentes reais, desabilitam interação e rastreamento, anunciam espera e respeitam movimento reduzido. Dados carregados permanecem durante atualização do mesmo recurso; botões mantêm as dimensões no envio. Não foram adicionadas dependências nesta etapa.

O flash do resumo na troca de aba foi tratado removendo o loading genérico que interpretava o pathname anterior. Os limites de rota do painel compõem o skeleton com o destino literal. L05 observa as mutações durante navegação real e proíbe conteúdo da visão geral sob o título de Pedidos. Rede e Assunto do link têm ícones também nos selects.

O menu agora chama Minha página. Ver prévia confirma o PATCH do rascunho antes de navegar para `/painel/perfil/previa`. Falhas permanecem no editor com os valores; a prévia usa GET privado existente, sem owner na URL, e o mesmo ProfileView público. Banner sticky Modo de prévia com Voltar à edição acompanha a rolagem. Sessão, bloqueios, isolamento, barreira etária, publicação e projeção de itens ocultos continuam nos contratos existentes. Nenhum endpoint, schema ou regra comercial foi alterado por esta etapa.

### Achados de validação

- Suspense genérico antes de validar recursos públicos fazia uma página inexistente devolver HTTP 200. Foram retirados os loadings dessas rotas; a regressão mantém o 404 obrigatório. SSR estático chega completo, sem espera artificial.
- Hints e asteriscos de obrigatoriedade afetavam a altura dos formulários em poucos pixels. Os skeletons passaram a usar Field e as mesmas mensagens; os testes comparam posição/largura e altura em desktop/mobile.
- O wrapper de conteúdo de Button precisava permitir encolhimento e quebra de nomes de coleção em 320 px/texto 200%. O Select também precisava limitar seu wrapper real de valor, além do span interno, após adicionar ícones. Correções em CSS local, mantendo ícones com tamanho fixo. F04-E03 mantém a asserção original de reflow.
- As primeiras asserções de prévia ainda buscavam a antiga região inline. O ensaio de rede lenta usa unrouteAll com espera para concluir o handler antes de retirar a interceptação. O cenário F09-E01 agora verifica URL privada, rascunho salvo ao retornar, banner após rolagem, público 404 antes de publicar e visitante sem acesso à prévia. Não foram relaxadas as verificações de publicação, sessão ou ocultação. A suíte completa é executada com banco descartável limpo: o recorte de disponibilidade usa o mesmo dono e deixa uma vaga ocupada; reutilizar seus dados em uma suíte completa adicional atingia corretamente a quota durante a aprovação mobile. O isolamento foi corrigido reiniciando apenas o harness, sem alterar a regra de vagas.

### Limites e reversão

Skeletons representam a estrutura da jornada. Quantidade de cards e altura de texto desconhecidos antes da resposta podem variar; não há promessa de equivalência pixel a pixel para conteúdo arbitrário. A comparação geométrica cobre formulários e controles indicados nos testes. Testes locais e inspeção não comprovam produção ou acessibilidade total.

As alterações permanecem locais, sem commit, push ou deploy. Para reverter, retirar apenas os trechos desta etapa identificados no diff (loadings, skeletons, navegação e prévia), preservando o redesenho e as alterações que já existiam no início. Não usar restore/reset amplo: existem mudanças anteriores nos mesmos arquivos e mudanças concorrentes no backend. Não há migração de banco a reverter.


### Arquivos e evidências desta etapa

Primitivas em `components/feedback/skeleton*` e CSS local de Button/Select; navegação em `components/layout/sidebar-link*`, SiteNavigation e WorkspaceNavigation; composições por feature e limites `painel/**/loading.tsx`; estado reutilizável em `lib/use-resource-state*`; prévia em `features/profiles/profile-preview-screen*`, `components/profile-preview-*` e rota privada. Os novos skeletons de gestão ficam em `features/administration/components`, sem dependência das rotas na composição compartilhada. A extração HomeContent mantém consulta, SEO, dados estruturados e SSR existentes.

`e2e/loading-layout.spec.ts` cobre rede lenta por jornada, atualização sem apagar dados, dimensões no envio, sessão pendente, movimento reduzido, navegação sem flash e grids da sidebar. `profiles.spec.ts` cobre a prévia real e sua privacidade. `session-controls.ts` troca contas usando a saída do cabeçalho ou abrindo o menu mobile; os cenários de disponibilidade e denúncias continuam usando a UI real.

| Evidência | Arquivo |
| --- | --- |
| Uma coluna no catálogo | [Sidebar mobile](evidencias/carregamento-previa-2026-10-17/sidebar-catalogo-mobile.png) |
| Duas colunas antes das áreas | [Painel](evidencias/carregamento-previa-2026-10-17/sidebar-painel-mobile.png), [admin](evidencias/carregamento-previa-2026-10-17/sidebar-admin-mobile.png) |
| Prévia privada | [Desktop](evidencias/carregamento-previa-2026-10-17/private-preview-desktop.png), [mobile](evidencias/carregamento-previa-2026-10-17/private-preview-mobile.png) |
| Banner preservado na espera | [Desktop](evidencias/carregamento-previa-2026-10-17/private-preview-loading-desktop.png), [mobile](evidencias/carregamento-previa-2026-10-17/private-preview-loading-mobile.png) |
| Formulário de publicação, espera → campos | [Desktop: skeleton](evidencias/carregamento-previa-2026-10-17/submission-session-loading-desktop.png), [campos](evidencias/carregamento-previa-2026-10-17/submission-session-ready-desktop.png); [mobile: skeleton](evidencias/carregamento-previa-2026-10-17/submission-session-loading-mobile.png), [campos](evidencias/carregamento-previa-2026-10-17/submission-session-ready-mobile.png) |
| Editor de página, espera → campos | [Desktop: skeleton](evidencias/carregamento-previa-2026-10-17/painel-perfil-loading-desktop.png), [campos](evidencias/carregamento-previa-2026-10-17/painel-perfil-ready-desktop.png); [mobile: skeleton](evidencias/carregamento-previa-2026-10-17/painel-perfil-loading-mobile.png), [campos](evidencias/carregamento-previa-2026-10-17/painel-perfil-ready-mobile.png) |


### Validação final

| Verificação | Resultado |
| --- | --- |
| Lint / Typecheck | Passaram no frontend; logs skeleton-lint-final.log e skeleton-types-final.log. |
| Unitários | 217 testes em 68 arquivos passaram, incluindo os ajustes concorrentes de ícones preservados; skeleton-unit-final.log. |
| Build Next de produção | Passou no harness isolado .next-e2e, incluindo a nova rota de prévia; não sobrescreve o build de desenvolvimento do usuário. |
| Storybook | Build estático passou; skeleton-storybook.log. |
| Playwright funcional completo | **122 passaram, sem skip ou retry**, em ambiente limpo; skeleton-functional-final.log e skeleton-functional-results.json. |
| Recorte de correções | 5 passaram: prévia desktop/mobile, disponibilidade e denúncias mobile; skeleton-critical-final.log. Não reutilizar as vagas dessas fixtures como início de outra suíte completa. |

Logs ficam em output/panel-redesign. O runner usa portas 3100/3433/4199 com E2E_PORT_OFFSET=100 e E2E_RUN_ID=skeleton-ui-check, PostgreSQL/Redis próprios e serviços de teste. Os servidores do usuário em 3000/3333 foram preservados. A execução funcional usa o mesmo playwright.config.ts, via wrapper local que mantém o harness aberto para inspecionar e revisar; os testMatch e asserções de negócio permanecem ativos. A matriz visual final e sua revisão são registradas abaixo.


Durante a captura visual foi detectada uma execução concorrente sobrescrevendo `.next-e2e` e os arquivos compartilhados de estado/log do E2E. A evidência foi perda de CSS/hidratação no mobile após capturas desktop corretas e um novo BUILD_ID produzido pela outra execução. A revisão final usa uma cópia temporária isolada de frontend/backend, com as dependências compartilhadas por junction e source de frontend conferido por hash, mantendo seus próprios build, state.json e serve.pid. Não foram alterados os testes para aceitar falta de scripts/estilos; a execução com colisão não é validação visual aprovada. Somente os processos/containers de skeleton-ui-check são encerrados na limpeza.


Os ajustes concorrentes de ícones na navegação, favoritos e destaque foram preservados e incluídos no snapshot isolado final. A comparação de fontes está registrada em `output/panel-redesign/validated-source-manifest.json`; lint, typecheck e unitários foram repetidos no workspace após essa integração. As mudanças de glyph não alteram os contratos comerciais exercitados pelos 122 E2E funcionais.

## Favoritos e coleções — ajustes de 17/10/2026

A pedido do usuário, favoritos usa estrela nos cards, abas e sidebar. Destaque passou a usar megafone. A escolha está registrada na skill temlink-icons. A lista de favoritos e os itens de coleção usam grid responsivo com colunas mínimas de 18rem, preservando uma coluna no mobile e o mesmo grid no skeleton.

Nos favoritos, cada card apresenta Adicionar à coleção e Remover na mesma linha. O acesso continua pelo card e seu Ver link existente. O seletor global de coleção foi substituído por uma janela contextual: mostra o link selecionado, permite escolher a coleção em um clique, sinaliza quando já pertence a ela, permite carregar mais e criar uma coleção sem perder o favorito escolhido. Falhas mantêm a seleção para nova tentativa; a mutação conserva expectedVersion e a autorização da API.

Dentro de uma coleção, o card mostra Mover e Remover. Mover expande Subir e Descer por teclado ou clique. Remover chama exclusivamente DELETE collections/:id/items/:itemId com a versão atual; não chama a remoção do favorito. A mensagem confirma que o link continua nos favoritos. A exclusão de coleção e a remoção global de favorito continuam em seus respectivos contextos.

Arquivos: features/favorites/favorites-screen.tsx, components/collection-picker.tsx, favorite-list.tsx, favorites.module.css e favorites-skeleton.tsx; testes favorites-screen.test.tsx e e2e/favorites.spec.ts; mapa de navegação e consumidores de favorito/destaque documentados em icones-e-navegacao.md. Nenhum transporte foi introduzido nos componentes de apresentação.

Reversão: reverter apenas as alterações desta fatia nos arquivos acima e remover collection-picker.tsx. Preservar os demais ajustes locais do programa de frontend; não restaurar arquivos inteiros pelo Git. Não houve commit ou deploy.


### Fechamento visual e limites de concorrência

As 12 candidatas foram geradas em diretório separado, comparadas com as referências e inspecionadas por Codex antes de copiar as imagens aprovadas. As seis telas mobile mantiveram exatamente as dimensões e mudaram somente no cabeçalho. No desktop, foram revisados Minha página e os glyphs compartilhados, além do alinhamento dos botões. Não houve aumento de tolerância de comparação.

Na execução visual normal, **36 cenários passaram**, incluindo as 12 comparações de screenshots; quatro falharam em duas preparações de teste, em desktop/mobile. L04 limpava o cache enquanto uma resposta anterior de sessão ainda podia repô-lo: agora usa addInitScript antes da nova navegação. A busca agora exige o status exato Carregando links, distinguindo o skeleton dos resultados do fallback de rota. A liberação das interceptações aguarda os handlers. **Os quatro cenários passaram no recorte após essas correções**, sem alterar o produto nem suas asserções de geometria/recuperação. São 40 cenários únicos com resultado final aprovado, não uma única execução verde de 40. Logs: skeleton-visual-final.log e skeleton-visual-targeted.log; rastreabilidade: skeleton-visual-aggregate.json e skeleton-visual-targeted-results.json.

Comandos: Playwright Test com playwright.visual.config.ts em wrapper sem setup adicional; candidatas usam um caminho separado; comparação normal não usa update-snapshots. Lint, typecheck, npm test e builds Next/Storybook estão registrados acima. O harness e a cópia de validação são encerrados ao fechar esta etapa.

O workspace continuou recebendo alterações de outro trabalho em Favoritos durante a revisão. Elas foram preservadas. A lista exata posterior ao snapshot está em output/panel-redesign/concurrent-frontend-changes.json; esses ajustes posteriores não fazem parte dos resultados aqui declarados. A validação desta entrega é vinculada ao snapshot registrado, sem assumir validação de uma árvore que continua mudando. Nenhum commit, push ou deploy foi executado por esta tarefa. Parar aqui, sem avançar o roadmap.

### Navegação entre pastas de coleção

Coleções agora apresenta pastas grandes em grid em collection-grid.tsx. Abrir uma pasta substitui as abas e o grid por seu conteúdo, ocultando Nova coleção e Atualizar dados. collection-header.tsx reúne Voltar à esquerda, nome, Editar e Excluir; os controles compartilham a linha no desktop e podem quebrar no mobile. Voltar restaura o grid e o foco na pasta de origem. Ao excluir a pasta, ela sai da lista local e o foco retorna ao controle de nova coleção. O skeleton das pastas acompanha a composição do grid.

O E2E verifica navegação pelo card, ocultação dos controles gerais, foco ao entrar/voltar, alinhamento do cabeçalho, criação pela janela do favorito, reordenação, retirada exclusiva da coleção, preservação dos favoritos e links no banco e reflow de 320px com texto a 200%. As evidências anteriores desta sequência estão em output/icon-semantics/collection-folders; o ajuste final de alinhamento recebe capturas em output/icon-semantics/folders-final.

Na última execução completa de unitários, 218 passaram e um teste de convites falhou porque ainda espera Nada por aqui ainda., enquanto uma alteração concorrente nessa tela passou a mostrar Crie seu primeiro link permanente para compartilhar um endereço fixo. Esse teste não foi alterado nesta fatia. A execução completa anterior havia passado com 219 testes; registrar a diferença de estado do workspace em vez de atribuir essa falha ao fluxo de coleções.

Fechamento desta fatia: lint e typecheck aprovados, build de produção aprovado no harness .next-e2e, 12 testes afetados aprovados, 9 E2E completos de favoritos/coleções aprovados e 2 execuções finais desktop/mobile aprovadas após o ajuste de alinhamento. Os 219 unitários haviam passado antes da alteração concorrente do texto de convites; o estado final da suíte geral é 218 aprovados e 1 falha não relacionada, descrita acima. Capturas finais de pastas, conteúdo, seletor e reflow inspecionadas em output/icon-semantics/folders-final. Consentimento foi fixado como negado no login de teste, e as capturas de coleção aguardam o fechamento do diálogo e desabilitam animações para evitar imagens de transição. Sem validação em aparelho físico ou produção.

Na reversão desta fatia, incluir também collection-grid.tsx e collection-header.tsx entre os componentes novos a remover e restaurar apenas a composição anterior da navegação de coleções. As alterações locais de outras jornadas foram preservadas.
## Minha página inteira e personalização — 17/10/2026

Pedido posterior à etapa de navegação/skeletons: transformar a F09 em página pessoal de tela inteira. Escopo e critérios em [minha-pagina-personalizacao.md](minha-pagina-personalizacao.md). Preservadas alterações locais de pagamentos, ícones e favoritos; nenhum commit, branch, push, deploy ou avanço para outra feature nesta entrega.

O editor mantém Conteúdo e suas quatro etapas, acrescentando Aparência com Temas, Cores e Botões e texto. Seis temas, paleta/hex/RGB próprios, fundo sólido/degradê, formato/estilo de botão, família tipográfica e alinhamento. Simulação inerte usa o mesmo ProfileView da prévia autenticada e do público. Cor do texto calculada por contraste; contraste mínimo unitário inclui tons intermediários. Em 320 px, label e código da cor ocupam linhas próprias para evitar quebra no hexadecimal e em palavras.

O público e a prévia dispensam o chrome do catálogo, por autorização expressa. SiteShell usa pathname também nas transições, sem converter o conteúdo público para renderização exclusiva no cliente. Coluna de links com fundo cobrindo a viewport, identidade própria e assinatura pequena com logo original no fim. Gerenciar cookies continua acima da marca. Canonical, noindex, 404, barreira etária, autorização, tenant, consentimento e validação dos destinos preservados.

A aparência integra o agregado e snapshot existentes, em coluna JSONB opcional via migração aditiva. Perfil antigo continua com padrão; rascunho não altera a publicação. Mídia reutiliza preparo local e armazenamento PostgreSQL: browser converte PNG/JPG/WebP para WebP, com redução de dimensões; backend usa sharp 0.34.5 para decodificar/recodificar sem metadados. MIME distingue PNG legado de WebP. A dependência tem responsabilidade concreta de codec; nenhuma biblioteca de UI foi instalada.

Correções encontradas durante validação: callback não serializável no skeleton servidor foi removido da fronteira; TabNavigation aceita ausência de callback. Contagens de links passaram a medir o artigo pessoal, sem contar a assinatura. A auditoria da prévia aguarda o título da rota para não avaliar metadados durante a transição. Inspeção humana da captura ampliada identificou quebra de código/label, apesar do teste de overflow passar; composição estreita foi corrigida. Testes antigos de limite de arquivo e falha de decodificação foram preservados e ampliados.

Testes e evidências finais ficam no [registro do lote](minha-pagina-personalizacao.md). Capturas em `evidencias/minha-pagina-2026-10-17`; fontes compiladas em cópia isolada por causa dos outros servidores/tarefas no mesmo checkout. Snapshots visuais aprovados em Windows são executados por `playwright.profiles-visual.config.ts`, separados da suíte funcional do CI Ubuntu. Não gerar baselines Linux automaticamente nem afirmar CI/produção aprovados nesta mudança.

Migração aplicada apenas ao banco descartável e ao desenvolvimento confirmado em localhost:5437, onde era a única pendência. Servidores do usuário em 3000/3333 foram preservados. A pasta temporária de validação foi mantida porque a política de execução bloqueou sua remoção; serviços/containers da tarefa são encerrados ao concluir. Reversão e incompatibilidades de downgrade (appearance strict e MIME de WebP) documentadas no registro, sem apagar dados.

## Complemento — marca e revisão de conteúdo, 17/10/2026

A assinatura passou a texto de 9 px e logo de 66 px, sem cápsula ou fundo, no rodapé da página e da prévia. Os quatro snapshots Windows foram comparados e aprovados após inspeção: as diferenças estão restritas à marca. A publicação de Minha página e Convites agora usa decisão automática ou fila humana por categoria, motivo de recusa e uma contestação por envio, por novo pedido expresso. As regras anteriores de bloqueio editorial definitivo foram superadas; bloqueios técnicos de segurança continuam obrigatórios. Histórico desta personalização permanece acima.

Contrato, migração, critérios, resultados (229 unitários frontend, 436 backend, 46 PostgreSQL, 44 E2E e duas jornadas visuais), limites e reversão em [Revisão de páginas e convites](revisao-paginas-convites.md). Na primeira entrega a revisão destes tipos ocorria no admin. O pedido seguinte ampliou a decisão para WhatsApp, registrado no complemento do mesmo documento.

## F19 — histórico da Minha página, 17/10/2026

Entrada Histórico aguarda o autosave e abre publicações anteriores com comparação semântica, diferenças em destaque, campos iguais recolhidos e restauração explicitamente confirmada. Reutiliza a prévia privada atual. Snapshots privados imutáveis não substituem a projeção pública. Fotos antigas removidas são omitidas na restauração, com aviso. Skeletons compartilham geometria/CSS dos cards; oito capturas inspecionadas e espaçamento conferido no E2E. Decisões/alternativas, limites e evidências em [execução F19](../planejamento-features/execucao-f19.md).

## F08 — oportunidades de busca, 17/10/2026

Área de gestão ganhou a opção Buscas com filtros padronizados, oportunidade, período, rede/nicho dos resultados e controles recolhíveis no mobile. Cards de demanda distinguem falta de oferta e pouca interação; cobertura e amostra ficam explícitas. Esqueleto de atualização preserva altura, posição, explicação e scroll. A regressão também comprovou e corrigiu o menu mobile habilitado antes da hidratação: estado desabilitado/ocupado até o handler ficar pronto. Oito capturas inspecionadas; 32 E2E, 19 PG, 264 unitários frontend e 473 backend. Sem nova biblioteca visual, commit, push ou deploy. [Decisões, alternativas, critérios e reversão](../planejamento-features/execucao-f08.md).

## F11 — assinaturas de páginas, 17/10/2026

Rotas `/painel/assinatura` e `/admin/assinaturas`: comparação de planos, situação/cobertura, confirmação explícita, cancelamento de renovação e troca no próximo ciclo; administração com listagem e formulários em modal/etapas. Ações à direita, componentes locais, CSS Modules e dezesseis capturas inspecionadas. O gratuito e a marca continuam preservados; venda de recursos futuros permanece bloqueada. Nenhuma biblioteca visual adicionada. Dez E2E específicos e 69 de regressão aprovados, além de 212 PG e checks locais. [Contratos, escolhas/alternativas, migração, segurança e reversão](../planejamento-features/execucao-f11.md). S7 remoto/comercial continua em revisão, sem commit/push/deploy.

## F13 — QR compartilhado

Modal específico composto com controles existentes, CSS Module e qrcode já instalado, sem alterar Pix. Skeleton 13rem com geometria idêntica, seleção PNG/SVG/tamanho, erro/retry, aviso de permanência e retorno explícito de foco após consulta assíncrona. Revisão visual e testes registrados em [execução F13](../planejamento-features/execucao-f13.md) e evidências F13. Nenhum token/biblioteca visual nova.

## F14 — agenda na página

Ação Agendar nos botões com capacidade vigente; modal separado com DatePicker/Select locais, pausa, validação ligada ao campo e confirmação no rascunho. A prévia existente permite Agora/Antes/Depois. Renderer público continua SSR e filtra no servidor; atualização preserva geometria de títulos longos, sem links vencidos clicáveis no erro. 18 capturas inspecionadas, 85 E2E de regressão e 6 finais sobrepostos, 219 PG; [execução F14](../planejamento-features/execucao-f14.md). Sem biblioteca visual ou token novo.

## F16 — modelos por atividade

Cinco modelos declarativos com o ProfileView real; filtro, prévia em duas etapas, preservar por padrão e substituir com confirmação explícita. Exemplos ocultos precisam configurar destino no editor e passar pela moderação normal. Ajuste aria-current contextual em Modelos/Histórico; skeleton corresponde à composição de cards. 28 capturas inspecionadas, 117 E2E e seis finais sobrepostos, 227 PG. [Execução F16](../planejamento-features/execucao-f16.md). Sem lib de UI/token novo.

## F17 — importação revisada para a página

Fluxo Colar/Revisar/Confirmar, filtro com motivos por linha, edição isolada em modal e confirmação obrigatória. Nome real do grupo aparece na lista; skeleton usa a composição do formulário. Sucesso somente após commit, com retry durável mesmo se a resposta se perder. Não cria Link no catálogo nem publica automaticamente. 20 capturas inspecionadas, 233 PG, 123 E2E e seis finais sobrepostos. [Execução F17](../planejamento-features/execucao-f17.md).

## F18 — busca contextual na página pessoal

Controles locais abaixo da identidade, grupo/texto AND e ações à direita; mesmo ProfileView no público/prévia, com skeleton sem href obsoleto e estados locais de vazio/erro. CSS Module corrige a largura herdada de form e aplica tema pessoal aos campos/hover/paginação. Timer servidor compartilhado com consumidor anterior, sem nova regra comercial. 20 capturas finais inspecionadas; teclado/foco/Axe nos estados exercitados, 239 PG, 129 E2E e seis finais sobrepostos. [Execução e alternativas](../planejamento-features/execucao-f18.md). Parada ao concluir F18; CI/liberação remotos pendentes.

## F27 — filtros declarados de cidade/idioma/participação

Filtros locais padronizados e combinados no catálogo/busca/nicho/rede; opcionais na terceira etapa de criar link, em modal separado. Edição em tab local, versão/erro/retry e skeleton equivalente. 18 capturas inspecionadas e seis E2E finais próprios; regressões globais e limites documentados na [execução F27](../planejamento-features/execucao-f27.md). Nenhuma nova biblioteca visual ou token; ErrorState ganhou variante compacta para manter Salvar visível após erro, com default anterior preservado.

## F31 — métricas da página

Tela privada com ações externas à direita, filtros em card, vazio único, totais e alcance sem inferir leitura. Dataset insuficiente não gera lista repetitiva de números zero; a ausência da própria página oferece Criar minha página. Mesmo ProfileView público/prévia; observação apenas na composição pública, com finalidade específica. Skeleton preserva o vazio e a geometria medida; erros em português e recuperação mantêm filtros. 12 capturas revisadas, oito E2E próprios e 152 de regressão com sobreposição. PG global com uma pendência antiga F03; [execução e limites](../planejamento-features/execucao-f31.md).

## F34 — checklist

Quatro etapas obrigatórias e três sugestões, progresso do servidor e ações para seções do editor existente. Prévia/cópia explicitam seus limites. Atualização preserva dimensões medidas em desktop/mobile; espaçamento mobile corrigido após revisão nativa. [14 capturas e validação](evidencias/f34-2026-10-18/README.md); [contratos/testes/reversão](../planejamento-features/execucao-f34.md).

## F37 — alternativas de acesso

Grupos de canais com escolha humana, fontes aprovadas F12, pausa a publicar, validação por rede e clique revalidado. Listagem/filtros, formulário separado com stepper e configuração em duas etapas; prévia/renderer/histórico existentes. Recuperação pública usa página pessoal e pequena marca, sem chrome geral. [26 capturas](evidencias/f37-2026-10-18/README.md); [contratos/testes/escolhas/reversão](../planejamento-features/execucao-f37.md).
