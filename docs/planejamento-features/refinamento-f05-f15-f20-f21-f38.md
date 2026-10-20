# Refinamento F05 / F15 / F20 / F21 / F38 — 19/10/2026

Pedido: importar o arquivo exportado; resumos com ativação simples; separar Minha página em destinos; prévia da fonte da campanha sem perder formulário; equipe global e permissões granulares; apresentação para parceiros com dados objetivos.

## Decisões e alternativas

| Decisão | Implementação | Alternativa considerada |
| --- | --- | --- |
| Importação F38 | JSON v1 exportado pela plataforma; conferência e confirmação; substitui somente o rascunho, preservando o endereço atual e a publicação. IDs regenerados; sem foto, privilégios, tokens ou vínculos internos de convites. | Importar objetos de banco ou publicar automaticamente: rejeitado por isolamento/moderação. Mesclar sem revisão: rejeitado por duplicar grupos/links silenciosamente. |
| E-mail F05 | Receber novidades vem marcado ao abrir a ativação; só persiste após confirmar frequência. Cartão com estado textual, cor e ícone; desativar é imediato, com resposta confirmada da API. | Ativar silenciosamente todas as contas existentes: rejeitado pela regra vigente de consentimento explícito. Flag operacional de envio continua desligada por padrão. |
| Navegação | Removido o agrupamento Publicação. Links e Convites têm seus contextos. Minha página tem submenus de visão geral, dados, grupos/links, aparência, modelos, importação, exportação, histórico, checklist, métricas, campanhas e apresentação. | Manter dezenas de atalhos na visão geral e na barra de ferramentas: rejeitado pela densidade. URLs antigas e query secao continuam compatíveis. |
| Campanhas F15 | Prévia da publicação selecionada dentro do mesmo diálogo, com retorno; formulário permanece montado, incluindo nome, endereço, seleção e etapa. Reutiliza ProfileView, sem criar publicação para visualizar. | Navegar para fora e reconstruir formulário: rejeitado por risco de perda de estado. |
| Equipe F20 | Espaço compartilhado da conta, independente da existência de página; matriz por recurso e seção; leitura e escrita, seleção global e por seção. | Dar ADMIN global ou ampliar authorize para qualquer recurso: rejeitado. Modelos antigos de compartilhamento de página continuam limitados; sem promoção automática de permissões. |
| Administração | Somente um proprietário ADMIN pode conceder seções administrativas. A identidade administrativa existe apenas na requisição ao recurso autorizado e dentro do tenant; o cargo persistido do colaborador não muda. Retirar ADMIN do proprietário bloqueia delegação administrativa. | Fazer toda a equipe virar ADMIN, ou confiar em cookie de cargo: rejeitado. |
| Troca de espaço | Contexto confirmado pelo servidor, cookie HttpOnly e autorização nova por requisição. Header explícito é só seletor, nunca credencial; permissão e tenant sempre são conferidos. Requisições e retries mantêm o contexto de origem; troca aguarda o salvamento da página. | Usar o cookie novo para um salvamento antigo: rejeitado por risco de alterar a conta errada. |
| Nome F21 | Apresentação para parceiros. Cartões de publicação/contatos, resultados reais com período e fonte, gráfico comparativo de seguidores informados. | Somar seguidores de redes como pessoas únicas ou misturar cliques com seguidores: rejeitado. Não há série temporal inventada. |

## Permissões globais

Registro executável: backend/src/domain/access/workspace-permissions.ts. Novas rotas privadas sem classificação são negadas no contexto compartilhado. Um direito de escrita exige leitura no schema e na UI; a leitura fica marcada e bloqueada enquanto escrita estiver ligada.

Recursos: links, página, campanhas, apresentação, convites permanentes, histórico, importação/exportação, métricas, favoritos/coleções, categorias/resumos, lembretes e pedidos/assinatura. Recursos administrativos: gestão/relatórios, moderação, denúncias, correções, destaques administrativos, assinaturas, estornos, integrações e configurações/categorias.

