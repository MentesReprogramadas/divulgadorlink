# Áreas fixas do painel e entrada de admin — 27/10/2026

O seletor da sidebar foi substituído por três botões permanentes, nesta ordem: Meus links, Minha página e Outras páginas. A seleção acompanha a rota, com realce e `aria-pressed`; as ferramentas da área aparecem abaixo de uma linha divisória. O mesmo componente atende desktop, drawer mobile e administração. Áreas sem permissão permanecem visíveis e desabilitadas; as ferramentas e APIs continuam protegidas.

Meus links permanece a área inicial do usuário. O login de admin passa a abrir `/admin/visao`, inclusive ao retornar à tela de login com sessão já iniciada. `afterAuth` conserva a prioridade de suspensão, verificação e retornos locais validados. Os três botões reutilizam a proteção de rascunho; uma falha não troca a área.

Os helpers E2E agora conferem o destino inicial correspondente ao papel antes de abrir o painel usado pelo restante das fixtures. Isso atualiza os consumidores do login sem remover os testes de edição, moderação, equipe ou publicação.

Validação local:

- Lint, typecheck, 34 testes unitários focais e build frontend aprovados. Avisos existentes do Next/Autoprefixer preservados.
- 9 E2E aprovados, incluindo setup: três áreas, ausência do seletor, seleção, entrada de admin, navegação entre áreas, teclado, Axe, overflow e zoom. W09/W10 cobrem larguras de 320 a 1920 px.
- 4 jornadas de qualidade (usuário/admin, desktop/mobile) aprovadas no Chromium Windows e 4 no Chromium Linux Playwright 1.63.0 Noble. Candidatas de Novo link e Configurações foram geradas fora das referências, inspecionadas e depois incorporadas. O CI executa a comparação normal das referências no SHA enviado.
- Inspeção adicional via Playwright MCP: admin abre Administração e pode navegar a Minha página, com as três áreas visíveis no drawer. Capturas inspecionadas em `C:/VSCODE/divulgadorlinks/output/sidebar-areas-admin-desktop.png` e `sidebar-areas-page-mobile.png`; candidatas na pasta local `frontend/output/sidebar-areas-candidates` da cópia de publicação.
- A primeira tentativa E2E perdeu o processo Next antes dos testes; a repetição pelo executor padrão passou. Não foi necessário alterar a infraestrutura do projeto.
- Graphify consultado e atualizado incrementalmente em modo code-only, sem LLM/API ou clustering. Índice final: 7968 nós, 28696 relações. CSS e capturas exigem validação própria.

Sem alteração de dependências, backend, banco ou regras comerciais. Mobile foi emulado; não houve teste em aparelho físico nem auditoria manual exaustiva de contraste. CI e deploy devem ser conferidos pelo SHA, independentemente destes checks locais.

Reversão: reverter o commit desta entrega e publicar novamente pelo pipeline; não há migration ou mudança de dados para desfazer.

## Primeira execução no CI

Na execução [40553532300](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/40553532300), a suíte visual mobile aprovou 38 casos e falhou em `home-scroll.spec.ts`: depois de Mostrar mais, esperava 48 cards e encontrou 24. O trace contém resposta HTTP 200 com mais 24 itens orgânicos, mas a interface manteve a contagem inicial. Não houve falha de screenshot nos menus novos. A home e sua paginação não foram alteradas nesta entrega; a causa ainda não foi confirmada como intermitente.

O GitHub recusou a reexecução do job pela API com HTTP 403; as contas conectadas informam `push:false` e `admin:false`. O envio desta evidência pelo acesso Git SSH autorizado inicia uma nova execução completa pelo fluxo normal, sem retirar testes, aumentar tolerâncias ou acionar deploy fora do pipeline. O primeiro run não deve ser apresentado como aprovado; o resultado da nova execução é independente.
