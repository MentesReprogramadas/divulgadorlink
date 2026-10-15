# Execução do P0 — F42

Data: 15/10/2026. Responsável técnico: Codex. Escopo autorizado: implementar e ativar somente F42, depois parar. F01–F41 permanecem não iniciadas. Estado: EM ANDAMENTO; fechamento depende dos resultados finais de regressão e rollout registrados abaixo.

## Decisões concretizadas

- D44: Evolution 2.3.7, conexão WHATSAPP-BAILEYS, instância Fernando BOT e grupo operacional da spec, confirmados por consultas autenticadas. Base HTTPS sem `/manager`. Envio por `POST /message/sendText/{instance}` com `apikey`; aceite exige `key.id`. Webhook por `POST /webhook/set/{instance}`, cabeçalho privado `x-evolution-secret`, evento `MESSAGES_UPSERT`, `byEvents=false`, `base64=false`. [Schema da versão](https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/api/integrations/event/webhook/webhook.schema.ts) e [implementação dos cabeçalhos](https://github.com/EvolutionAPI/evolution-api/blob/2.3.7/src/api/integrations/event/webhook/webhook.controller.ts). Botões não foram habilitados: comandos explícitos são o formato adotado e testado.
- D45: dois números aprovados pelo usuário, mantidos nas envs. O número precisa ter vínculo durável com ADMIN ativo do mesmo tenant; bootstrap somente quando há um único ADMIN ativo, ou um ADMIN explicitamente configurado. Revogação não é revertida pelo bootstrap. O painel permite vincular/revogar. Participante PN ou `participantAlt` PN é admitido; LID sem identidade PN verificável é negado. Mensagens do bot são ignoradas.
- D46: referência expira em 24 horas, HMAC SHA-256 com segredo aleatório de 256 bits, vinculada ao snapshot e consumida na transação da decisão. Webhook aceita mensagens recentes, até cinco minutos e tolerância futura de um minuto. Entrega: até cinco tentativas para 429/5xx, backoff a partir de 60 segundos. Timeout, resposta sem ID e worker perdido depois do envio viram UNCERTAIN e exigem confirmação manual para reenviar. Dados concluídos são removidos após 30 dias; falhas/entregas incertas ficam para investigação. AuditLog de decisões segue a política existente e não é apagado pelo purge do canal.
- D47: painel e grupo usam `resolveHumanReview`, com lock do link e revalidação de ADMIN/vínculo, revisão, snapshot e referência. Caso/proposta, link, auditoria, embedding, funil, receipt e intenções de notificação são confirmados juntos. Publicação automática revalida o link sob o mesmo lock para não sobrescrever a decisão humana. Falha de estorno grava intenção junto ao estado do pedido.

## Reuso e delta de arquitetura

Foram reutilizados `decideCase`, máquina de estados do link, Prisma/PostgreSQL, AuditLog, embedding outbox, BullMQ/worker existente, templates/e-mail existentes, navegação admin, Button e ErrorState. Não há dependência nova nem serviço separado de bot.

A fila `divulgador-evolution` tem consumidor próprio no mesmo processo e usa o mesmo factory de worker e o mesmo Redis. Motivo concreto: uma chamada HTTP ao provedor pode levar 12 segundos; esse tempo não pode ocupar o consumidor que expira Pix e modera links. F42-E09 mantém um envio em aberto e prova que o job da fila principal termina antes de liberar o provedor. O snapshot da revisão inclui conteúdo, facetas e ciclo de revisão; uma atualização isolada de embedding não invalida o comando.

Três modelos aditivos atendem ao canal único: OperationalMessage reúne ocorrência, referência e entrega; EvolutionReceipt deduplica entrada; EvolutionOperator vincula identidade ao ADMIN. Evita-se criar seis tabelas para conceitos que, neste MVP, têm relação um para um. Apenas ID e MAC são enviados no comando; o segredo e a referência completa não são persistidos em logs. A referência continua sendo revalidada contra estado/expiração/snapshot no banco.

API e worker recebem configuração no Coolify; frontend não recebe chaves. `EVOLUTION_ENABLED` e `EVOLUTION_ACTIONS_ENABLED` começam em `0` no código. Toggle administrativo pode suspender envio ou comandos; env desligada continua sendo limite superior. A consulta da conexão é independente da habilitação e não controla aprovação/publicação.

Eventos entregues: revisão inicial, contestação, proposta de texto com resultado ADMIN, decisão pelo painel/grupo, falha confirmada de estorno e recuperação de entrega. Alertas de features futuras, relatórios periódicos e outras conversas não foram conectados.

## Evidências executadas

| Execução | Ambiente/comando | Resultado |
| --- | --- | --- |
| U-BACK-01 | Backend, `npm test`; PostgreSQL/Redis descartáveis, sem Evolution real | 87 arquivos, 349 testes aprovados, exit 0 |
| U-FRONT-01 | Frontend, `npm test` | 31 arquivos, 103 testes aprovados, exit 0 |
| PG-01 | Backend, `PG_SPECS=1 npm run test:pg`, URLs explícitas para banco local descartável | 7 arquivos, 48 testes aprovados, exit 0 |
| E2E-01 | Frontend, `npx playwright test --project=features --project=features-mobile` | 13 testes aprovados, exit 0; Evolution simulada, API/BFF/PG/Redis/worker reais |
| STATIC-01 | Lint e typecheck de backend/frontend; build do backend | Aprovados, exit 0 |
| E2E-02 | Primeira ampliação para features, mobile e catálogo | Falhou: seletor exato do formulário e testes legados desatualizados; tentativa preservada como falha, não como aceite |
| U-BACK-02 | Snapshot isolado do índice Git, backend `npm test` | 86 arquivos, 350 testes aprovados, exit 0 |
| U-FRONT-02 | Mesmo snapshot, frontend `npm test` | 30 arquivos, 101 testes aprovados, exit 0 |
| PG-02 | Mesmo snapshot, suíte completa PostgreSQL | 7 arquivos, 49 testes aprovados, exit 0; posteriormente acrescentada regressão específica de snapshot/embedding |
| E2E-03 | Snapshot isolado, `npx playwright test --project=features --project=features-mobile --project=catalog` | 46 testes aprovados, exit 0; inclui E08 (interface completa) e E09 (isolamento de fila) em desktop/mobile |
| PROD-01 | Coolify API + worker | Oito envs do canal gravadas. Flags preparadas para ativação no próximo deploy, após validação local. Nenhuma chave no frontend ou neste relatório |

As diferenças nas contagens U01/U02 decorrem das mudanças locais de outra atividade, excluídas do snapshot de publicação. Foram preservadas sem entrar no commit do P0. Para tornar a regressão executável, corrigiram-se seletores ambíguos e expectativas de navegação/consentimento dos testes existentes; os testes de submissão agora têm usuário próprio, e os da Evolution têm tenant próprio. Nenhuma regra de sessão, conta ou consentimento foi alterada por esses ajustes.

Relatórios locais: `frontend/playwright-report/index.html`, `frontend/test-results/results.json`; screenshots e traces são retidos em falha. O CI retém artefatos por sete dias. Relatórios do harness contêm somente credenciais sintéticas; não anexar exports de env nem conversas reais.

## Matriz de evidência dos ACs

| AC | Prova primária |
| --- | --- |
| 01 | PG intenção única/snapshot, produtor transacional, E08 envio real |
| 02 | Unit template sentinela privado; E01 captura do destino/referência |
| 03 | PG receipt atômico e E01 publicação após reload |
| 04 | PG rejeição de proposta preserva publicado; E02 motivo; E08 edição |
| 05 | PG revogação/rebaixamento, E07 operador estranho negado, ADMIN revalidado no serviço |
| 06 | HTTP sem autenticação, E07, contrato de headers da versão instalada |
| 07 | Parser grupo/instância, PG tenant, E07 grupo errado |
| 08 | Unit gramática, histórico/fromMe/encaminhado, PN/LID e referência assinada |
| 09 | PG expiração, rollback e snapshot antigo; unit MAC com chave diferente |
| 10 | PG concorrência real e E03 mensagem tardia |
| 11 | Regressão moderação + PG caso/embedding/funil e suíte completa PG |
| 12 | PG revisão de texto e E08 envio/contestação/edição |
| 13 | PG receipt/outbox e interrupção; E01/E08 BullMQ e worker reais |
| 14 | E04 provedor 503, decisão no painel permanece operacional |
| 15 | Unit 429/5xx/401/timeout/ID; PG UNCERTAIN, interrupção, limite de tentativas |
| 16 | Unit fromMe/histórico, PG recuperação não recursiva, receipt único |
| 17 | Templates separados e produtores limitados a eventos existentes |
| 18 | Unit sentinela; E05 DOM sem chave; envs somente API/worker |
| 19 | Componentes confirmação/estados; E05 acesso ADMIN/USER e mobile |
| 20 | Env default 0; PG desligamento, contrato de origem e destinatário fixos |
| 21 | PG auditoria única e E01 canal; schema guarda IDs e comando normalizado, sem conversa |
| 22 | HTTP GET 404, middleware CSRF existente e regressão catálogo |
| 23 | Botões desligados; texto explícito e painel testados |
| 24 | U/HTTP/PG/Redis/Playwright locais; ensaio do provedor separado no rollout |
| 25 | Evento de estorno transacional; PG DEAD/recuperação não recursiva; painel de entregas |
| 26 | Unit rotação MAC, PG revogação, expiração e retenção |

Resultados em execução não constituem aceite. O ledger e a matriz CSV devem acompanhar o resultado final, sem concluir etapas cujo gate permanece pendente.

## Operação e recuperação

1. Em `/admin/integracoes`, conferir configuração, conexão, operadores e fila. Participação no grupo não substitui vínculo ADMIN. Se houver vários ADMINs e nenhum vínculo, cada operador deve ser vinculado explicitamente a uma conta, ou o responsável deve definir `EVOLUTION_OPERATOR_ADMIN_ID`.
2. Para decidir, enviar uma mensagem própria contendo exatamente `APROVAR <referência>` ou `RECUSAR <referência> <motivo>`. Não encaminhar a mensagem do bot como autorização. Responder citando o aviso é permitido somente quando o corpo novo contém o comando completo; texto citado não é interpretado.
3. Referência vencida/desatualizada ou revisão já decidida não muda o link. Usar o painel para decisões de avisos antigos. Resposta do grupo confirma a transação; aceite de envio não confirma leitura.
4. RETRY possui retentativa limitada. DEAD exige investigar erro/configuração. UNCERTAIN exige conferir o grupo e confirmar o reenvio no painel; repetir o aviso preserva a referência e não permite duas decisões.
5. Para suspender: desligar comandos/envio no painel. Para rollback de código: primeiro desligar as duas envs na API/worker e redeploy; manter migration aditiva e auditoria. Não remover tabelas nem executar reset/down de banco em produção.
6. Para rotacionar: desligar comandos, gerar novo segredo aleatório, atualizar API/worker e header do webhook, reiniciar/reimplantar e verificar autenticação. Referências antigas deixam de validar; decidir revisões remanescentes pelo painel. Rotacionar API key na instância e nos dois serviços quando necessário, sem imprimir valores.
7. Purge local não apaga mensagens já entregues no WhatsApp. O bot não processa OTP, Pix, QR de sessão, mensagens privadas ou outros grupos.

## Pendências de fechamento

- Regressão E2E ampliada concluída: 46/46.
- Snapshot do índice validado sem incorporar alterações locais de outra atividade.
- Publicar API/worker/web, configurar webhook autenticado e verificar saúde.
- Registrar prova real de conexão/envio e resultado do smoke de recebimento, sem publicar credenciais.
- Atualizar ledger, matriz e estado final. Parar ao final do P0.
