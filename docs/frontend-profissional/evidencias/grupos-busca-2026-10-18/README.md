# Grupos compactos e busca opcional — 18/10/2026

## Pedido e comportamento

O usuário pediu reduzir o empilhamento de Canais de acesso, Botão principal e Adicionar grupo; tornar a busca da página opcional, com campo único, botão Filtros, modal e aplicação automática. Complementos explícitos: **desativada por padrão** e presente nas prévias quando ativada.

### Grupos e links

- `+ Grupo` passa para a mesma barra de Prévia, atualizar e três pontos. Canais de acesso e Botão principal ficam na primeira seção do dropdown, com seus nomes e ícones.
- No celular, o rótulo visual da aba é Links; o nome acessível continua Grupos e links. A barra comporta abas e ações em duas linhas a 320 e 390 px em tamanho normal. Texto ampliado pode exigir linhas adicionais para manter legibilidade e toque.
- Só adicionar grupo recebe destaque primário nessa área; Prévia tem tratamento secundário. As demais abas mantêm o destaque anterior de Ver prévia.
- As operações continuam no gerenciador de grupos; portais de apresentação colocam seus controles na barra, sem duplicar estado ou callbacks. Pending continua desabilitando os controles mesmo fora do fieldset. O skeleton usa os mesmos destinos e controles.
- Ao abrir o seletor de botão principal, o menu fecha; cancelar/Escape devolve o foco aos três pontos. Criação, ordenação, arraste, remoção e seus diálogos seguem o fluxo existente.

### Busca e personalização

- Aparência oferece Exibir busca na minha página. A ausência da preferência equivale a desativada, incluindo publicações antigas; não se inferiu ativação pela quantidade de links.
- A opção integra o rascunho e o histórico. A simulação dentro da personalização e a prévia privada refletem a escolha imediatamente; a página pública só muda ao publicar. Temas e modelos visuais preservam a preferência escolhida.
- Quando ativada: um campo de pesquisa com X para limpar somente o texto e um botão Filtros. Sem botão Buscar. Digitação dispara após 350 ms sem nova alteração; Enter também pesquisa imediatamente. Trocar o grupo aplica imediatamente, sem confirmação adicional.
- O modal concentra Grupo de links, Limpar filtros e Concluir. Limpar filtros reinicia texto, grupo e paginação; Concluir apenas fecha o modal. Escape devolve foco ao botão Filtros; limpar texto mantém foco no campo.
- O campo continua editável durante a busca. Alterar o texto cancela a requisição anterior; respostas antigas não substituem a consulta atual. Links antigos ficam indisponíveis enquanto resultados novos estão sendo obtidos. Erro conserva a consulta e oferece retry.
- Quando desativada, o servidor ignora texto/grupo de consultas válidas para evitar uma página filtrada sem controles visíveis. Paginação assinada e limite de itens continuam disponíveis. Validação de parâmetros/cursor, isolamento, idade, conteúdo oculto e janelas de agendamento permanecem no servidor.

## Contrato e organização

`appearance.searchEnabled` é um booleano opcional no contrato existente de aparência; o renderer e a busca tratam somente `true` como ativação. Persistência usa o JSON já existente, sem migration ou mudança de dependência. Clientes e snapshots anteriores continuam aceitos pelo backend. Ao distribuir esta alteração, disponibilizar primeiro o backend que reconhece o campo, pois o normalizador do frontend passa a enviá-lo.

`ProfileSearchControls` apresenta campo/modal, sem transporte. `ProfileExplorer` mantém debounce, cancelamento, URL, erros e dados. O modo incorporado da simulação usa um contêiner em vez de um formulário para não inserir form dentro do formulário de edição; permanece uma simulação inerte. Reutilizados OverlayDialog, Select e os tokens de tema, inclusive no modal escuro.

Reutilizados plus, preview, refresh, channels, primaryLink, filter e resetFilters. `clearSearch` é um X circulado exclusivo para limpar texto, distinto de close, que continua fechando janelas, e de resetFilters, que reinicia todos os filtros. Ícones, alvos de toque, nomes acessíveis e contraste inspecionados nos estados exercitados.

## Validação

Ambiente isolado em `output/profile-search-layout/validation`, com dependências locais existentes, dados sintéticos e build de produção Next 15. Portas: web 7200, API 7533, stub 8299, HTTPS 8643, PG 9633 e Redis 10580. PostgreSQL separado em 9634 para os testes HTTP, criado e removido exclusivamente por esta tarefa. Bancos de desenvolvimento e outros processos preservados.

