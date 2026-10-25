# Sidebar por contexto e links permanentes — 21/10/2026

Pedido: executar a proposta aprovada de três áreas, separar ferramentas da página das ferramentas de links/clientes e retirar a ambiguidade de Convites. Branch `codex/roadmap-f37-testes`, WORKTREE. Esta revisão sucede a organização Publicar/Cuidar e crescer/Conta. Não cria feature comercial, permissão, migration ou deploy.

## Estrutura entregue

Seletor **Área do painel**, usando Select da casa. Opções filtradas conforme as permissões existentes; rota direta determina o contexto e o item ativo, inclusive links permanentes/distribuição e páginas de clientes. Entradas de conta mantêm o contexto da navegação durante a sessão do componente. Meus links é a primeira opção e o padrão numa recarga em rota comum de conta, sujeito às permissões; preferência visual não concede acesso.

| Área | Navegação |
| --- | --- |
| Minha página | Visão geral; Editar página; Recursos da página; Resultados; Divulgar; Contatos recebidos; Ferramentas |
| Meus links | Visão geral do painel; Links no catálogo; Links permanentes; Pedidos e pagamentos |
| Outras páginas | Páginas que gerencio; Acessos por página; Transferir página |
| Comum às três | Minha conta; Equipe e permissões; Ajuda |

**Editar página:** Apresentação, Grupos e links, Aparência, Idiomas, Modelos, Endereço próprio. **Recursos da página:** Busca e filtros, Formulário de contato, Descoberta. **Resultados:** Visitas e cliques, Melhorias sugeridas, Comparar botões. **Divulgar:** Campanhas, Criar imagem, Apresentação para parceiros. **Ferramentas:** Revisar publicação, Histórico de versões, Importar links, Importar e exportar página, Integrações e avisos. **Minha conta:** Meus dados, Assinatura da página, Lembretes, Favoritos, Categorias seguidas.

Um grupo aberto por vez, sem menus em três níveis. Criar link continua sendo ação na listagem, não destino duplicado da sidebar. A visão geral do painel foi conservada na área Meus links para preservar acesso ao resumo existente. Ajuda abre um diálogo curto sobre os contextos; não aponta para uma rota inexistente nem canal de suporte inventado. Logout continua no cabeçalho desktop e no rodapé vermelho do drawer mobile, conforme contrato anterior. Administração conserva suas áreas e autorização.

Troca de área chama a proteção existente `prepareWorkspaceSwitch` antes de navegar, preservando salvamento dos editores registrados. Falha mantém rota/contexto e mostra mensagem. Seletor usa navegação do Next; não troca workspace/tenant nem altera cookie de autorização. Nenhuma rota ou API renomeada. Rota ativa abre o grupo correspondente, sem passar pela tela inicial de outro contexto.

## Nomenclatura e alcance

| Anterior | Atual |
| --- | --- |
| Convites / Convites permanentes | Links permanentes |
| Novo link permanente / Novo convite | Criar link permanente |
| Título do convite | Nome do link |
| Destino do convite | Link de destino |
| Distribuidor de convites / Distribuir convites | Distribuir acessos |
| Um link para vários convites | Um link, vários destinos |
| Escolher convites / Incluir convite | Escolher destinos / Incluir destino |

Alcance: formulário, listagem/cards, detalhe, confirmação, histórico, distribuição/etapas, criação de destinos, metadados, recuperação pública, QR/arquivo exportado, links usados na página/campanhas/exportação, atalhos, permissões exibidas, erros da API e avisos de revisão/decisão da Evolution. Equipe continua com convites de colaboração, identificados pelo contexto e pelos títulos **Convites para equipe**. Não fazer substituição global em URLs, tokens, nomes de tabelas, enums, políticas ou conteúdo fornecido por usuários.

O termo interno `invitations` da permissão dos links permanentes e os caminhos `/painel/convites`, `/me/redirects`, `/r/...` continuam iguais. Isso preserva links salvos, QR Codes, contratos de API e grants existentes. Regras de validação, aprovação/recusa/contestação, disponibilidade e distribuição não foram alteradas. Mensagens novas mostram LINK PERMANENTE; registros históricos e mensagens já enviadas não são reescritos. Não enviar mensagens reais para testar rótulos.

## Ícones e carregamento

Mapa central preservado. `permanentLink` usa página/endereço com elo e substitui o envelope no recurso; `invite` não é reutilizado para links permanentes. Novos `pageEditing`, `pagePromotion` e `navigationHelp` representam edição da página, divulgação e ajuda, com desenhos distintos. Contextos usam profile/catalogPublishing/clientRelations; destinos têm seu próprio símbolo. Repetição só para o mesmo significado, como salvar, copiar e expandir. Nomes, cor e espessura não são tratados como desenhos diferentes.

Skeleton deriva dos mesmos contextos/grupos e abre os itens da rota atual; mantém seletor, linhas e separação da conta. Antes de conferir acesso, não mostra links privados. A disposição real é validada em desktop/mobile; o skeleton não pressupõe permissões concedidas.

## Validação

