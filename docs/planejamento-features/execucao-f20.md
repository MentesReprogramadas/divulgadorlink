# F20 — execução em andamento

Autorização de 19/10/2026: implementar a sequência até F21, sem commit/push/deploy.

D22: OWNER implícito; EDITOR mantém rascunho, apresentação, grupos e publicação da página autorizada (mesma validação/moderação F09/F37); VIEWER lê e vê prévia. Conta, cobrança, exportação, histórico/restauração, campanhas e equipe permanecem exclusivos do dono nesta entrega. Alternativas de editor administrar finanças ou compartilhar toda a conta foram descartadas: acesso é por recurso, sem ampliar authorize global. Transferência de dono não faz parte do escopo inicial.

Convites de sete dias, por link compartilhado pelo proprietário, sem enviar e-mail real automaticamente; aceite explícito apenas por conta ativa com e-mail confirmado correspondente no mesmo tenant. Token aleatório de 256 bits, apenas SHA-256 persistido, retornado uma vez na criação, ausente das listagens/auditoria. Repetição segura por requestKey devolve convite existente sem recuperar token; proprietário revoga e cria novo se perder o link. Sem login alternativo. Revogação consultada no banco em cada operação; bloqueios transacionais serializam salvamento/revogação. Endereço de e-mail normalizado é HMAC por finalidade, sem persistir contato bruto; mudanças posteriores de e-mail não transferem convite a uma conta já aceita.

Política server-side central com allowlist de operações; seletor de perfil não concede acesso. UI reutiliza editor, renderer, componentes e BFF. Novas tabelas aditivas sem backfill. Rollback: interromper colaboração, preservar tabelas/auditoria, versão anterior continua owner-only e ignora vínculos. Revogar não apaga conteúdo nem reverte mudanças feitas legitimamente; trilha identifica ator e recurso sem gravar tokens ou contato.

Checkpoint histórico S0: testes e implementação ainda não tinham aprovação; fechamento vigente abaixo.


Revisão adversarial T04: convite antigo não usado não pode desfazer revogação. RED real em red-revocation.log reproduziu aceite 200 indevido; correção cancela atomicamente convites pendentes da mesma pessoa, correlacionando IDs de convites aceitos na auditoria e contatos atuais via HMAC. Nenhum hash/contato bruto é incluído na auditoria; apenas invitationId. Um convite criado pelo dono depois da revogação é nova autorização explícita e pode reativar o vínculo. Este caso exige repetição de PG/E2E; não foi chamado de aprovado no checkpoint anterior.

Revisão de contexto assíncrono: o selector deve ficar vinculado à instância do editor, não ser inferido do pathname depois de um await/na desmontagem. O autosave de saída agora conserva o resourceId original; a API de perfil tem escopo próprio por padrão e só recebe selector explícito. O editor/canais/prévia capturam o alvo antes de operações assíncronas e as rotas usam key por ID. IDs malformados chegam à validação do servidor, sem abrir silenciosamente a página própria. Testes de autosave e transporte verificam a troca de localização durante escrita. Regressão afetada repetida após esta correção.


D22 detalhada: editor mantém links URL/catálogo e vínculos F37 na página; criação/alteração do recurso F12 continua do proprietário. O seletor compartilhado mostra convites aprovados do dono, sem criar convites na conta do colaborador. Leitor não navega candidatos; editor não consulta nem vincula convite pendente alheio à página. Rascunhos de convites já vinculados são conteúdo autorizado da própria página. Controle aplicado ao repository e UI; testes PG/C/E verificam o limite e a edição real de link pelo colaborador.

Retenção: vínculos e metadados de convite pertencem ao recurso até a exclusão do perfil/conta pelas FKs; usados, expirados ou revogados nunca autorizam. Não persistir e-mail bruto nem token nos registros; auditoria segue a retenção existente da plataforma, sem ampliar sua carga com contatos/snapshots.


## Entrega e rastreabilidade

Rotas reais: GET /me/profile/team consolida equipe própria/convites/páginas compartilhadas; POST /me/profile/invitations; DELETE /me/profile/invitations/:id; DELETE /me/profile/members/:id; POST /invitations/accept. O GET individual proposto foi substituído pela listagem owner-only, sem endpoint redundante. Reuso do login, CSRF/BFF, tenant host, policy por ação e repository de perfil; authorize/ADMIN globais não ampliados. x-profile-id é selector não confiável, sempre resolvido/autorizado no banco. Nova migration 20261019100000_profile_team é aditiva, FK composta, unicidade de vínculo, role/status CHECKs e CAS para revogação.

Matriz: dono administra equipe/conta/cobrança/exportação/histórico/campanhas/kit e contestações; editor lê/edita/publica a página e seus vínculos permitidos pelo fluxo F09/F37; leitor lê rascunho/prévia, sem formulário ou publicação. E-mail confirmado do convidado para aceitar/publicar, conta do dono e colaborador ativas. Conta própria do colaborador continua própria; nenhuma operação transfere titularidade ou preço. Convite expira em sete dias, aceite explícito, token 256 bits SHA-256 no banco, e-mail HMAC por finalidade, token retornado uma vez e nunca listado. RequestKey repetido não recria grant/token; revogar é idempotente e consulta o estado atual.

