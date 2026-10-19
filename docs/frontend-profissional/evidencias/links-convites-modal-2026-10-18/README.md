# Links e convites no mesmo modal

18/10/2026. Refinamento implementado a pedido do usuário após o fluxo inicial de grupos e acessos. Mantém contratos de validação, moderação, idade, publicação e isolamento.

## Resultado

- Adicionar link abre um modal com Link / Convite. Na edição aparece somente o tipo original; conversão não é oferecida.
- Link mantém os campos existentes, com abas Novo / Meus links. A opção Rede social saiu da criação; registros SOCIAL existentes continuam editáveis pelo endereço.
- Convite usa Mostrar título desligado na criação. O título aparece e é obrigatório ao ativar; desligar preserva o texto durante a edição. O destino usa abas Novo / Existente e o campo chama-se Link.
- Removidos os parágrafos explicativos do formulário de convite. Preservados avisos excepcionais de erro/validação e a opção de conteúdo para maiores de 18 anos.
- Atualizar convites é um botão de ícone com nome acessível, alinhado ao lado do select.
- Pausar convite e visibilidade de link/grupo aparecem somente na edição. Cards permitem Pausar/Retomar convite e Ocultar/Mostrar link ou grupo.
- O aviso público “Canais indicados pelo responsável. Conteúdo e participantes podem variar.” continua removido, conforme solicitação anterior.

A composição reutiliza OverlayDialog, TabNavigation, Field, Button e os tokens existentes. Não há biblioteca, dependência, migração ou mudança de identidade. O portal evita formulários HTML aninhados; o modal preserva foco e bloqueia fechamento durante salvamento.

## Validação

Ambiente local isolado: PostgreSQL e Redis próprios do E2E; web 15000, API 15333 e stubs 16099/16443. Nenhum serviço de envio ou pagamento real. Chromium em desktop 1280×720 e mobile emulado 390×844; testes adicionais em 320px com texto 200%. Chrome DevTools inspecionou DOM, estilos, console e composição em 1440×900 e janela reduzida (mínimo efetivo de 500px).

| Verificação | Resultado |
| --- | --- |
| Frontend lint e typecheck, incluindo E2E | Passaram |
| Frontend testes unitários | 349 passaram, 105 arquivos |
| Frontend build Next 15/React 19 | Passou no setup E2E, em .next-e2e |
| Backend lint, typecheck e build | Passaram |
| Backend suíte existente | 545 testes passaram, 127 arquivos |
| Proteção da composição de probe em produção | 1 teste adicional passou |
| Playwright grupos/perfil/convites desktop e mobile | 42 passaram (21 desktop + 21 mobile), 3,7 minutos |
| Diff dos arquivos desta entrega | Sem erros de whitespace |

Comandos executados: `npm run lint`, `npm run typecheck` e `npm test` no frontend; `next build` pelo setup E2E; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npx vitest run src/use-cases/public-content-validation-ports.spec.ts` no backend. Jornada: `E2E_PORT_OFFSET=12000 E2E_RUN_ID=link-modal-tabs npx playwright test --config playwright.link-modal.config.ts --output ../output/link-modal-tabs/e2e-final` (variáveis definidas por `$env:` no PowerShell).

A primeira execução encontrou seletores ambíguos (painel Link versus textbox Link), expectativa antiga de um atalho removido e validação dependente de destinos reais do Telegram/WhatsApp. Corrigidos os seletores/expectativa. A composição explícita do servidor E2E fornece respostas determinísticas para seis URLs sintéticas; os demais destinos mantêm o probe original. A troca é impedida em produção e não foi adicionada flag pública nem relaxada a validação de destinos.

Cobertura real: criação de link e convite sem fonte prévia; título on/off; novo/existente; catálogo; edição limitada ao tipo original; atualizar ao lado do seletor; pausar/retomar e ocultar/mostrar com recarga; erro e retry sem duplicar convite; fonte em análise impedida de publicar; conflito; links legados; foco/teclado; Axe; prévia e publicação pública; ausência de dados ocultos entre usuários/tenants; saída pública com token. DOM inspecionado sem formulários aninhados; console sem erros/avisos na sessão manual.

Capturas foram abertas e inspecionadas. São registros determinísticos de fixtures, sem baseline visual novo ou alegação de aumento de conversão. Mobile é emulação; não houve teste em aparelho físico, pesquisa com usuários ou deploy.

## Capturas

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Novo convite, título desligado | [Captura](compact-new-invite-desktop.png) | [Captura](compact-new-invite-mobile.png) |
| Convite existente, atualizar na mesma linha | [Captura](compact-existing-invite-desktop.png) | [Captura](compact-existing-invite-mobile.png) |
| Ações rápidas nos cards | [Captura](quick-card-actions-desktop.png) | [Captura](quick-card-actions-mobile.png) |

Demais capturas, inclusive 320px/200%, erro, prévia e público: `output/link-modal-tabs/e2e-final/`.

## Arquivos e reversão

Manifesto completo: `output/link-modal-tabs/files.json`. Implementação principal em `profile-link-dialog.tsx`, `profile-group-manager.tsx`, `profile-link-list.tsx`, `profile-editor.tsx`, `channel-dialog.tsx`, `profile-access-editor.tsx` e `channel-actions.ts`; estilos locais e tabs compartilhadas. Há testes atualizados e configuração dedicada de Playwright. Backend mudou somente para composição do probe de teste e sua proteção; sem alterações de dados ou regras de produto.

Cópias anteriores desta etapa em `output/link-modal-tabs/before/`; patch isolado em `output/link-modal-tabs/implementation.patch`. Para reverter somente esta etapa, aplicar o patch ao contrário após `git apply --reverse --check output/link-modal-tabs/implementation.patch`, preservando alterações posteriores, e remover esta pasta documental. Não usar reset geral: a árvore já continha outras alterações. Nenhuma branch, commit, push ou deploy foi feito.