- Frontend: lint e unitários afetados passaram, 56 testes em 18 arquivos.
- Backend: lint, typecheck e build passaram; 67 testes de domínio/paginação/canais/modelos em 16 arquivos passaram.
- HTTP com PostgreSQL: 35 testes em perfis, busca e revisão/contestação passaram. Incluem persistência da preferência, distinção entre rascunho/publicação, legado desativado e proteção de conteúdo oculto/futuro.
- Piloto: 8 passaram e a inspeção identificou uma terceira linha em 320 px. Redução de espaçamento e rótulo corrigiu a barra, sem reduzir alvos de toque.
- Regressão ampliada: 41 passaram em desktop/mobile. Duas famílias de testes precisaram de ajuste de execução: auditoria disparada durante a animação de fechamento do modal; rotina de purge que exige identificador E2E com prefixo `f31-`. Nenhuma proteção de ambiente ou regra de acessibilidade foi removida.

Repetição final: **9 passaram**, sem retry, incluindo setup e F09-E12, F18-E01, F18-E04 e F31-E04 em desktop/mobile. Typecheck do frontend e build de produção passaram. Axe não encontrou violações nos estados exercitados; contraste do contorno dos campos medido em pelo menos 3:1. A busca com texto ampliado a 200% em 320 px, falha de rede, retry, histórico do navegador, cursor expirado e respostas obsoletas passaram na regressão ampliada. A simulação não produz avisos de formulário aninhado/hidratação no cenário final.

Comandos no frontend: `npm run lint`; `npm run typecheck`; `npm test -- src/features/profiles src/components/layout/navigation-icons.test.tsx`. Regressão: `npx playwright test e2e/profiles.spec.ts e2e/profile-search.spec.ts e2e/profile-interaction.spec.ts --project=features --project=features-mobile --output=artifacts/regression`, com `E2E_PORT_OFFSET=4200` e `E2E_RUN_ID=profile-search-layout-20261018`. Repetição final: mesmos arquivos/projetos, filtro `--grep 'F09-E12|F18-E04|F18-E01|F31-E04'`, `--output=artifacts/final` e `E2E_RUN_ID=f31-search-layout-final`, atendendo ao contrato da rotina isolada de purge.

Backend: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test -- src/domain/profiles src/lib/profile-item-search-page.spec.ts src/lib/profile-channel-search.spec.ts`; HTTP com `PG_SPECS=1`, `ANALYTICS_DATABASE_URL` do PG descartável em 9634 e `npx vitest run --no-file-parallelism src/http/profile-item-search.pg.spec.ts src/http/profiles.pg.spec.ts src/http/content-reviews.pg.spec.ts`. Banco recebeu apenas migrations existentes; nenhuma migration nova foi criada. Containers e portas da tarefa foram encerrados e conferidos ao final.

| Capturas finais inspecionadas | Desktop | Mobile |
| --- | --- | --- |
| Grupos e barra compacta | [Grupos](groups-compact-desktop.png) | [Grupos](groups-compact-mobile.png) |
| Ações no menu | [Menu](groups-options-desktop.png) | [Menu](groups-options-mobile.png) |
| Opção e simulação | [Personalização](search-option-enabled-desktop.png) | [Personalização](search-option-enabled-mobile.png) |
| Campo com X na prévia completa | [Prévia](search-private-automatic-desktop.png) | [Prévia](search-private-automatic-mobile.png) |
| Modal de filtros | [Filtros](search-filter-modal-desktop.png) | [Filtros](search-filter-modal-mobile.png) |
| Página pública com busca ativada | [Pública](search-public-compact-desktop.png) | [Pública](search-public-compact-mobile.png) |

[Galeria de capturas](preview.html). Dados sintéticos, fontes carregadas, animações desativadas nas capturas; nenhum baseline atualizado automaticamente. Emulação não equivale a aparelho físico ou certificação de acessibilidade; conversão e produção não foram medidas.

## Arquivos e reversão

- Grupos: `profile-group-actions`, `profile-group-manager`, `profile-fields`, `profile-editor-toolbar`, `profile-editor-skeleton`, `profile-editor` e CSS correspondentes em `frontend/src/features/profiles`; compactLabel em `components/ui/tabs` e na definição de seções.
- Busca e preferência: `profile-search-controls`, `profile-search.module.css`, `profile-explorer`, `profile-appearance`, `profile-appearance-editor`, `profile-device-preview` e `profile-comparison`.
- Backend: schema de aparência, `profile-item-search-page` e `template-content`; testes correspondentes e HTTP de busca.
- Ícone: `components/ui/action-icon.tsx`, teste de exclusividade e registro de navegação. E2E de perfis, busca e privacidade ajustados ao comportamento solicitado.

Cópias do início desta solicitação em `output/profile-search-layout/before`, contendo somente arquivos envolvidos. Patch incremental de aplicação/testes em `output/profile-search-layout/changes.patch`; `git apply -R --check output/profile-search-layout/changes.patch` passou sem aplicar a reversão. A reversão deve retirar apenas esse diff, conservando a visão geral, as alterações de histórico/prévias e quaisquer mudanças preexistentes. Não restaurar arquivos inteiros de HEAD. Não há migration para desfazer. Documentação e capturas podem ser removidas separadamente. Nenhuma branch, commit, push ou deploy foi feito.
