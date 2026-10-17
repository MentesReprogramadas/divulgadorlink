# Minha página: links em grade e selects nos modais — 17/10/2026

## Pedido e implementação

- No grupo aberto, Voltar aos grupos, título e contagem ficam em um cabeçalho próprio, antes da barra de ações e dos links. Contagem permanece disponível também em grupo oculto.
- Editar grupo, Remover grupo e Adicionar link ficam visíveis, alinhados à direita. O menu Opções do grupo foi removido.
- Links usam grade responsiva com tracks de no mínimo 19 rem, limitados à largura disponível. Desktop apresenta cards lado a lado e preserva tracks vazios; não estica um único link por toda a página. No celular, os cards ocupam uma coluna. Título, destino, visibilidade e botão principal permanecem identificáveis.
- Cada card mostra Editar e Remover. O menu Mover e remover foi retirado. Ordenação continua pela alça com mouse/toque e pelas setas do teclado. Para trocar de grupo, editar o link e escolher Grupo; Cancelar preserva o grupo anterior, Concluir coloca o link ao fim do destino e conserva identidade e botão principal.

Referência visual: cards e ações explícitas de Grupos, Convites e Coleções já existentes no produto, com navy, tipografia, espaçamento e ícones compartilhados. Não foram criados ícones ou adicionadas dependências. Regras de publicação, rascunho, revisão, permissões e backend não foram modificadas.

## Diagnóstico e correção do select

O teste de navegador reproduziu a falha antes da correção: modal de 640 px com conteúdo horizontal de 704 px ao abrir Botão principal. O positioner era absoluto dentro do dialog e a largura do popup excedia o limite do próprio positioner. Isso acrescentava área rolável.

O `Select` compartilhado mantém o portal dentro do dialog nativo para conservar sua camada e interação, mas usa `positionMethod="fixed"` nesse contexto. Fora de dialogs permanece absoluto. O positioner acompanha a largura do campo, limitado à área disponível e ao viewport; o popup ocupa sua largura e mantém a rolagem vertical dentro da própria lista. Não se escondeu o overflow do modal como contorno.

Contrato técnico conferido na versão instalada Base UI 1.9.0 e na [documentação versionada de Select](https://github.com/mui/base-ui/blob/v1.9.0/docs/src/app/(docs)/react/components/select/types.md), consultada via Context7: Portal aceita container; Positioner aceita `absolute` e `fixed`. Não houve atualização de biblioteca.

## Validação

| Verificação | Resultado |
| --- | --- |
| Lint e typecheck frontend, incluindo E2E | Passaram |
| Testes afetados frontend | 45 passaram em 17 arquivos |
| Build de produção Next pelo setup | Passou |
| F09-E07: selects estáveis, F09-E01: criação/prévia/publicação, F09-E06: autosave/descarte, desktop/mobile | Passaram; a rodada teve 7 aprovações incluindo setup e dois E05 interrompidos pelo teste antigo de menu |
| Repetição final E05 e aparência personalizada, desktop/mobile e setup | 5 passaram, sem retry |

O typecheck final foi executado depois do build e passou. Uma tentativa simultânea ao início do build encontrou arquivos gerados `.next-e2e/types` sendo recriados; não foi necessário alterar código ou configuração para corrigir essa corrida entre executores.

Frontend lint, typecheck (incluindo E2E) e **45 testes em 17 arquivos** passaram. Incluem perfis, regras de organização, rascunho, entrada/select, favoritos, convites e ícones de navegação. O novo teste de edição confirma cancelar e aplicar troca de grupo sem perder o botão principal.

E2E F09-E07 mede largura, altura, scrollWidth/clientWidth e área rolável antes/depois de abrir selects de botão principal, tipo de link e catálogo. Verifica popup no viewport, Escape mantendo o modal aberto e foco devolvido ao select. F09-E05 aplica a mesma verificação ao select Grupo e valida cards lado a lado, ações visíveis, DnD por mouse/toque, setas do teclado, transferência, persistência e remoções. Axe e reflow 320 px com texto a 200% continuam no fluxo afetado.

O primeiro E05 adaptado encontrou uma condição antiga do teste que só clicava em Remover grupo se o botão estivesse oculto. Como o botão agora está visível, o teste não abria a confirmação. A condição foi retirada; nenhuma alteração de aplicação foi feita para contornar a falha do teste.

Setup/teardown Playwright existentes, banco sintético e containers próprios. Offset 3400: web 6400, API 6733, stub 7499, HTTPS fixture 7843, PostgreSQL 8833 e Redis 9780. Build Next de produção usa `.next-e2e`, preservando o servidor local. Containers e servidores próprios encerrados pelo teardown; nenhum serviço de outro trabalho foi encerrado. Capturas e traces em `output/profile-group-grid/baseline`, `final` e `confirmed`.

Comandos no frontend: `npm run lint`; `npm run typecheck`; `npm test -- src/features/profiles src/components/ui/input.test.tsx src/components/layout/navigation-icons.test.tsx src/features/favorites src/features/redirects`. Playwright inicialmente selecionou `F09-E0[1567]` nos projetos features e features-mobile. Repetição final inclui E05 e aparência personalizada para cobrir também select fora do modal.

## Capturas e limites

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Grupo aberto e links em grade | [Cards](group-links-desktop.png) | [Cards](group-links-mobile.png) |
| Select do botão principal aberto | [Select](primary-select-open-desktop.png) | [Select](primary-select-open-mobile.png) |
| Select de catálogo aberto | [Catálogo](catalog-select-open-desktop.png) | [Catálogo](catalog-select-open-mobile.png) |
| Troca de grupo na edição | [Grupo](group-select-open-desktop.png) | [Grupo](group-select-open-mobile.png) |

[Captura do select antes da correção](select-before-desktop.png), associada à falha de overflow reproduzida pelo E07.

Desktop e mobile Chromium emulados; gestão em 1440 px/390 px e modais em 1280 px/390 px. Dados sintéticos, fontes carregadas e animações desativadas. A inspeção visual confirmou cabeçalho separado, ações à direita, cards compactos e menus de select sem aumentar o modal. Não foram atualizados baselines automaticamente. Emulação não equivale a aparelho físico; não houve deploy ou validação em produção, nem certificação de acessibilidade.

## Arquivos e reversão

Aplicação: `frontend/src/components/ui/select.tsx`, `select.module.css`; `frontend/src/features/profiles/components/profile-group-manager.tsx`, `profile-link-list.tsx` e `profile-groups.module.css`. Testes: `profile-group-manager.test.tsx` e `frontend/e2e/profiles.spec.ts`.

As versões imediatamente anteriores desta solicitação estão em `output/profile-group-grid/before`, com caminhos relativos ao repositório. Comparar e reverter somente os trechos desta fatia, preservando edições concorrentes. Não restaurar a partir de HEAD, pois os arquivos já continham trabalho anterior não commitado. O backend e as migrations permanecem como estavam antes desta solicitação. Nenhum branch, commit, push ou deploy foi criado. Evidências podem ser removidas separadamente.
