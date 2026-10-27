# Atalhos do painel e formulário da página — 27/10/2026

Pedido: atalhos no topo da sidebar para Minha página, Meus links e Outras páginas, mantendo o seletor; corrigir os cards sobrepostos da apresentação; publicar pela main.

`WorkspaceNavigation` oferece as outras áreas permitidas acima do seletor, tanto na sidebar desktop quanto no menu mobile compartilhado. Os botões reutilizam `changeContext`, a conferência de permissões e `prepareWorkspaceSwitch`; erro ao salvar mantém a área atual. A rota determina o valor do seletor. O skeleton reserva espaço para os atalhos.

O fieldset de apresentação e os marcadores `ChangedField` recebiam superfícies ópticas adicionais dentro do card externo. Foram retiradas essas camadas; campos mantêm seus controles e o card externo. Alterações não publicadas conservam marcador lateral e descrição no title. A correção compartilhada também alcança os marcadores de aparência, grupos e recursos do editor.

Validação local sobre a main, em checkout existente separado da árvore de laboratório:

- Lint, typecheck e build frontend aprovados; avisos existentes de Autoprefixer/ESLint/root do Next preservados.
- 36 testes unitários focais: navegação, proteção do rascunho, editor e ícones.
- 5 E2E aprovados, incluindo setup: atalhos e W10 em desktop/mobile. Verificam teclado, sincronização do seletor, os três contextos, permissões existentes, overflow e Axe. W10 cobre 320, 390, 1024, 1440 e 1920 px.
- Mais 2 casos de qualidade da jornada de usuário em Chromium Windows e 2 em Chromium Linux (Playwright 1.63.0 Noble), desktop/mobile, aprovados. Candidatas foram geradas fora das referências e inspecionadas antes da atualização das imagens de Novo link. A referência Windows mobile ainda representava o tema antigo e foi reconciliada com a implementação vigente; Linux mobile conserva o layout e registra a composição estática atual do fundo.
- Inspeção real adicional via Playwright MCP no formulário a 1280 e 390 px; capturas inspecionadas. Sem overflow; fieldset transparente e sem lente própria. Evidências locais em `C:/VSCODE/divulgadorlinks/output/sidebar-identity-*.png` e no output/test-results da cópia de publicação.
- Grafo consultado antes da edição e atualizado localmente em modo code-only, sem LLM/API ou clustering. CSS e capturas não são comprovados pelo índice.

Sem dependências novas, alterações no backend ou regras comerciais. Não houve teste em aparelho físico nem auditoria manual exaustiva de contraste/zoom. O CI e o deploy têm status independente dos checks locais e devem ser conferidos pelo SHA publicado.

Reversão: reverter o commit desta entrega e publicar novamente pelo pipeline, preservando alterações de outras tarefas. Não há migration ou reversão de dados.
