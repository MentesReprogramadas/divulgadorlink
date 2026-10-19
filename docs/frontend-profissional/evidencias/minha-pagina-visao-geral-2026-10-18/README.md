# Minha página: visão geral e ações por largura — 18/10/2026

## Direção implementada

Pedido do usuário: adicionar uma aba principal com link, copiar, QR Code, informações úteis e cards de ações; colocar o máximo de ferramentas que couberem na linha das abas junto de Ver prévia, atualizar e três pontos; manter nomes e ícones no dropdown.

`Visão geral` passa a ser a entrada padrão tanto para página vazia quanto existente. As três abas anteriores permanecem: Grupos e links, Página e Aparência. Os acessos com `secao=links`, `secao=pagina` e `secao=aparencia` continuam abrindo diretamente a seção pedida; `secao=visao-geral` também é aceito.

- Card Sua página: nome, situação de publicação/revisão e endereço publicado, Copiar e QR Code. Sem publicação, explica a disponibilidade do compartilhamento e oferece Configurar página.
- Card Seu conteúdo: quantidades de grupos e links do rascunho, distinção entre editar e publicar e atalho de edição. Não apresenta esses números como dados públicos ou métricas de audiência.
- Ferramentas: importar, modelos, histórico, métricas, checklist e personalização. Cards têm ícone, rótulo e explicação curta. Reutilizam as ações existentes; não implementam transporte ou regras comerciais.
- Barra: mede abas, fontes e botões reais. Expõe as ferramentas que cabem, preservando Ver prévia, atualizar e três pontos. Excedente vai para o dropdown com os mesmos nomes e ícones. Em telas estreitas, as ações passam para a linha seguinte; abas se reorganizam com texto ampliado.
- Dropdown: fecha com Escape e devolve foco; fecha ao clicar fora. Abrir página e retirar do ar conservam seus destinos e confirmação. A publicação continua no banner existente, fora do menu.

Não foram alterados backend, dependências, autorização, publicação, revisão, cobrança, analytics ou URLs públicas. Autosave, confirmação de escrita antes de prévia/ferramentas, descarte, conflitos e revalidação do QR permanecem nos contratos anteriores.

## Componentes e ícones

`ProfileEditor` mantém sessão de edição, dados e operações; `ProfileEditorToolbar` cuida de navegação, encaixe e dropdown; `ProfileOverview` recebe dados e callbacks para apresentação. O skeleton compartilha a mesma barra e começa na visão geral. CSS Modules locais, tokens existentes, nenhuma biblioteca adicionada.

Ícones de ferramentas vêm de `profileEditorActions`, compartilhados nos três locais. `appearance`, uma paleta, distingue personalização visual de configuração (`settings`); também é usado pela etapa de apresentação no checklist. `profile` identifica a página; `link` identifica o resumo dos links. Demais símbolos e nomes preservados.

## Validação

Execução em cópia isolada em `output/profile-overview-validation`, preservando alterações paralelas de aparência/histórico e servidores existentes. PostgreSQL e Redis descartáveis com nomes exclusivos; portas web 7100, API 7433, stub 8199, fixture HTTPS 8543, PG 9533 e Redis 10480. Setup e teardown existentes do Playwright, build de produção Next 15 e dados sintéticos.

Primeira rodada: E08 e E11 em desktop/mobile, mais setup: **5 passaram**. Inspeção real das capturas confirmou hierarquia, quatro abas visíveis no celular e equivalência dos ícones/rótulos entre barra, dropdown e cards.

A regressão ampliada identificou um overflow transitório do indicador animado da aba ativa em 320 px com texto a 200%. A correção limita a pintura do indicador à lista de abas quando elas se reorganizam; não esconde conteúdo ou ações. Uma corrida de título no teste do checklist passou a aguardar o título real antes da auditoria axe. Não foram alteradas tolerâncias ou regras de acessibilidade.

