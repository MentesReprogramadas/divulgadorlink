# F42 Moderação e alertas no grupo pela Evolution API

**Estado:** IMPLEMENTADA E VALIDADA; P0 CONCLUÍDO. [Execução e decisões concretizadas](../execucao-f42.md).  
**Atualização:** 15 de outubro de 2026. **Ordem:** 1. **Onda:** P0, prioridade operacional anterior às ondas 1–6.  
**Pré-requisito:** G00 mínimo para esta feature; nenhuma dependência de F01–F41.  
**Plano:** [F42 implementação](../planos/f42-evolution-moderacao.md).  
**Fonte:** [feature aprovada para planejamento](../../features-propostas.md), seção Moderação e alertas operacionais no grupo pela Evolution API.

## Objetivo e resultado

Quando um link exigir decisão humana, o grupo operacional recebe um resumo com referência da revisão e opções para aprovar, recusar com motivo ou abrir o painel. O comando deve produzir o mesmo resultado de domínio que a decisão pelo painel, inclusive efeitos posteriores e auditoria.

A autorização posterior do usuário permite implementar e configurar somente P0/F42, incluindo Coolify e a instância indicada. O escopo termina em F42. Manter F01–F41 com seus IDs; F42 é primeira pela ordem de entrega, não pelo número. Os desenhos propostos abaixo são concretizados, quando houver diferença, nas decisões D44–D47 do registro de execução.

## Destino e configuração proposta

