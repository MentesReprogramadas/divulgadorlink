# F21 — Mídia kit: execução em andamento

Autorização de 19/10/2026: finalizar F21 e parar; sem commits, push ou deploy.

## S0 / D23

Reutilizar apresentação já aprovada de F09, renderer/prévia, identidade visual e marca pequena. O dono escolhe mostrar descrição/foto, contatos próprios confirmados e quais métricas publicar. Não introduzir editor público arbitrário que contorne moderação. Publicação congela a apresentação aprovada; alterações posteriores da página não reescrevem o kit automaticamente. Foto antiga não é retida. Página principal retirada/suspensa torna o kit indisponível.

Métricas medidas: impressões, cliques e CTR de links próprios atualmente publicados, período explícito de até 366 dias e fórmula/agregação F01 integralmente reutilizada. Atualização a cada leitura, no-store; rótulo com período, horário de consulta, cobertura/atraso do dia corrente. Sem cobertura completa, valor indisponível (null); falha nunca inventa zero. Números são eventos medidos sob o contrato de consentimento existente, não pessoas, membros ou vendas. Não publicar investimento/CPC, visitante, token, dado bruto ou comparação privada por serialização.

Métrica informada opcional: quantidade de seguidores, plataforma de lista fixa, data de referência, número inteiro não negativo. Rótulo permanente Informado pelo proprietário, sem selo verificado. Não são métricas de membros/vendas atribuídas a cliques.

Contato: seleção explícita de identificadores EMAIL/PHONE próprios e confirmados, nenhum selecionado por padrão. Apenas IDs na configuração; valor público é revalidado no banco a cada leitura. Remover/desconfirmar identificador retira imediatamente o contato. Remover seleção ou campo no rascunho também reduz a projeção atual imediatamente (interseção com publicado); adicionar requer publicar. Assim retirada de informação pessoal não depende de uma segunda publicação. Links de contato sem rastreamento novo.

Alternativas descartadas: copiar números estáticos sem proveniência; inventar segunda fórmula; publicar contato da conta automaticamente; texto/contato de terceiros sem moderação; ampliar permissão de colaborador por consequência. Nesta entrega a gestão é owner-only, inclusive para ADMIN que não é dono. Kit não cria preço/limite comercial novo.

Modelo aditivo MediaKitConfig composto com perfil/tenant/dono; CAS, publicação idempotente e retirada explícita. Rascunho sem publicação não vaza; DTO público allowlist e cache no-store. Rollback conserva tabela/configurações e retira endpoint público antes de voltar ao código anterior; sem downgrade destrutivo. QA/AC ainda pendentes.


## Implementação e reconciliação da spec

Contratos reais agrupados no módulo de perfil existente: GET/PATCH /me/profile/media-kit, POST /publish e /unpublish, GET /preview; público GET /profiles/:slug/media-kit. UI /painel/perfil/midia-kit, /previa; público /p/:slug/midia-kit. Reutilizados controller/no-store/CSRF, owner guard, renderer ProfileView, ProfilePreviewShell, FormSteps, OverlayDialog, Field/Input/Select, Pagination, erros/vazio/ícones/tokens e agregação F01. Componentes novos apenas para configuração/projeção do kit; nenhuma fórmula de CTR duplicada e nenhuma biblioteca instalada.

MediaKitConfig aditiva em 20261019110000_media_kits e índice composto corretivo 20261019111000_media_kit_identity. A segunda migration conserva checksum já aplicado da primeira; não reescreve história. FK composta para perfil/tenant/dono, CAS e CHECK de consistência da publicação. Nenhum kit criado para usuários antigos. Configuração até exclusão do perfil/conta; dados medidos usam retenção F01 existente e não ficam copiados no kit; contatos só por referência viva. Dados informados ficam até alteração/retirada/exclusão pelo dono, com data e rótulo explícitos.

Kit usa nome/descrição/estilo de publicação já aprovada, sem novo texto público arbitrário. Publicação independente congela apresentação aprovada; a UI detecta nova versão da página e permite atualizar o kit explicitamente. Foto anterior não retida; remoção/correção/retirada segue as restrições atuais da fonte. Seleção de métricas exige link do dono publicado, mesmo quando o dono é ADMIN. Fontes adultas por rede OU nicho mantêm gate 18+. Suspensão/retirada da página impede acesso público ao kit.

AC01/T01: MEASURED e INFORMED em DTO/DOM distintos, informado sem selo verificado; U/PG/C/E. AC02/T02: fonte, período, atualização em Brasília e cobertura explícitos; PG/E. AC03/T03: rótulos Cliques/Impressões/Taxa de cliques e limitação de membros/pessoas/vendas, sem publicar CPC/investimento ou linhas de visitantes; PG/E. AC04/T04: consentimento de contato off por padrão, seleção do dono, remoção imediata sem cache, rascunho não vaza, IDOR/tenants/colaboradores negados; U/PG/C/E.

Três unitários de domínio, três C (incluindo regressão do botão que submetia a etapa ao adicionar métrica), nove PG próprios e três jornadas Playwright em desktop/mobile. RED real de domínio e componentes em red-domain.log / red-components.log / red-editor.log. A primeira rodada PG identificou appearance opcional incompleta na cópia: corrigido preservando ausência quando não havia configuração. Sem relaxar parser ou fabricar aprovação. Primeira rodada E interrompida após identificar submit incidental; somente processos/containers próprios identificados foram encerrados. Repetições posteriores verdes.

Medida sem cobertura completa é null/Indisponível; um zero só aparece com cobertura completa. Falha de relatório retorna 503 recuperável, sem zero fabricado. Remover campo/métrica/contato no draft reduz imediatamente a projeção pela interseção com publicado; acrescentar ou atualizar exige publicar. Exclusão/desconfirmação de identificador retira o contato na próxima leitura no-store. Ao publicar novamente o mesmo conteúdo/fonte, não duplica auditoria.

QA visual encontrou formulário de métricas alto no mobile. Gap/margens ajustados localmente; E2E afirma scrollHeight <= clientHeight na etapa medida em 390×844. Métrica única ocupa largura disponível; cards públicos respeitam cores herdadas com contraste calculado no renderer existente. Skeleton de refresh conserva dimensões exatas dos cards reais; prévia/público compartilham renderer e marca.

Rollback: retirar acesso público/rotas do kit antes de rollback do app, preservar configuração e dados, sem DROP/limpeza de números para obter compatibilidade. Nenhum novo rastreamento, promessa de audiência, preço ou alteração de cobrança/moderação. S7 não autoriza deploy por consequência deste plano.


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
