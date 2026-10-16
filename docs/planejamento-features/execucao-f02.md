# F02 — lembrete de renovação

## Escopo e D03 — 16/10/2026

Continuação autorizada pelo usuário: implementar somente a próxima feature e parar. Branch `codex/roadmap-features`, baseline `a1afd4c`. Preservar artefatos locais existentes; não publicar na main nem implantar.

D03 concretizada antes do agendamento: antecedência fixa de três dias, um lembrete por promoção/vencimento/canal. E-mail opcional **desligado por padrão**, ativação explícita pelo proprietário. Aviso no painel independe do opt-in. Não há configuração de cadência adicional: a frequência é uma vez por vencimento. Janela inclui o limite de 72h e exclui o instante de expiração. Promoções administrativas, pausadas, canceladas, expiradas, contas suspensas, links indisponíveis e destinatários sem e-mail confirmado não recebem lembrete. Nova data após renovação/retomada é nova janela; intenção anterior se torna obsoleta.

Monitor de lembretes desligado por padrão para rollout. Nenhum envio real, preço, desconto, débito automático, provedor novo ou promessa de resultados. A opção de e-mail serve a este lembrete; não concede consentimento para analytics/marketing.

## Reuso e divergências encontradas

Reutilizar mailer, renderer de e-mail, fila/worker BullMQ, F01 para resumo de resultados, autorização atual e componentes/tokens do painel. Persistir intenção única e tentativas limitadas; revalidar estado antes do efeito. E-mail tem entrega pelo menos uma vez; intenção única e idempotência do provedor não equivalem a garantia de entrega exatamente uma vez.

O endpoint de renovação já existe (`POST /promotions/renew`), mas a página de destaque só chama checkout de compra nova. A entrega deve conectar um modo explícito de renovação à mesma página/controles e preços, preservando o checkout normal. Abrir o CTA não cria pedido; somente confirmar o pagamento no fluxo atual cria a tentativa. Não criar outro checkout.

## Jornada e direção visual

Aviso no painel com link para área de lembretes. Página privada com preferência de e-mail, vencimento em São Paulo, superfície, resumo observado dos últimos 30 dias pela F01 e ação de renovar. Reutilizar hierarquia e estados de F01/F07, controles locais e CSS Modules. Sem nova biblioteca ou identidade. Validar desktop/mobile, teclado, foco, erro offline e reflow de 320px antes do aceite.

## Persistência e consistência

Migração aditiva `20261016120000_renewal_reminders`: duas colunas em users, tabela de intenções, FK composta de tenant/promoção, chave por janela e índices de trabalho vencido. O journal não cria pedido nem modifica prazo/preço da promoção. Intenções iniciais usam NOT EXISTS para evitar selecionar para sempre as primeiras janelas já processadas. Lotes de 100 intenções e 25 entregas por ciclo, com consumidor BullMQ separado de pagamento/moderação e drenagem a cada 30 segundos.

A preferência tem compare-and-set e auditoria transacional usando o repository existente; no-op não gera auditoria adicional. Não registrar endereço ou resumo em logs. Leitura retorna allowlist, cache privado/no-store, e confirma conta atual; tenant, usuário e autorização vêm da sessão verificada. A consulta é limitada a 50 vencimentos ativos, ordenados por data/id. Promoções administrativas e HOME inelegível não aparecem. Conta suspensa e e-mail não confirmado não recebem envio.

O envio revalida opt-in, dono, tenant, publicação, status, vencimento, elegibilidade e e-mail confirmado. Payload é persistido antes da rede. Há uma transação curta de entrega que mantém locks usuário→link→intenção e do identificador confirmado durante o envio HTTP limitado a cinco segundos. Isso serializa o envio com alterações de preferência, suspensão e operações pagas que bloqueiam o link; uma ação que chega durante a entrega pode aguardar. Transações de entrega têm limite de 15 segundos; preferência, 10 segundos. Essa escolha privilegia a revalidação no momento do efeito, sem prometer desfazer e-mail já entregue.