Acesso completo é uma seleção explícita dos recursos atuais; futuros recursos não são concedidos automaticamente. Proprietário comum não pode injetar grants administrativos pela API. Identificadores, senha, suporte por impersonação e concessão de acessos permanecem exclusivos do proprietário. Não há delegação transitiva, troca de tenant ou mudança do cargo global.

Convite: destinatário vinculado ao e-mail atualmente confirmado, token opaco de uso único, hash no banco, 7 dias, compartilhamento manual. E-mails substituídos não autorizam aceitação. Criação idempotente com requestKey; alterações de direitos/revogação usam versão concorrente e invalidam convites pendentes anteriores para a pessoa. Lista não revela token ou e-mail do destinatário.

Revogação e mudança de direitos são verificadas em cada nova chamada, inclusive em sessão já aberta. Requisição já autorizada/em andamento pode terminar; não se promete desfazer uma operação concluída. A UI atualiza direitos ao recuperar foco ou receber uma recusa. Cobrança mantém elegibilidade, idempotência e confirmação existentes; leitura não recebe URLs/client secrets de pagamento que concedam poder de alteração no provedor.

## Critérios adicionais e rastreabilidade

- F38: importar/exportar mantém Unicode e ordem; IDs e relações são reconstruídos; JSON inválido, versão desconhecida, privilégios injetados, destino inseguro, referência de catálogo de outra conta e versão concorrente são recusados sem publicação. Domínio profile-backup.spec.ts, PostgreSQL workspace-team.pg.spec.ts, jornada profile-export.spec.ts E04.
- F05: abrir ativação já marca recebimento mas não grava consentimento; confirmar salva a frequência; desligar não abre modal. niche-follows-screen.test.tsx e niche-follows.spec.ts E04.
- F15: abrir/fechar prévia não submete ou avança o formulário; dados e etapa persistem. campaign-editor-dialog.test.tsx e campaign-pages.spec.ts.
- F20: escrita sem leitura e grants desconhecidos falham; APIs independem de menu; destinatário/tenant/conta ativa, repetição, concorrência, revogação e papel administrativo são verificados. workspace-permissions.spec.ts, workspace-team.pg.spec.ts, permission-editor.test.tsx e workspace-team.spec.ts.
- F21: fonte medida distinta de seguidores informados; fonte, cobertura, período e data consultáveis; retirada imediata de contato preservada; nenhum resultado de visitante ou pagamento exposto. media-kit.spec.ts e regressões PostgreSQL anteriores.
- Navegação: submenus próprios e destaque do destino atual; skeleton da rota usa sua seção; visão geral sem grade de ferramentas. navigation-icons.test.tsx, site-navigation.test.tsx, profile-editor.test.tsx e profiles.spec.ts.

## Referências e reúso