Regressão frontend final: **153 aprovados em 43 arquivos** (navegação, ícones, editores, equipe, canais, links permanentes, distribuição, QR e diálogo). Backend: **vinte aprovados em seis arquivos**, incluindo mensagem renderizada de revisão/decisão e webhook fechado sem autenticação. Typecheck, lint e build frontend/backend aprovados com exit 0. Última repetição Playwright: **41 aprovados, zero falhas/skips/flaky**, incluindo setup. [Relatório](evidencias/sidebar-contextos-2026-10-21/playwright-final.json) e [resumo](evidencias/sidebar-contextos-2026-10-21/execution-summary.json). Build mantém avisos preexistentes de CSS start/end e configuração do plugin Next no ESLint; compilação concluída.

Playwright executa dados sintéticos em cópia isolada sem .env, com `E2E_RUN_ID=f12-sidebar-20261021` e offset 170: web 3170/API 3503/stub 4269, PostgreSQL 5603 e Redis 6550, containers próprios do harness. Banco pessoal e produção não alterados. Nenhuma mensagem real enviada à Evolution. Relatórios iniciais preservados em `evidencias/sidebar-contextos-2026-10-21`.

A primeira rodada também exercitou QR, canais F37 e moderação em desktop/mobile. Primeiro lote de 63: 52 aprovados, onze falhas (oito fixtures com título antigo, duas asserções de foco/modal e uma leitura prematura de título durante navegação). Segundo lote de 41: 37 aprovados e quatro falhas; identificou a necessidade de localizar a ação Criar dentro do diálogo correto e o cancel propagado da ajuda para a sidebar. Corrigidas as causas; não se aumentaram timeouts, tolerâncias ou máscaras. A repetição final aprovada inclui sidebar, criação/validação/contestação, distribuição, isolamento, falha de rede, idade, QR/encaminhamento e recuperação.

Inspeção real Chromium: seletor/troca, grupos, ajuda e retorno de foco, console sem erros/avisos na consulta executada e respostas do BFF. Capturas Playwright desktop/mobile examinadas; W10 percorre 1024/1440/1920/390/320. Axe e reflow/200% nas jornadas existentes, teclado, foco e logout exercitados. Isso não é certificação de todos os estados, teste de aparelho físico ou validação de produção.

## Correções encontradas na validação

O seletor de contexto navega; uma asserção genérica de Select exigia foco no controle que acabou de ser ocultado pelo fechamento do drawer. O teste agora verifica URL, fim do skeleton e título antes de examinar o destino. Não exige foco num elemento desmontado e não remove checagem de acessibilidade.

Fixtures de destino ainda exibiam Convite fixture após renomear as expectativas; o HTML sintético foi atualizado. Após unificar Criar link permanente, o teste da distribuição precisou buscar o botão dentro do diálogo correto, preservando o modo estrito em vez de escolher o primeiro botão.

O teste de ajuda detectou um defeito funcional: cancel de um diálogo aninhado alcançava o pai pelo evento React, fechando também a sidebar. OverlayDialog agora ignora cancel/Tab originados em outro diálogo e interrompe a propagação de cancel. Os 47 consumidores foram localizados; closeDisabled e a ação de fechar continuam respeitados. Testes unitários exercitam fronteira de cancel e fechamento bloqueado; Playwright exercita ajuda aninhada/Escape/retorno de foco em desktop/mobile. Não foi criado outro mecanismo de modal.

## Arquivos e reversão

`workspace-navigation.tsx` contém composição/contextos; `workspace.module.css` estilos locais; `workspace-pending.tsx` reutiliza skeleton de navegação. Ícones em action-icon/navigation-icons. Rótulos estão nos módulos redirects/redirect-pools/profile-channels/permanent-qr, composição da página e renderização dos avisos no backend. Testes de navegação, exclusividade de ícones e jornadas acompanham a mudança.

Reverter somente os trechos desta revisão, preservando as alterações simultâneas existentes. Não usar reset global nem reverter migrations do roadmap. Sem novos segredos, dependências, commit, push ou deploy.

## Como conferir localmente

1. Recarregar o painel na branch atual. Usar **Área do painel** para alternar Meus links, Minha página e Outras páginas. Entrar em cada seção e conferir item ativo, conta/equipe comuns e permissões.
2. Em Meus links, abrir **Links permanentes**, criar e alterar o destino, abrir **Distribuir acessos** e conferir os nomes nos diálogos/etapas. QR e endereço público permanecem estáveis.
3. No mobile, abrir Menu, alternar área, abrir Ajuda e pressionar Escape: deve voltar ao mesmo menu, com foco em Ajuda. Escape novamente fecha o menu e devolve foco ao botão Menu.
4. Avisos futuros usam Link permanente; API e worker precisam carregar o código atualizado. Não há configuração adicional ou mensagem real enviada como parte desta revisão.

Containers descartáveis do harness removidos ao encerrar. Sem migração/seed no banco pessoal, sem CI remoto ou teste em aparelho físico. Não foi feito commit/push/deploy.


## Refinamento posterior — páginas e contexto padrão

Meus links passa a ser a primeira opção e o padrão em rotas comuns da conta. Rotas diretas continuam abrindo o contexto correspondente. Clientes passou a Outras páginas, com a lista Páginas que gerencio e Acessos por página. Recursos da página reúne Busca e filtros, Formulário de contato e Descoberta, extraídos da aba Página. [Escopo, decisões e validação](refino-paginas-2026-10-21.md).