- Manager informado: [Evolution Manager](https://evolution.temlinkaqui.com/manager).
- API base candidata: `https://evolution.temlinkaqui.com`. A rota /manager é interface administrativa, não endpoint de envio.
- Grupo operacional: `120363430923498399@g.us`.
- Nome da instância, versão e tipo de conexão confirmados em D44: Fernando BOT, 2.3.7 e WHATSAPP-BAILEYS.
- As duas sequências recebidas como possíveis credenciais não são copiadas para arquivos, testes, exemplos, logs ou histórico Git.

Configuração proposta no servidor, validada por Zod: EVOLUTION_ENABLED, EVOLUTION_BASE_URL, EVOLUTION_INSTANCE_NAME, EVOLUTION_API_KEY, EVOLUTION_GROUP_JID, EVOLUTION_WEBHOOK_AUTH_SECRET e vínculo de operadores a usuários ADMIN. São nomes propostos, não variáveis já criadas. O grupo só pode ser alterado por operação administrativa auditada; não aceitar destino vindo de formulário público ou webhook.

Nenhum segredo ou valor real de credencial neste repositório. Confirmar suporte a autenticação do webhook antes de habilitar ações. Não assumir HMAC nativo da Evolution: escolher o mecanismo realmente suportado pela versão, como cabeçalho secreto verificável ou gateway autenticado confiável que valide a origem. JSON com groupJid/instance não autentica a chamada.

## Jornadas e formatos de ação

1. Submissão ou proposta é persistida pelo fluxo atual.
2. Ao entrar efetivamente na fila humana, gravar ocorrência de revisão e outbox; enfileirar/processar fora do request.
3. Worker lê evento, revalida revisão e envia resumo para a instância/grupo configurados.
4. Operador usa **Responder** no aviso específico e envia `APROVAR` ou `RECUSAR <motivo>`. O ID da mensagem citada identifica uma única revisão enviada pelo bot no tenant. Comandos antigos com referência assinada continuam compatíveis.
5. Webhook autenticado normaliza a mensagem admitida, valida contexto/remetente e persiste receipt durável antes de confirmar recebimento.
6. Worker/caso de uso processa ação válida com verificação atômica de estado, versão e consumo da referência.
7. Commit registra decisão e intenção de efeitos; resposta no grupo informa resultado real. Se não foi possível confirmar entrega da resposta, a decisão não é desfeita.
8. Admin pode continuar decidindo pelo painel se o canal estiver indisponível.

Proposta de texto da notificação, a validar sem dados reais:

> Revisão pendente — nova submissão  
> Referência: REF_EXEMPLO  
> Nome: Comunidade de estudo  
> Rede: Telegram · Nicho: Educação  
> Resumo: descrição limitada e tratada como texto  
> Revisar no painel: endereço interno construído pelo servidor  
> Responda a ESTA mensagem com APROVAR ou RECUSAR motivo.  
> Cada resposta vale somente para a revisão citada.

A referência de exemplo não é uma chave válida. A mensagem contém tipo da revisão e dados mínimos; não expor e-mail/telefone, tokens, prompts, provas sensíveis ou conteúdo integral desnecessário. Links e marcação enviados por usuários devem ser limitados/escapados; texto de usuário nunca se torna comando do bot.

Botões podem apresentar Aprovar, Recusar e Abrir painel se o ensaio da instalação comprovar suporte no grupo e dispositivo. Não especificar um formato de payload de botão como garantido. Parser normaliza somente variantes explicitamente testadas; texto explícito e painel são alternativas obrigatórias.

### Refinamento solicitado: várias revisões no grupo

- A nova mensagem recebida deve conter o comando explícito. O corpo da mensagem citada nunca fornece comandos ou referências para executar.
- `contextInfo.stanzaId` deve corresponder a exatamente um `providerMessageId` de aviso REVIEW_CASE/REVIEW_TEXT com entrega SENT no tenant configurado. IDs ausentes, desconhecidos, ambíguos ou de confirmação não selecionam revisão alguma. Nunca selecionar o aviso mais recente.
- O webhook autenticado conserva a autorização por número/ADMIN, gera internamente a referência assinada e reutiliza receipt, worker e transação existentes. Se houver referência explícita e citação, ambas precisam apontar para o mesmo aviso.
- Respostas fora de ordem não interferem nas outras pendências; decisão repetida/tardia não modifica a decisão anterior; revisão expirada ou alterada exige revisão atual no painel. RECUSAR sem motivo, quando enviado como resposta, retorna orientação e mantém a revisão aberta.
- Mensagens seguem título, conteúdo e ação. Avisos mostram tipo, nome do usuário, nome/descrição do link, URL completa válida, categoria/rede, observação e contestação quando houver, identificação e painel. A instrução é uma linha: `Responda: APROVAR ou RECUSAR motivo`. Sem parágrafos de tutorial em cada aviso. Confirmações/erros reutilizam o contexto disponível e explicam o resultado. Recusar edição mantém o texto publicado anterior. Estorno inclui pedido, usuário, link, valor, forma de pagamento, tentativas e acesso ao painel. Recuperação identifica a entrega retomada. URLs não são truncadas nem passam pelo saneamento que remove underscores do texto; protocolos inseguros e credenciais embutidas não são exibidos.
- Separar visualmente os blocos com uma linha em branco e títulos em negrito: Usuário, Link, Classificação e Ação. Resultado/Motivo/Decidido por nas decisões; Pedido nos estornos; Entrega na recuperação. Campos relacionados ficam no mesmo bloco; referência, validade e painel ficam no rodapé. Aumentar respiro visual sem acrescentar texto explicativo.
- **F42-E10:** criar A e B, responder A após B chegar, conferir apenas A publicado; recusar B com motivo, conferir apenas B recusado; testar comando sem citação, citação falsa com corpo forjado, referência/citação conflitantes, motivo ausente e decisão tardia. Rodar desktop e mobile com API, PostgreSQL, filas e adapter reais contra stub do provedor.
- Demonstrações no grupo são identificadas como TESTE visual, sem revisão persistida e sem alterar links reais. Entrega aceita pela API não comprova leitura nem ensaio humano da nova modalidade Responder; registrar essa distinção.

GET, prévia de link e leitura automática por WhatsApp nunca alteram estado. Link de painel exige login ADMIN, proteção CSRF e confirmação por ação mutável. Rejeição com motivo insuficiente devolve instrução sem consumir a decisão como concluída.

## Eventos a enviar ao grupo

| Evento de produto | Momento e conteúdo | Inclusão |
| --- | --- | --- |
| Revisão humana inicial | Após persistir a ocorrência, nome/rede/nicho/resumo/ref e ação | MVP obrigatório |
| Contestação do proprietário | Quando contestação válida volta à fila; trecho limitado e ref do novo ciclo | MVP obrigatório |
| Alteração de texto exige revisão | Resultado ADMIN para proposta atual; tipo edição, comparar texto autorizado sem publicar proposta | MVP obrigatório |
| Decisão concluída | Aprovação/recusa por painel ou grupo; operador e motivo mínimo, resultado real | MVP obrigatório |
| Estorno não concluído | Pedido, estado confirmado e link admin; nenhum dado de cartão/Pix sensível | MVP obrigatório, produtor existente |
| Entrega esgotada ou integração desconectada | Estado no painel; aviso agregado ao grupo só após recuperação comprovada | MVP obrigatório, sem recursão |
| Fila antiga ou resumo periódico | Totais e links administrativos; limiar/frequência a definir | Opcional, desligado por padrão, sem agendamento executado |
| Denúncia que exige atenção | Referência e gravidade sem conversa/dados pessoais | Conectar após F06; não implementar F06 dentro de F42 |
| Falha persistente de disponibilidade | Resumo de links e ação no painel | Conectar após F07 |
| Destaques perto do vencimento | Resumo operacional, sem disparar cobrança | Conectar após F02; respeitar preferências e evitar duplicação |
| Pagamento confirmado/promoção ativada | Apenas estado confirmado, resumo ou opção configurável | Opcional; não enviar cada Pix pendente |
| Cadastros, buscas, cliques, OTP, QR de sessão, todas as conversas | Sem necessidade para moderação | Fora do escopo e desabilitados |

Chaves de produto acima são propostas internas, não nomes de eventos nativos da Evolution. Assinar eventos de recebimento/conexão apenas conforme versão instalada; evitar coleta de mensagens de outros grupos e histórico. Não ler/renderizar QRCODE_UPDATED no painel desta integração. Falha do canal tem registro local e painel; não depender desse mesmo grupo para revelar a própria indisponibilidade.

## Reutilização e lacunas verificadas

- `backend/src/http/controllers/@Links/routes.ts`: já chama notifyModerationQueue para aviso por e-mail; não substituir envio existente.
- `backend/src/http/controllers/@Admin/moderation.ts`: hoje orquestra validação, nicho, patch, funil, encerramento, auditoria e e-mail em várias chamadas. Extrair a orquestração reutilizável e tornar a disputa atômica; não duplicar o controller no adapter.
- `backend/src/use-cases/@Moderation/decide-case.ts`: regra pura reaproveitável, insuficiente sozinha para persistir a decisão completa.
- `backend/src/use-cases/@Moderation/settle-submission.ts` e `backend/src/worker.ts`: distinguir PUBLISH automático, ADMIN e SKIPPED. Aviso com ação só para revisão humana ainda vigente; não pedir aprovação de algo já publicado automaticamente.
- `backend/src/use-cases/@Links/settle-proposed-text.ts`: propostas usam auditoria e resultado próprio; tratar proposta de texto como tipo diferente de ModerationCase inicial.
- `backend/src/repositories/moderation-cases-repository.ts`: caso aberto/closedAt e disputa de fechamento precisam de transação compartilhada com decisão.
- `backend/src/use-cases/@Payments/payment-jobs.ts`: runNotifyRefundFailed tem deduplicação em memória; alerta externo exige entrega durável por ocorrência, não só array de processo.
- Reutilizar AuditLog, Prisma, BullMQ, config/env, observabilidade e componentes locais de painel, controles e feedback.

Porta proposta `OperationalNotificationChannel`, adapter Evolution e casos de uso de notificação/moderação compartilham os padrões existentes. Não criar um serviço separado de bot, segundo banco, framework de agentes, modelo de IA para interpretar comandos ou novo design system. F30 pode reaproveitar primitivas duráveis quando for entregue; F42 não depende de F30.

## Dados propostos e invariantes

| Conceito | Campos mínimos e unicidade |
| --- | --- |
| OperationalEvent/outbox | id, tenantId, eventType, resourceType/id, revision/snapshotHash, payload mínimo, createdAt; chave única da ocorrência real |
| OperationalDelivery | eventId, channel, instanceRef, groupJid, status, attempts, providerMessageId, lastErrorCode, nextAttemptAt; vínculo único por evento/canal/destino |
| ModerationActionReference | tokenHash, tenantId, resourceType/id, reviewRevision, snapshotHash, expiresAt, consumedAt, resolutionId; referência imprevisível e indexada por hash |
| EvolutionWebhookReceipt | instanceRef, providerMessageId, groupJid, senderRef, eventType, receivedAt, processingState; dedup único por instância e ID de mensagem válido |
| OperatorBinding | tenantId, normalizedSenderJid, adminUserId, enabled; consulta à situação ADMIN ativa a cada decisão |
| IntegrationStatus | última entrega/erro/conexão observada, backlog e configuração mascarada; segredos fora de DTO público |

Preferir modelos/contratos existentes se atenderem ao propósito. Não reutilizar VerificationCode de confirmação de conta nem token de pagamento como referência de ação. Dado de caso, revisão, consumo de referência, auditoria e outbox de efeitos devem ter consistência transacional. Se efeitos legados não couberem na mesma transação, registrar a fronteira e migrá-los para intenção durável com deduplicação antes de habilitar o canal novo.

Referência expirada, já consumida, revisão alterada ou caso encerrado devolve resultado sem nova mutação. Grupo/instância de um tenant nunca acessam recurso de outro. Operador removido ou rebaixado perde direito imediatamente, mesmo com mensagem antiga válida.

Entrega externa é pelo menos uma vez com possibilidade de resposta perdida. Não assumir chave de idempotência oferecida pelo provedor. Timeout após aceitação pode significar entrega incerta; reconciliar por ID/capacidade comprovada ou suspender reenvio automático para análise. Mensagem eventualmente duplicada compartilha a mesma referência e não permite duas decisões.

## Contratos propostos

- Adapter de envio recebe evento tipado, tenant confiável e destino resolvido da configuração. Não recebe API key do browser.
- Base/rota de envio, header de autenticação e contrato real são congelados em D44 com exemplo redigido da versão instalada. /manager não participa de chamadas de envio.
- `POST /api/v1/integrations/evolution/webhook`: autenticação própria restrita ao canal, corpo com tamanho limitado e schema allowlist; não simular JWT ADMIN para o bot nem remover CSRF global. Webhook tem exceção de sessão estritamente delimitada e autenticada.
- Recebimento válido: receipt durável e ACK conforme protocolo antes de processamento demorado. Duplicado ACK sem reaplicar; evento irrelevante autenticado é ignorado sem efeitos; erro de auth falha fechado.
- `GET /api/v1/admin/integrations/evolution/status`: backlog/última entrega/config mascarada para ADMIN do tenant.
- `PATCH /api/v1/admin/integrations/evolution/settings`: opções não secretas, enabled, eventos permitidos e permissões; versionamento, CSRF e auditoria.
- `POST /api/v1/admin/integrations/evolution/deliveries/:id/retry`: valida estado e tentativa incerta; requer ADMIN e confirmação.
- Endpoint de teste de entrega somente se houver caso concreto; clique confirma destinatário e conteúdo sintético antes de envio. Testes automatizados usam stub local, nunca o grupo real.
- A ação normalizada chama o mesmo serviço de decisão do painel, com actorId real vinculado, case/proposal, decisão, motivo, expectedRevision e correlationId. Não autorizar por pushName, nome de contato ou número declarado em texto.

Mensagens elegíveis precisam comprovar instância esperada, remoteJid do grupo e participante de origem normalizado conforme versão. Tratar PN/LID e identidade em D45 com evidência; negar identidade que não possa ser vinculada. Instância de bot dedicada é a proposta: eventos fromMe são ignorados para evitar loop; operação humana deve usar identidade autorizada separada.

## Critérios de aceitação e rastreabilidade

| Critério | Obrigação | Caso | Camada |
| --- | --- | --- | --- |
| F42-AC01 | Entrada em revisão humana cria aviso durável correlacionado ao tenant, recurso, tipo e versão; retentativa da mesma ocorrência não cria nova intenção. | F42-T01 | I/PG |
| F42-AC02 | Aviso informa referência, nome, resumo limitado, rede, nicho, tipo de revisão e acesso ao painel; omite dados pessoais, credenciais e sinais sensíveis não necessários. | F42-T02 | U/I/E |
| F42-AC03 | Administrador autorizado consegue aprovar a revisão atual por comando explícito e recebe confirmação somente após commit da decisão. | F42-T03 | U/I/PG/E |
| F42-AC04 | Recusa exige motivo não vazio e válido; confirmação mostra resultado real sem alterar a versão publicada de uma edição recusada. | F42-T04 | U/I/PG/E |
| F42-AC05 | Remetente normalizado é vinculado a User ADMIN ativo do tenant e à lista de operadores autorizados em cada ação; participar do grupo não concede poder. | F42-T05 | U/I/PG |
| F42-AC06 | Webhook só aceita eventos com autenticação verificável pelo mecanismo suportado pela instalação ou por gateway autenticado; ausência ou falha não executa ação. | F42-T06 | I/E |
| F42-AC07 | Instância, grupo, tenant e recurso devem corresponder à configuração confiável do servidor; payload não escolhe tenant nem destinatário de saída. | F42-T07 | U/I/PG |
| F42-AC08 | Parser só aceita comandos exatos do corpo da mensagem admitida; citações, encaminhamentos, conteúdo do link e mensagens editadas/históricas não viram autorização implícita. | F42-T08 | U/I |
| F42-AC09 | Referência de ação é opaca, expira, vincula revisão/snapshot e é consumida atomicamente; referência antiga ou já usada não altera o recurso. | F42-T09 | U/I/PG |
| F42-AC10 | Decisão simultânea por painel e grupo permite um único vencedor; ação perdedora informa resolvido ou desatualizado sem efeitos duplicados. | F42-T10 | I/PG/E |
| F42-AC11 | Aprovação e recusa pelo grupo conservam regras de domínio, nichos restritos, slots, auditoria, publicação, embedding e notificações aplicáveis do fluxo atual. | F42-T11 | U/I/PG/E |
| F42-AC12 | Revisão inicial, contestação e proposta de texto têm tipo explícito e dispatch para o caso de uso adequado; edição pendente não é aplicada como link novo. | F42-T12 | U/I/PG/E |
| F42-AC13 | Evento de saída é persistido em transação com a mudança de domínio e processado pelo worker BullMQ existente, com recuperação após reinício. | F42-T13 | I/PG/Redis |
| F42-AC14 | Falha ou desconexão da Evolution não perde revisão, bloqueia submissão nem aprova ou recusa automaticamente; painel permanece operacional. | F42-T14 | I/Redis/E |
| F42-AC15 | Entrega registra tentativas e ID retornado pelo provedor; timeout ambíguo vira estado de entrega incerta com política de reconciliação, sem prometer exatamente uma vez. | F42-T15 | U/I/Redis |
| F42-AC16 | Eventos próprios, recibos, histórico inicial e notificações de envio não realimentam comandos nem geram tempestade de mensagens. | F42-T16 | U/I/Redis |
| F42-AC17 | Registro de eventos distingue revisão pendente, contestação, decisão e falhas operacionais; alertas ainda sem produtor ficam desabilitados até sua feature existir. | F42-T17 | U/I/E |
| F42-AC18 | Configuração e segredos ficam no servidor, com chaves tipadas e valores mascarados; logs, testes, exportações e frontend não recebem credenciais reais. | F42-T18 | U/I/E |
| F42-AC19 | Admin pode ver estado da integração, fila de entrega e falhas, desativar envio/ações e solicitar reprocessamento controlado; usuário comum é negado. | F42-T19 | I/PG/E |
| F42-AC20 | Integração começa desabilitada; habilitar exige configuração válida e prova em sandbox; não envia a grupo ou instância arbitrários. | F42-T20 | U/I/E |
| F42-AC21 | AuditLog liga operador, canal, recurso, decisão, motivo e correlação; não armazena conversa inteira nem segredo e tem retenção definida. | F42-T21 | I/PG |
| F42-AC22 | GET e abertura de link nunca decidem; alternativa pelo painel exige sessão ADMIN, CSRF e confirmação explícita. | F42-T22 | I/E |
| F42-AC23 | Botões interativos só são habilitados após ensaio na versão e tipo de conexão instalados; comandos de texto e acesso ao painel permanecem alternativas funcionais. | F42-T23 | I/E/M |
| F42-AC24 | Testes cobrem unitários, controller, PostgreSQL, Redis e Playwright com Evolution simulada; ensaio real de grupo é gate separado e não usa credenciais reais no CI. | F42-T24 | U/I/PG/Redis/E/M |
| F42-AC25 | Falha de estorno e esgotamento de entrega geram alertas resumidos e deduplicados; falha do próprio canal também aparece no painel, sem recursão pelo canal quebrado. | F42-T25 | I/Redis/E |
| F42-AC26 | Expiração, retenção, revogação de operador e rotação de segredo invalidam ações pertinentes; mensagens já entregues não são consideradas apagadas por purge local. | F42-T26 | U/I/PG |

## Testes unitários específicos

- **F42-U01:** APROVAR com ref válida vira APPROVE; RECUSAR com motivo válido vira REJECT e motivo; ausência de motivo não decide.
- **F42-U02:** descrição/quote contendo APROVAR, evento histórico, editado, encaminhado não admitido e texto fora da gramática não geram comando.
- **F42-U03:** mensagens de outro grupo/instância, fromMe, recibos e evento de envio são ignorados conforme política.
- **F42-U04:** referência vencida, hash/snapshot divergente e consumida não produzem alteração; relógio injetado testa limite exato.
- **F42-U05:** operador removido, USER, BANNED ou identidade LID não vinculada é negado; grupo com membro não autorizado não concede ADMIN.
- **F42-U06:** template limita texto, neutraliza marcação e omite e-mail, chave, QR de sessão e dados sensíveis sentinela.
- **F42-U07:** retry diferencia falha definitiva, transitória e entrega incerta; recuperação de conexão agrega aviso sem tempestade.
- **F42-U08:** dedup de evento usa tipo/recurso/revisão e destino; revisão nova cria novo aviso e invalida ação antiga.

## Integração HTTP PostgreSQL Redis

- **F42-I01:** webhook sem segredo, segredo errado ou payload acima do limite não cria receipt executável nem decisão; JSON correto com remoteJid correto continua não autenticado sem prova.
- **F42-I02:** receipt válido duplicado com mesmo messageId só executa uma vez; mensagem histórica e ID malformado não contornam dedup.
- **F42-I03:** caso inicial aprova pelo grupo e pelo painel com mesmo resultado em Link, slot, caso fechado, funil, intenção de embedding/e-mail e AuditLog; recusa de texto preserva versão publicada.
- **F42-PG01:** painel APPROVE e grupo REJECT concorrentes: uma decisão, uma resolução e efeitos únicos; falha injetada antes do commit reverte consumo/auditoria/mutação.
- **F42-PG02:** reinício após commit da ocorrência recupera outbox; antes do commit não há mensagem elegível.
- **F42-PG03:** operador revogado ou tenant B com referência A falha sem consumo da ref A e sem revelar recurso.
- **F42-R01:** Evolution simulada 500/desconectada repete com backoff limitado; dead-letter visível; caso permanece no painel.
- **F42-R02:** provedor recebe envio e conexão expira antes da resposta: estado UNCERTAIN não vira FAILED comum; comportamento de reconciliação testado sem envio cego duplicado.
- **F42-R03:** falha de estorno publica um evento durável mesmo após reinício; falha desse alerta não gera alerta de alerta recursivo.

Cada T01–T26 deve ter cenário e asserção correspondente à obrigação da tabela, reutilizando fixtures mas sem considerar teste genérico como prova de todos os critérios.

## Playwright e ensaio real

Harness: aplicação Next/BFF/API, PostgreSQL e worker reais; só Evolution externa é simulada. Stub acessível por adapter de teste explícito, sem relaxar proteção de rede em produção. POST do webhook no teste vem do simulador do provedor, não de sessão ADMIN forjada.

- **F42-E01:** usuário envia link; fixture força ADMIN em vez de publicação automática; stub recebe mensagem do grupo fictício; simula aprovação por operador autorizado; visitante vê link publicado e painel mostra auditoria. Recarregar mantém resultado.
- **F42-E02:** novo caso e recusa com motivo; caso inicial permanece não publicado; proposta de texto recusada mantém nome/descrição públicos antigos; falta de motivo deixa pendente.
- **F42-E03:** painel e callback disputam mesma revisão; um vence; mensagem tardia exibe resolvido/desatualizado; métricas e e-mails não duplicam.
- **F42-E04:** Evolution fora: submissão aceita, painel lista pendência e falha de entrega; decisão pelo painel funciona; recuperação não pede decisão para caso já fechado.
- **F42-E05:** admin configura opções não secretas, vê erros e desativa comandos; conta comum não acessa rota/ações; verificar DOM/payload/logs sem credenciais.
- **F42-E06:** contexto mobile confirma legibilidade e ações do painel; fluxo de revisão e rejeição mantém foco/erro; anexos/HTML não executam.
- **F42-E07:** webhook com segredo errado, grupo errado e participante não autorizado não muda link; mensagem escrita por usuário no título do link não é executada.
- **F42-M01:** após implementação e autorização de conexão/envio, testar versão real, instância, grupo aprovado, comandos e botões se suportados; registrar aparelhos, identidade de operador, contrato redigido e resultado. A autorização posterior inclui a instalação e o grupo indicados; não usar outros destinatários nem alterar links reais apenas para testar.

## Caminhos propostos para os testes

- `backend/src/domain/notifications/evolution-command.spec.ts` e `operational-notification.spec.ts`.
- `backend/src/http/evolution-webhook.http.spec.ts`.
- `backend/src/http/evolution-moderation.pg.spec.ts`.
- `backend/src/use-cases/@Moderation/evolution-actions.redis.spec.ts`.
- `frontend/src/components/domain/evolution-integration.test.tsx`.
- `frontend/e2e/evolution-moderation.spec.ts`.

Registrar descoberta Playwright e PG como prescrito em [qualidade](../qualidade-e-testes.md). Nenhum arquivo de teste foi criado nesta atividade.

## Decisões e gates

- **D44:** versão/base real/instância/tipo de conexão; autenticação API e webhook; suporte comprovado a mensagens de grupo/botões e contratos de participante.
- **D45:** operadores autorizados, vínculo User ADMIN ativo, identidade PN/LID e conta de bot dedicada.
- **D46:** validade de ref, retenção, limites/retry/backoff, reconciliação de entrega incerta e alertas opcionais.
- **D47:** serviço de decisão compartilhado, fronteira transacional e compatibilidade de proposta de texto/contestação com fluxo legado.

Só estes assuntos e G00 mínimo bloqueiam F42; decisões D01–D43 de features posteriores não atrasam esta prioridade. Sem prova de webhook autenticado e identidade do operador, manter ação remota desligada e oferecer painel seguro. Não habilitar cobrança, pagamento, banimento ou exclusão de conta por comando de WhatsApp.

## Fontes e limite da pesquisa

Consulta em 15 de outubro de 2026: [webhooks oficiais](https://github.com/evolution-foundation/docs-evolution/blob/main/v2/en/configuration/webhooks.mdx) documentam eventos de recebimento, envio e conexão. Não comprovam a versão, autenticação ou suporte a botões desta instalação particular. O endpoint real será confirmado em S0; não se usaram credenciais fornecidas nem se acessou o manager autenticado.

## Fonte integral da feature

**Prioridade:** primeira feature de implementação, ID F42, antes de F01, depois somente do gate mínimo G00.

**Objetivo:** receber no grupo operacional os links que precisam de revisão humana e permitir ao administrador aprovar ou recusar com rastreabilidade, preservando o painel existente.

**Escopo inicial:** avisos de revisão inicial, contestação e edição de texto pendente; aprovação e recusa com motivo; confirmação da decisão; alerta de estorno não concluído e falha persistente da integração; tela administrativa de entregas e estado. Alertas de denúncias, disponibilidade e renovações serão conectados quando F06, F07 e F02 existirem.

**Destino informado:** grupo `120363430923498399@g.us`. Manager: https://evolution.temlinkaqui.com/manager. A origem de API candidata é `https://evolution.temlinkaqui.com`; versão, base efetiva e nome da instância devem ser confirmados antes de implementar. As duas sequências recebidas como possíveis credenciais não são reproduzidas nem classificadas sem confirmação.

**Reutilização:** ampliar os fluxos de moderação existentes e o worker BullMQ; compartilhar a decisão entre painel e grupo. Não criar bot com regras de moderação paralelas nem depender de F30.

**Critérios de conclusão:**

- **F42-AC01:** Entrada em revisão humana cria aviso durável correlacionado ao tenant, recurso, tipo e versão; retentativa da mesma ocorrência não cria nova intenção.
- **F42-AC02:** Aviso informa referência, nome, resumo limitado, rede, nicho, tipo de revisão e acesso ao painel; omite dados pessoais, credenciais e sinais sensíveis não necessários.
- **F42-AC03:** Administrador autorizado consegue aprovar a revisão atual por comando explícito e recebe confirmação somente após commit da decisão.
- **F42-AC04:** Recusa exige motivo não vazio e válido; confirmação mostra resultado real sem alterar a versão publicada de uma edição recusada.
- **F42-AC05:** Remetente normalizado é vinculado a User ADMIN ativo do tenant e à lista de operadores autorizados em cada ação; participar do grupo não concede poder.
- **F42-AC06:** Webhook só aceita eventos com autenticação verificável pelo mecanismo suportado pela instalação ou por gateway autenticado; ausência ou falha não executa ação.
- **F42-AC07:** Instância, grupo, tenant e recurso devem corresponder à configuração confiável do servidor; payload não escolhe tenant nem destinatário de saída.
- **F42-AC08:** Parser só aceita comandos exatos do corpo da mensagem admitida; citações, encaminhamentos, conteúdo do link e mensagens editadas/históricas não viram autorização implícita.
- **F42-AC09:** Referência de ação é opaca, expira, vincula revisão/snapshot e é consumida atomicamente; referência antiga ou já usada não altera o recurso.
- **F42-AC10:** Decisão simultânea por painel e grupo permite um único vencedor; ação perdedora informa resolvido ou desatualizado sem efeitos duplicados.
- **F42-AC11:** Aprovação e recusa pelo grupo conservam regras de domínio, nichos restritos, slots, auditoria, publicação, embedding e notificações aplicáveis do fluxo atual.
- **F42-AC12:** Revisão inicial, contestação e proposta de texto têm tipo explícito e dispatch para o caso de uso adequado; edição pendente não é aplicada como link novo.
- **F42-AC13:** Evento de saída é persistido em transação com a mudança de domínio e processado pelo worker BullMQ existente, com recuperação após reinício.
- **F42-AC14:** Falha ou desconexão da Evolution não perde revisão, bloqueia submissão nem aprova ou recusa automaticamente; painel permanece operacional.
- **F42-AC15:** Entrega registra tentativas e ID retornado pelo provedor; timeout ambíguo vira estado de entrega incerta com política de reconciliação, sem prometer exatamente uma vez.
- **F42-AC16:** Eventos próprios, recibos, histórico inicial e notificações de envio não realimentam comandos nem geram tempestade de mensagens.
- **F42-AC17:** Registro de eventos distingue revisão pendente, contestação, decisão e falhas operacionais; alertas ainda sem produtor ficam desabilitados até sua feature existir.
- **F42-AC18:** Configuração e segredos ficam no servidor, com chaves tipadas e valores mascarados; logs, testes, exportações e frontend não recebem credenciais reais.
- **F42-AC19:** Admin pode ver estado da integração, fila de entrega e falhas, desativar envio/ações e solicitar reprocessamento controlado; usuário comum é negado.
- **F42-AC20:** Integração começa desabilitada; habilitar exige configuração válida e prova em sandbox; não envia a grupo ou instância arbitrários.
- **F42-AC21:** AuditLog liga operador, canal, recurso, decisão, motivo e correlação; não armazena conversa inteira nem segredo e tem retenção definida.
- **F42-AC22:** GET e abertura de link nunca decidem; alternativa pelo painel exige sessão ADMIN, CSRF e confirmação explícita.
- **F42-AC23:** Botões interativos só são habilitados após ensaio na versão e tipo de conexão instalados; comandos de texto e acesso ao painel permanecem alternativas funcionais.
- **F42-AC24:** Testes cobrem unitários, controller, PostgreSQL, Redis e Playwright com Evolution simulada; ensaio real de grupo é gate separado e não usa credenciais reais no CI.
- **F42-AC25:** Falha de estorno e esgotamento de entrega geram alertas resumidos e deduplicados; falha do próprio canal também aparece no painel, sem recursão pelo canal quebrado.
- **F42-AC26:** Expiração, retenção, revogação de operador e rotação de segredo invalidam ações pertinentes; mensagens já entregues não são consideradas apagadas por purge local.

**Indicadores:** tempo entre revisão humana e decisão, avisos pendentes, sucesso/falha de entrega, comandos autorizados recusados por conflito e decisões auditadas por canal.

**Decisões D44–D47:** resolvidas no registro de execução. Botões permanecem desligados; comandos explícitos são a alternativa adotada. O ensaio real e o rollout têm evidência própria, separada dos testes locais.

**Limite da autorização atual:** implementar e validar somente P0/F42, configurar a integração indicada e parar. Não executar F01–F41.