AC01/T01: política em cada rota/repository, editor não recebe OWNER, leitor não escreve nem navega fontes privadas; C/PG/E. AC02/T02: expiração/usado/revogado/e-mail confirmado em U/PG. AC03/T03: auditoria com ator real, perfil, convite/membership e versão, sem token/contato; PG. AC04/T04: sessão aberta não salva após revogação; convites pendentes anteriores também cancelados, novo convite é nova autorização; PG/E. AC05/T05: tenant, outro dono/ADMIN, recurso arbitrário, fonte pendente não vinculada e contexto assíncrono protegidos; PG/C/E.

Cinco unitários de política, componentes da equipe, fonte e autosave; onze PG próprios (incluindo concorrência, rollback, scopes de fonte e convites antigos); três jornadas Playwright em dois viewports. Os primeiros U/C não tiveram RED comportamental registrado antes da implementação; isso é uma divergência do protocolo S1, não uma prova inventada. RED real adicional T04 reproduziu a reautorização por convite antigo e passou após a correção. A primeira execução C com alias errado não conta como RED. Gates locais de comportamento/regressão foram concluídos; histórico de comandos preservado.

UI: /painel/equipe, /equipe/convite, /painel/equipe/:id/editar e /previa. Lista primeiro, convite em modal, papel explícito, confirmação de revogação, seletor/filtros/empty/dialog/skeleton locais. Editor e prévia existentes reutilizados, com carregamento colaborativo e inventário de ferramentas limitado. Aba já aberta conserva texto local após perda de permissão para não descartar entrada; servidor recusa novas operações e recarregar mostra acesso negado. Mudança de localização não muda o alvo de autosave ou operação pendente.

Rollout/reversão: publicar backend/BFF compatíveis em todos os nós antes de disponibilizar UI de colaboração. Em reversão, interromper rotas/tráfego compartilhados antes de voltar ao backend anterior, que não conhece o selector. Preservar tabelas e auditoria; código anterior continua owner-only e não interpreta memberships. Dados antigos legíveis. Não tratar ensaio SQL/compatibilidade aditiva como deploy misto validado; S7 operacional permanece aberto.


## Fechamento local — 19/10/2026

S0–S6 validadas localmente; S7 permanece EM REVISÃO para CI/liberação remotas. Sem novos commits, branches, push ou deploy. Checkout C:/VSCODE/divulgadorlinks, branch codex/roadmap-f37-testes. Nenhuma execução de F22 iniciada.

Verificação final do lote: backend 570 testes completos; frontend 373 completos. Lint, typecheck e build dos dois pacotes aprovados (Next de produção em cópia isolada). PostgreSQL real: 91 testes em oito arquivos F09/F19/F31/F37/F01/F15/F20/F21. Playwright: regressão ampla 81/81; repetição após vincular contexto ao editor 55/55; última rodada após restringir fontes e invalidar convites antigos 27/27 (F20/F21/F37, desktop e mobile). Não somar essas rodadas como casos distintos. APIs, BFF, PostgreSQL/Redis e adapters externos locais reais no harness; sem falsificar persistência de API interna.

Banco pessoal localhost:5437/divulgador atualizado para 53 migrations, preservando exatamente 17 usuários, 1 página, 640 links e 0 fatos F31. Novas memberships/convites/kits: zero. Nenhuma publicação ou adesão automática. Prova local-upgrade-proof.json. Ensaio em f05_upgrade preserva usuário, página e evento anteriores, com zero grants/kits; EXPLAIN usa os índices de membership e PK de kit. Índices Prisma novos reconciliados com seus nomes SQL. Diff de schema apenas lido: sugestões sobre FKs/índice vetorial/defaults anteriores não foram aplicadas. Não fazer push de schema/downgrade destrutivo.

A geração Prisma normal encontrou DLL em uso por processo de desenvolvimento do usuário. Sem encerrar esse processo: geração isolada com a mesma versão, SHA-256 da engine idêntico conferido e atualização somente dos arquivos gerados ignorados, preservando a DLL carregada. Nenhuma dependência ou lockfile de pacote alterado. Builds/E2E isolados para preservar o ambiente de desenvolvimento; baselines 5433/6380 intactos. Containers temporários próprios removidos ao encerrar o lote.

Inspeção nativa das capturas em desktop/mobile, teclado/foco, erros, modais, vazio, preview sticky, marca pequena, zoom/320px, contraste e estados aplicáveis. Axe A/AA sem violações nas superfícies exercitadas, sem alegar acessibilidade total. Emulação Chromium não é iPhone/Safari físico. Capturas e hashes/contagens em evidencias-f20.json / evidencias-f21.json; logs completos locais em output/roadmap-f21. CI Node22 remota e produção não executadas.


## Refinamento solicitado após F21 — 19/10/2026

Implementação e decisões: [refinamento F05/F15/F20/F21/F38](refinamento-f05-f15-f20-f21-f38.md). Inclui importação JSON confirmada para rascunho, resumos com frequência no modal e desligamento direto, sidebar por contexto, prévia de campanha preservando o formulário, equipe global com leitura/escrita por recurso e apresentação para parceiros com métricas objetivas.

Não inicia uma nova feature da sequência: mantém 26/42 implementações e F22 não iniciada. Gates locais e evidências da ampliação estão no registro vinculado; S7/CI/liberação remotas continuam EM REVISÃO. Sem nova branch, commit, push ou deploy; alterações existentes preservadas.

Resultado da ampliação: lint/typecheck/build dos dois pacotes aprovados; 382 testes frontend, 575 backend, 46 PostgreSQL e 37 Playwright finais aprovados. Capturas/hash, falhas corrigidas, alternativas e roteiro manual no refinamento vinculado. Não somar rodadas. S7 remoto permanece em revisão.