[Notion: permissões](https://www.notion.com/help/sharing-and-permissions) fundamenta separar leitura, edição e gestão de acesso, com navegação contextual. Adaptação mantém identidade Tem Link Aqui e a matriz do produto, sem copiar o layout. Referências Carbon/Atlassian e tokens já registrados em docs/frontend-profissional/design-system.md continuam aplicáveis. Tentativa de abrir a página Carbon de dashboards nesta rodada falhou; não é evidência visual. Refero não disponível nesta sessão.

Reutilizados: Button/Field/Input/Select/OverlayDialog, filtros e ações de workspace, FormSteps, ProfileView/preview, saveProfile, versões concorrentes, publicação/moderação, billing e relatórios existentes. Sem novas bibliotecas. A matriz é nova porque o acesso antigo era limitado a uma página e dois papéis; não poderia cobrir as demais funcionalidades sem conceder privilégios por consequência.

## Validação e liberação

Verificação local: lint e typecheck dos dois pacotes aprovados; frontend 382 testes em 118 arquivos e backend 575 em 135 arquivos. Build backend aprovado e build Next de produção executado no harness E2E isolado, sem substituir .next do desenvolvimento. Logs: output/workspace-refinement-{frontend,backend}-{lint,types,unit}-final.log e output/workspace-refinement-backend-build-final.log.

PostgreSQL real: 46/46 em cinco arquivos (workspace-team, profile-team, profile-export, campaign-pages e media-kit), incluindo revogação, tenant, concorrência e importação; log output/workspace-refinement-pg-delivery.log.

Playwright final: 37/37 em desktop/mobile (loading-layout, niche-follows, profile-export e workspace-team), log output/workspace-refinement-e2e-final-verified.log. Campanhas e apresentação também passaram na rodada closure, nos dois viewports. Rodada ampla anterior: 87/89, com duas falhas da entrada administrativa de colaborador USER corrigidas no middleware e revalidadas na rodada final. Rodada closure: 30/35; quatro falhas eram asserções antigas do teste de carregamento após separar as páginas; uma era falta de aguardar o retorno ao espaço próprio antes de consultar a API. Corrigidas e repetidas com sucesso. Uma tentativa intermediária foi interrompida durante o teste antigo; outra durante o build. Não contabilizar tentativas ou somar rodadas como casos distintos.

Inspeção das capturas encontrou um rótulo quebrado no controle de permissões em mobile; encurtado para Tudo no grupo atual e revalidado no navegador e no teste unitário do editor. Primitivas, regras comerciais, permissões e opt-in não foram substituídos por estado visual.

Capturas em [evidências do refinamento](../frontend-profissional/evidencias/refinamento-roadmap-2026-10-19/capturas.json), com SHA-256 e origem. Inspeção nativa em desktop/mobile; teclado, foco, 320px, rede lenta, erro/recuperação e análise Axe nos cenários aplicáveis. Emulação Chromium não comprova iPhone/Safari físico.

Migração local 20261019120000_workspace_team aplicada sem reset: 17 usuários, 1 página e 640 links preservados; 54 migrations, zero memberships e convites globais criados na conta pessoal. Sem ativação automática de consentimento ou publicação. Banco pessoal, servidores do usuário e baselines de teste preservados; ensaios usam bancos/portas isolados.

Nova superfície /admin/destaques reutiliza o editor de destaque administrativo e consulta somente links públicos por endereço. Não exige conceder Gestão para administrar destaques. Primitiva InteractionPolicy separa consultas/filtros/download de comandos de escrita; a decisão da API permanece independente.

Sem branch nova, commit, push ou deploy. Sem envio externo de WhatsApp/e-mail ou cobrança real. F22 e demais features do roadmap não foram iniciadas.

Reversão: retirar a seleção do espaço compartilhado e as novas rotas antes de reverter a aplicação; preservar tabelas/admissões/auditoria, sem DROP. Importação altera rascunho após confirmação: usar publicação/histórico ou JSON exportado para recuperar conteúdo anterior; não apagar dados como mecanismo de rollback. Tabelas novas não concedem acesso a colaboradores antigos.

## Como conferir na interface

1. Minha página → Importar e exportar: exporte o rascunho, escolha Importar JSON e confira o resumo antes de confirmar. O endereço atual e a página publicada ficam preservados; só o rascunho é substituído.
2. Categorias seguidas: Ativar resumos abre frequência e recebimento já marcado; confirmar salva. Desativar resumos atua direto, sem modal. A rotina de envio ainda depende da flag operacional existente.
3. Minha página: navegue entre Dados da página, Grupos e links e Aparência pela sidebar. Alterações válidas aguardam salvamento antes da troca; erro de salvamento mantém a edição e informa a falha.
4. Campanhas → Criar campanha: selecione uma publicação, digite o nome e abra Prévia ao lado da seleção. Voltar à configuração preserva os campos e a etapa.
5. Equipe → Convidar colaborador: selecione a seção e os recursos; marque Escrever para observar Ler obrigatório. Acesso completo aplica-se à seção ou a todas as seções conforme o botão escolhido. Compartilhe manualmente o link com uma conta de e-mail confirmado. O colaborador abre o espaço compartilhado; menus e operações seguem somente os direitos concedidos. Revogar bloqueia chamadas novas mesmo com a sessão aberta.
6. Apresentação para parceiros: configure contatos e seguidores informados, confira resultados do período e publique somente quando desejar. Seguidores informados são identificados como não verificados; retirada de contato continua imediata.
