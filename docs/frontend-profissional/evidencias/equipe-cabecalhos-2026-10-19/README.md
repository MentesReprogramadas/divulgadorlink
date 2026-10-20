# Cabeçalhos e alcance dos acessos — 19/10/2026

Pedido: alinhar título e descrição com os botões em Minha equipe e Acessos por página; esclarecer por que existem as duas visualizações.

## Alteração

As duas telas usam um cabeçalho local com uma coluna flexível de texto e outra para ações. Título e descrição ficam à esquerda, convite e atualização à direita, alinhados pelo topo. Abaixo de 48rem, o cabeçalho reorganiza texto e ações em linhas para manter leitura e toque.

O cabeçalho de Minha equipe explica que as permissões abrangem áreas da conta: conteúdo, métricas, financeiro e outras. Acessos por página agora usa o título “Acesso somente à minha página” e explica que o convite libera apenas a página com papel Editor ou Leitor. A lista interna foi renomeada para “Colaboradores desta página”, evitando repetir “Minha equipe” com outro sentido.

Há dois contratos de compartilhamento: workspace-team configura grants por área; profile-team usa membership de uma página com Editor/Leitor. Ambos podem permitir edição da página, portanto existe sobreposição de finalidade, mas o alcance e os convites são independentes. Nenhum contrato foi unificado ou alterado nesta tarefa. Fontes: backend/src/domain/access/profile-access.ts e backend/src/repositories/workspace-team.ts.

## Checks

- 20 testes de componentes de workspace-team e profile-team passaram.
- Lint e typecheck frontend passaram.
- Playwright Test: execução isolada com E2E_PORT_OFFSET=12000, E2E_RUN_ID=team-headers, containers próprios e build em .next-e2e. Resultado final e capturas abaixo.
- O novo cenário verifica a geometria real dos títulos e botões no desktop, as duas abas, os textos de alcance, ausência de overflow no mobile e em 320px com fonte 125%, e Axe na segunda aba.
- Sem mudança de backend, ícones, dependências ou regras de autorização. Não há validação de aparelho físico ou produção.

## Arquivos e reversão

workspace-team-screen.tsx, workspace-team.module.css, profile-team/team-screen.tsx, profile-team/team.module.css e frontend/e2e/workspace-team.spec.ts.

Cópias anteriores em output/team-headers-backup/. Comparar/restaurar somente esses arquivos e retirar este registro para desfazer esta fatia, preservando alterações locais anteriores. Não usar git reset.


## Resultado final

13 E2E passaram (inclui setup), nos projetos features e features-mobile. O setup executou o build de produção do frontend com sucesso. Capturas desktop e mobile foram inspecionadas; títulos e ações alinham no desktop e se reorganizam no mobile, sem overflow em 320px e fonte 125%. Axe passou. Log: output/team-headers-e2e.log. Avisos anteriores do build em componentes não alterados ficaram fora da fatia.

[Minha equipe no desktop](desktop-account-team-header.png) · [Acessos por página no desktop](desktop-page-team-header.png) · [Minha equipe no mobile](mobile-account-team-header.png) · [Acessos por página no mobile](mobile-page-team-header.png) · [320px e fonte 125%](mobile-page-team-header-zoom.png).
