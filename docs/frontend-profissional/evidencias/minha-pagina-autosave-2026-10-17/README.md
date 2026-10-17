# Minha página: simplificação e rascunho automático — 17/10/2026

## Escopo e resultado

Esta etapa substitui o assistente, o salvamento manual e a aba Publicação descritos na evidência anterior de organização. O pedido mais recente também removeu o aviso persistente de salvamento e transferiu a escolha do botão principal para um modal.

- Três abas no desktop e celular: Grupos e links, Página e Aparência. Cadastro vazio começa em Página; conteúdo existente começa nos grupos.
- Banner acima das abas: “Tem alterações não publicadas”, Descartar e Publicar. A comparação considera conteúdo normalizado, incluindo ordem, visibilidade e aparência; números de versão diferentes não provocam avisos falsos.
- Campos, grupos e links alterados recebem borda/fundo âmbar. Campos sem mudanças conservam a apresentação normal.
- Rascunho salvo automaticamente após 700 ms sem nova edição. Respostas atualizam a versão sem substituir o texto digitado durante a requisição; um único escritor serializa as alterações. Erros ficam destacados e conservam a edição. Reconexão tenta novamente; conflito entre abas exige recarregar.
- Prévia com o ícone compartilhado `preview`; recarregar usa `RefreshButton`, com nome acessível e tooltip, fora do menu. Ações alinhadas à direita. “Salvo automaticamente” e o botão de salvar foram removidos; salvamento em andamento e dados incompletos têm mensagens transitórias.
- Botão principal abre modal com select, Cancelar e Concluir. Fica ao lado de Adicionar grupo, à direita. Sem links, fica desabilitado. Cancelar não altera a seleção aplicada.
- Menu secundário reúne abrir página e retirar do ar somente após existir publicação. O menu fecha ao pedir retirada, evitando interceptar sua confirmação no celular.

Cards, arraste por mouse/toque, alternativas por teclado, edição/remoção e transferência de links entre grupos permanecem disponíveis. A referência principal continua sendo Convites e Coleções do próprio produto, conforme solicitado. Nenhuma biblioteca foi instalada.

## Publicação e descarte

Salvar o rascunho não publica. Publicar continua explícito e mantém revisão, restrições e autorização do servidor. Descartar aguarda eventual escrita em andamento, restaura o conteúdo publicado e interrompe o salvamento das edições descartadas. Nome, endereço, foto, grupos, links, visibilidade, botão principal e aparência são restaurados juntos.

O backend conserva uma cópia privada do conteúdo completo aprovado em `profiles.publishedDraft`. A publicação pública continua filtrada e não recebe itens ocultos nem essa cópia privada. A rota autenticada `POST /me/profile/discard` verifica dono, tenant e versão sob o bloqueio já usado pelo editor. Revisões pendentes/recusadas substituídas são invalidadas pelo descarte. Aprovação humana também atualiza a referência publicada.

Antes da primeira publicação, Descartar fica desabilitado: ainda não existe uma versão publicada para restaurar. Na migração de registros antigos, prioriza-se o snapshot aprovado; quando rascunho e publicação têm a mesma versão, reconstrói-se o conteúdo completo. Se só restou a publicação filtrada de uma versão antiga, conteúdo oculto daquela versão não pode ser reconstruído. Uma segunda migração remove referências antigas de botão principal cujo item já não existe.

As duas migrations desta etapa foram aplicadas e registradas no banco local de desenvolvimento em `localhost:5437`, sem executar migrations alheias pendentes nele. Bancos descartáveis de teste receberam todas as migrations do workspace. Nenhum deploy foi feito.

## Validação

| Verificação | Resultado |
| --- | --- |
| Frontend lint e typecheck (incluindo E2E) | Passaram |
| Unitários frontend: perfis e ícones de navegação | 30 testes, 11 arquivos, passaram |
| Build de produção Next 15 pelo setup E2E | Passou com os últimos controles |
| Fluxo anterior aos últimos controles | 23 E2E passaram, desktop/mobile e setup |
| Últimos controles: regressão completa | 21 passaram; dois casos do mesmo seletor de teste foram corrigidos e repetidos separadamente |
| Repetição final do cenário afetado, desktop/mobile e setup | 3 passaram, sem retry; seleção, foco, prévia, publicação e conteúdo oculto confirmados |

Na rodada dos últimos controles, o helper `getByLabel('Botão principal')` encontrava tanto o título do modal quanto o select. Foi substituído pelo papel `combobox` e nome exato. O aplicativo não foi alterado como contorno do teste. Uma falha anterior real do menu no celular foi corrigida fechando-o antes de abrir a confirmação de retirada.