| Verificação final | Resultado |
| --- | --- |
| Lint no frontend isolado | Passou |
| Typecheck de aplicação e E2E | Passou |
| Unitários de perfis, checklist e ícones | 56 testes, 19 arquivos, passaram |
| Build de produção Next 15 pelo setup E2E | Passou |
| Regressão ampliada: perfis, QR Code, revisão/contestação, importação, modelos e checklist; desktop/mobile | 51 passaram; duas falhas diagnosticadas acima |
| Repetição final dos dois cenários corrigidos e E11, desktop/mobile e setup | 7 passaram, sem retry |
| Layout e interação | Inspeção de capturas, Escape/retorno de foco, rótulos/ícones, links, carregamento e 320 px com texto a 200% |
| Larguras adicionais no E11 | 768, 1024 e 1440 px sem overflow; abas e prévia alinhadas em 1920 px |
| Acessibilidade automatizada | Axe sem violações nos estados exercitados, sem excluir regras |

Comandos no frontend da cópia: `npm run lint`; `npm run typecheck`; `npm test -- src/features/profiles src/features/profile-checklist src/components/layout/navigation-icons.test.tsx`. Playwright ampliado: `npx playwright test e2e/profiles.spec.ts e2e/profile-import.spec.ts e2e/profile-templates.spec.ts e2e/profile-checklist.spec.ts e2e/permanent-qr.spec.ts e2e/content-reviews.spec.ts --project=features --project=features-mobile --output=artifacts/regression`. Repetição final: `npx playwright test e2e/profiles.spec.ts e2e/profile-checklist.spec.ts --grep 'F09-E11|aparência personalizada|F34-E01' --project=features --project=features-mobile --output=artifacts/final`. Todas as rodadas usaram `E2E_PORT_OFFSET=4100` e `E2E_RUN_ID=profile-overview-20261018`.

Uma execução de typecheck no checkout compartilhado encontrou tipos gerados inconsistentes em `.next-e2e/types/validator.ts` durante a atividade paralela. O typecheck final passou na cópia isolada, com tipos produzidos pelo build correspondente; não foram removidos caches/processos do outro trabalho. Containers e portas próprios encerrados pelo teardown, conferidos ao final. Patch desta fatia em `output/profile-overview-validation/changes.patch`; `git apply -R --check` passou sem aplicar a reversão.

| Captura inspecionada | Desktop | Mobile |
| --- | --- | --- |
| Visão geral | [Tela](overview-desktop.png) | [Tela](overview-mobile.png) |
| Dropdown e foco | [Menu](overview-overflow-desktop.png) | [Menu](overview-overflow-mobile.png) |
| Carregamento | [Skeleton](overview-loading-desktop.png) | [Skeleton](overview-loading-mobile.png) |
| 320 px, texto a 200% | [Reflow](overview-320-text-200-desktop.png) | [Reflow](overview-320-text-200-mobile.png) |

Capturas reais com fontes carregadas e animações desativadas, dados sintéticos e sem atualização automática de baselines. Galeria no HTML de proposta foi atualizada para mostrar a implementação. Emulação não substitui aparelho físico; teste automatizado não certifica acessibilidade total e esta etapa não mede conversão em produção.

## Arquivos e reversão

Aplicação: `profile-editor.tsx`, `profile-editor-section.ts`, componentes `profile-editor-toolbar`, `profile-overview`, `profile-editor-skeleton` e CSS em `features/profiles/components`; ícone `appearance` em `components/ui/action-icon.tsx` e referência no checklist. Regressão: unitários do editor/ícones, helper E2E `profile-editor.ts` e cenários de perfis/importação/modelos/checklist/revisão afetados pela nova entrada.

Para reverter, retirar apenas a integração da visão geral/barra, restaurar a entrada anterior e os testes correspondentes, remover os quatro novos arquivos de componentes/CSS e reverter a inclusão/referência de `appearance`. Preservar as alterações paralelas de aparência, prévias e histórico. Não restaurar arquivos inteiros a partir de HEAD. Documentação e capturas podem ser removidas separadamente. Nenhuma branch, commit, push ou deploy foi criado nesta tarefa.