Retentativas: até cinco, com backoff de 1/2/4/8 minutos. Corpo e chave permanecem iguais após falha ambígua. O endereço é revalidado antes de cada tentativa; alteração de destinatário descarta a intenção antiga. A janela de retry termina 23h após o primeiro payload, abaixo das [24h de idempotência do Resend](https://resend.com/changelog/idempotency-keys). Não repetir depois de perder essa proteção. Crash após aceite remoto e antes do commit não significa entrega exatamente uma vez universal; o provedor recebe a mesma chave/corpo. Provedor ausente não vira SENT.

Payload com destinatário é apagado em SENT/SKIPPED/FAILED; metadados terminais duram 30 dias após vencimento. Desligar o flag conserva intenções; enquanto o worker estiver desligado, a limpeza fica pendente. Não há nova coleta de marketing ou envio antes de opt-in.

## Testes em vermelho e correções

Os primeiros testes U/C falharam pela ausência dos módulos, evidenciando a lacuna inicial. Quatro U e quatro C passaram após implementação. Um caso PG adicional provou que remoção do proprietário deixava a intenção pendente consumindo o lote; passou após marcar SKIPPED e apagar payload. Outro teste orquestrou suspensão concorrente: a ordem link→usuário gerou deadlock PostgreSQL 40P01. A ordem foi alinhada a usuário→link e o teste passou. Logs vermelhos permanecem distintos dos resultados verdes.

Um comando de migração contra o clone de prova encontrou P3005 porque a prova anterior não continha histórico Prisma. Nenhum reset/baseline destrutivo foi feito: o SQL aditivo exato foi aplicado ao clone, preservando o hash das promoções existentes e comprovando opt-out/version=0 no usuário antigo. O deploy Prisma passou nos bancos do harness com histórico. Query plan em dez mil promoções expiradas e uma ativa escolheu naturalmente promotions_renewal_due_idx; prova registra a consulta de seleção por vencimento, não benchmark de produção.

## Interface e validação visual

Direção dominante: painel, controles, tipografia, estados e tokens existentes de F01/F07. A [referência GOV.UK de checkbox](https://design-system.service.gov.uk/components/checkboxes/) foi lida e inspecionada visualmente no Chrome: opção única desligada por padrão, rótulo à direita, dica associada e confirmação explícita. A identidade visual do GOV.UK não foi importada. Refero não disponível nesta sessão; nenhuma assinatura ou biblioteca nova utilizada.

Chrome DevTools inspecionou DOM real autenticado em 1280×720: noindex/nofollow, formulário limitado a 680px, foco por Shift+Tab/Tab com outline azul de 3px e texto secundário rgb(92,107,127) sobre branco (contraste 5,43:1). Nova sessão confirmou a página da feature em 390×844, alvo do checkbox de 44px e scrollWidth=390. Em 320px com texto 200%, scrollWidth=320 e título íntegro. A primeira captura de página completa pelo MCP ficou pendente e foi interrompida; capturas do Playwright foram abertas e inspecionadas, sem declarar arquivo manual inexistente. Não equivale a aparelho físico, leitor de tela ou zoom nativo do browser.

E2E usa API, BFF, PostgreSQL, Redis e worker reais; apenas o provedor de e-mail é um HTTP stub local, com idempotência observável. Sem interceptar API interna. Datas do fixture usam meio-dia UTC do dia da execução + dois dias, evitando vencimento em testes futuros; as capturas ficam vinculadas à data da execução. Essa evidência é inspeção visual, sem alegar comparação pixel a pixel entre dias diferentes. Offline é feito no contexto real do navegador e a escolha é mantida. O modo de renovação reusa a tela, catálogo, preços, Pix/cartão e tracking sob consentimento do checkout existente.

## Observabilidade e indicadores da fonte

Eventos operacionais renewal.reminder.cycle, renewal.reminder.failed e renewal.reminder.drain.failed carregam contagens/IDs e códigos, sem e-mail ou corpo. Observar falhas terminais, intenções vencidas e conflitos de preferência. Auditoria notification.renewal_preference_changed permite contar opt-outs após ativação; não usar a fração de preferências atuais como frequência de desativação. Renovações após aviso podem ser apuradas por tenant ligando SENT → promotion_investments.promotionId → orders PAID/renewal/paidAt posterior ao sentAt. Isso mede sequência observada, sem afirmar efeito causal ou conversão melhorada; nenhum dashboard ou evento publicitário adicional foi criado.

## Rollout e reversão

RENEWAL_REMINDERS_ENABLED=0 por padrão. Aplicar schema, implantar build compatível, validar preferências/leitura sem entrega e então habilitar worker de forma controlada após liberação futura. E-mail continua dependente de opt-in mesmo com flag ligado. Não houve main, Coolify, deploy, envio real ou cobrança real.

Reversão operacional testada: flag desligado impede agendamento/entrega e conserva preferências, leitura e dados. Schema é aditivo; versão antiga ignora a tabela e as colunas. Se reverter a UI, retirar também o CTA ?renew para evitar que uma versão antiga da página interprete como compra nova. Não remover tabela/colunas, resetar banco ou alterar pedidos para desfazer o recurso. A pausa PAUSED da F07 continua exigindo build compatível com F07.

## Resultados e aceite

Resultados locais aprovados: 395 testes backend (96 arquivos), 173 frontend (49 arquivos), 110 PG/Redis (11 arquivos; 18 F02), e 72 Playwright na regressão completa. O ajuste final de auditoria passou nos 18 testes F02 PG, além de lint/typecheck/build; CI do commit aprovado, conforme registro abaixo. Lint/typecheck/build dos pacotes afetados executados; build frontend também integra o harness. Zero skips ou retries na regressão Playwright.

Mapa de ACs: AC01/T01 — unicidade, concorrência, reentrega e payload estável; AC02/T02 — cancelamento e renovação paga real; AC03/T03 — revalidação, opt-out, suspensão, destinatário, remoção do dono e pausa F07; AC04/T04 — preferência persistida, CAS, confirmação, body estrito e auditoria; AC05/T05 — leitura/envio não criam pedido e E01 só cria renewal=true após pagar. I02/E02 cobrem sessão, outro dono, tenant e ausência de dados privados; E03 cobre offline, teclado, reload, mobile e reflow.

Comandos: backend npm run lint, npm run typecheck, npm test, npm run build; npm run test:pg com PG_SPECS=1 e URLs para o PG local descartável/Redis. Frontend npm run lint, npm run typecheck, npm test, npm run test:e2e. E2E_PORT_OFFSET=100 e E2E_RUN_ID=roadmap mantêm portas comuns livres. Logs, JSON e capturas em evidencias/F02/2026-10-16. Traces/cookies e artefatos locais anteriores não entram no commit.

Encerrar após F02 e sua documentação, conforme solicitado. A próxima feature não será iniciada.

## Aceite final na branch

Commit `c712f827427837d50ea0820fb170ccbd66de954f` em `codex/roadmap-features`. [CI 38909863096](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38909863096) aprovado nos quatro jobs: verify (395 testes backend e 110 PG), web (173 testes frontend), e2e (72 testes, sem skips) e images (builds das imagens). Evidências do CI e contagens na pasta desta execução. A atualização posterior é documental e não altera o código validado.

S0–S7 e AC01–AC05 concluídos na branch. Deploy, envs de produção, envio real e cobrança real fora deste aceite. A feature fica com RENEWAL_REMINDERS_ENABLED=0 por padrão. Parada após F02 conforme pedido; próxima feature não iniciada.

A implementação está em 9adafe0 (primeiro CI 38909329609 aprovado). O commit c712f82 ajustou somente fixtures PG: agora o vencimento acompanha o meio-dia UTC do dia da execução, evitando que o teste HTTP deixe de encontrar a campanha depois de uma data fixa. Os 18 casos PG passaram localmente e a regressão completa foi repetida pelo CI 38909863096.