Backend: lint, typecheck e build aprovados. A rodada final de perfis, revisão e regras puras passou com **46 testes em 7 arquivos**, usando PostgreSQL descartável em 8833. Container próprio removido após os testes. Uma tentativa posterior de regenerar o Prisma Client encontrou DLL bloqueada (`EPERM`); a geração anterior da nova coluna tinha concluído e o typecheck e os testes finais passaram com o cliente disponível. Nenhum processo de outro trabalho foi encerrado.

Frontend: regressão cobre salvamento sem roubar foco, publicação confirmada, edição inválida e descarte, falha de conexão, escrita concorrente e conflito. A escolha do botão principal cobre cancelar e confirmar pelo select real do projeto.

Comandos: `npm run lint`, `npm run typecheck`, `npm test -- src/features/profiles src/components/layout/navigation-icons.test.tsx` no frontend; lint/typecheck/build e `npx vitest run --no-file-parallelism src/http/profiles.pg.spec.ts src/http/content-reviews.pg.spec.ts src/domain/profiles src/domain/content-review` no backend. Playwright: `e2e/profiles.spec.ts e2e/content-reviews.spec.ts e2e/loading-layout.spec.ts --grep 'F09|Revisão|L01 painel' --project=features --project=features-mobile`; repetição afetada com `--grep F09-E01`. Artefatos em `output/profile-autosave/final`, `controls` e `modal-final`.

Playwright usa setup/teardown existentes, build Next de produção em `.next-e2e`, dados sintéticos e containers próprios. Portas deslocadas: web 6300, API 6633, stub 7399, HTTPS fixture 7743, PostgreSQL 8733 e Redis 9680. A validação cobre desktop/mobile emulado, reflow de 320 px com texto a 200%, teclado/foco, axe nos estados exercitados, temas, foto, DnD, revisão humana e contestação. Não equivale a validação em aparelho físico, certificação de acessibilidade ou produção.

## Capturas inspecionadas

Desktop de gestão/campos em 1440 px e celular emulado de 390 px; fontes carregadas, animações desativadas, dados sintéticos. Comparação visual confirmou banner destacado, três abas visíveis, ações de grupo à direita e destaque somente nos campos alterados. Sem atualização automática de baselines.

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Grupos e ações à direita | [Grupos](groups-overview-desktop.png) | [Grupos](groups-overview-mobile.png) |
| Links do grupo | [Links](group-links-desktop.png) | [Links](group-links-mobile.png) |
| Campos não publicados | [Alterações](unpublished-fields-desktop.png) | [Alterações](unpublished-fields-mobile.png) |
| Versão publicada restaurada | [Restaurada](published-restored-desktop.png) | [Restaurada](published-restored-mobile.png) |
| Escolha do botão principal | [Modal](primary-button-modal-desktop.png) | [Modal](primary-button-modal-mobile.png) |

Os containers e servidores próprios das rodadas E2E foram encerrados pelo teardown. Serviços locais existentes foram preservados.

## Arquivos e reversão

- Editor e persistência: `frontend/src/features/profiles/profile-editor.tsx`, `use-profile-draft.ts`, `profile-api.ts`, `profile-contract.ts`, `profile-diff.ts`.
- Apresentação: `components/profile-changes.tsx`, `profile-changes.module.css`, campos, aparência, grupos, links, skeleton e seus CSS Modules em `frontend/src/features/profiles/components`.
- Servidor: schema Prisma, migrations `20261017200000_profile_published_draft` e `20261017200001_profile_published_primary`, repositório de perfis, rotas de Profiles e aprovação de conteúdo em Moderation.
- Testes: unitários de editor/diff/autosave/grupos, PG de perfis; E2E `profiles.spec.ts`, `content-reviews.spec.ts` e `loading-layout.spec.ts`.

Cópias anteriores desta solicitação estão em `output/profile-autosave/before`, preservando as mudanças anteriores de organização. Para reversão, comparar essas cópias e retirar somente os trechos desta etapa, além dos novos arquivos de diff/autosave/destaque. O schema tem alterações concorrentes de analytics: remover somente `publishedDraft` do código revertido, sem restaurar o arquivo inteiro. Não usar reset ou restaurar o workspace a partir de HEAD. A coluna extra pode permanecer sem uso ao reverter a aplicação; removê-la depois exige migration adicional e perda deliberada dos snapshots, não apagar migrations já aplicadas. Evidências e capturas podem ser removidas separadamente. Nenhum commit, push ou branch foi criado.
