# Plano de implementação F42 Moderação e alertas no grupo pela Evolution API

**Estado:** CONCLUÍDO E VALIDADO EM PRODUÇÃO. Atualização em 15 de outubro de 2026. [Registro de execução](../execucao-f42.md).  
**Ordem:** primeira feature; onda P0, antes de F01.  
**Dependência funcional:** base existente e G00 mínimo da integração, não F30 nem outras features futuras.  
**Spec vinculante:** [F42](../specs/f42-evolution-moderacao.md).  
**Roadmap:** [etapas](../roadmap-auditavel.md); [matriz AC](../matriz-aceitacao.csv).

Autorização posterior do usuário: executar e finalizar somente P0/F42, configurar Evolution/Coolify e parar. A checklist original abaixo é preservada como contrato de trabalho; estado e evidência reais estão no ledger e no registro de execução. Não interpretar a autorização como liberação de F01–F41.

## Resultado

Link em revisão humana gera aviso no grupo operacional configurado; administrador autorizado aprova ou recusa com motivo; painel e WhatsApp usam a mesma decisão transacional; auditoria e efeitos permanecem consistentes. Mensagens operacionais adicionais são classificadas e não criam comandos financeiros ou administrativos irrestritos.

Destino informado e configuração segura estão na spec. Não copiar chave para este plano. /manager não é rota de envio. Confirmar base, versão, nome da instância e mecanismo de autenticação em D44 antes de criar adapter.

## Arquivos existentes a reutilizar

- `backend/src/http/controllers/@Links/routes.ts`: aviso atual de fila e submissão.
- `backend/src/http/controllers/@Admin/moderation.ts`: extrair a orquestração, preservando contratos/erros.
- `backend/src/use-cases/@Moderation/decide-case.ts`: regras puras.
- `backend/src/use-cases/@Moderation/settle-submission.ts` e `backend/src/use-cases/@Links/settle-proposed-text.ts`: encaminhamento para decisão humana.
- `backend/src/repositories/moderation-cases-repository.ts`, links-repository, audit-logs-repository e stores de aquisição.
- `backend/src/use-cases/@Payments/payment-jobs.ts`: aviso de estorno.
- `backend/src/worker.ts`, `adapters/queues`, `env/index.ts`, `observability/logger.ts` e `backend/prisma/schema.prisma`.
- `backend/src/app.ts`: auth e CSRF; exceção de webhook não remove proteção global.
- `frontend/src/components/domain/panel.tsx`, admin-nav e controles de `ui/input.tsx`/`ui/button.tsx`.
- Harness E2E, Playwright, Vitest e CI existentes.

## Caminhos propostos

- `backend/src/domain/notifications/operational-notification.ts`: contrato de evento/canal e política de entrega.
- `backend/src/domain/notifications/evolution-command.ts`: parser estrito e validação de contexto, sem IA.
- `backend/src/adapters/notifications/evolution-notifier.ts`: HTTP de saída isolado.
- `backend/src/use-cases/@Moderation/resolve-human-review.ts`: orquestração única painel/grupo, se não houver equivalente.
- `backend/src/use-cases/@Notifications/process-operational-event.ts`: entrega/reconciliação.
- `backend/src/http/controllers/@Integrations/evolution.ts`: recebimento autenticado, normalização e ACK durável.
- `backend/src/http/controllers/@Admin/integrations.ts`: estado/retry/configuração não secreta.
- Repository durável de outbox/receipt e migration aditiva somente depois de comparar modelos atuais.
- `frontend/src/app/admin/integracoes/page.tsx` e composição evolution-integration apenas se necessário; manter painel de moderação como local de decisão alternativa.

Não criar esses caminhos por conveniência se um módulo atual já cumprir a responsabilidade. Separar adapter novo porque Evolution é um canal externo; não duplicar regras de moderação nem criar outro serviço.

## F42-S0 Escopo contratos e revisão de reutilização

**Entrada:** autorização futura para implementar; G00 mínimo de testes isolados.  
**Saída:** D44–D47 resolvidas para o MVP, contratos redigidos e operadores definidos.

- [x] Confirmar versão, conexão, base e nome de instância sem adivinhar pelo formato das sequências recebidas.
- [x] Identificar credenciais por finalidade com o responsável; armazenar apenas no mecanismo de segredos aprovado, fora de código e relatórios.
- [x] Confirmar autenticação verificável de webhook; registrar formato de headers/payload com valores sintéticos.
- [x] Definir mapeamento de remetente PN/LID para ADMIN ativo, conta dedicada do bot e política de revogação.
- [x] Congelar gramática APROVAR/RECUSAR e formato de ação; decidir TTL/ref/retention/retry e entrega incerta.
- [x] Mapear cada entrada real na fila humana, contestação e proposta de texto e os efeitos da decisão atual.
- [x] Delimitar os alertas do MVP e opcionais conforme spec. Não implementar F06/F07/F02 dentro da integração.
- [x] Revisar os 26 ACs; desenhar tela admin com tokens e componentes atuais.
- [x] Fixar o formato comprovado: comandos de texto e painel. Botões permanecem desligados; não foi presumido suporte interativo no grupo.
- [x] Não bloquear esta feature por preços/subdomínio ou decisões das demais features.

## F42-S1 Testes unitários e componentes antes da regra

**Saída:** cenários específicos escritos e falhas esperadas documentadas, sem conexão com Evolution real.

- [x] Escrever F42-U01–U08: gramática, motivo, referências, remetentes, eventos próprios, templates, retry e dedup.
- [x] Fixture de referência válida/vencida/usada e snapshot antigo; relógio fixo, sem espera real.
- [x] Fixture com segredo/telefone/e-mail sentinela; provar ausência na saída do template/log.
- [x] Escrever teste de permissão com ADMIN ativo, USER, BANNED, revogado, outro tenant e LID desconhecido.
- [x] Componentes: status desconectado, backlog, tentativa incerta, confirmação de retry e toggle desabilitado por falta de configuração.
- [x] Separar falhas do harness de falhas do produto; validar asserções de comportamento na suíte aprovada e registrar tentativas com falha sem contá-las como aceite.

Comandos futuros no backend: `npx vitest run src/domain/notifications/evolution-command.spec.ts src/domain/notifications/operational-notification.spec.ts`.  
Frontend: `npx vitest run src/components/domain/evolution-integration.test.tsx`.

## F42-S2 Dados invariantes e migração

**Saída:** outbox/receipt/ref/operador persistentes e provas de concorrência em banco descartável.

- [x] Comparar conceitos da spec com schema atual; definir delta mínimo e constraints por tenant/ocorrência/instância/messageId.
- [x] Definir tokenHash imprevisível, vínculo à versão e consumo atômico sem reutilizar VerificationCode.
- [x] Proteger vínculo de operador e verificar role/status atuais, sem copiar ADMIN para um token permanente de bot.
- [x] Extrair a decisão composta do controller para serviço compartilhado. Link, caso/proposta, referência, AuditLog e intenção dos efeitos confirmam juntos.
- [x] Fazer controller do painel e entrada WhatsApp consumirem esse serviço; não alterar semântica de rejeição de texto publicado.
- [x] Definir outbox transacional e mecanismo de recuperação caso enqueue falhe após commit.
- [x] Definir estados de entrega PENDING/PROCESSING/SENT/RETRY/UNCERTAIN/DEAD conforme contrato aprovado; SENT não é prova de leitura por humano.
- [x] Migration expand/backfill/validate, índices de backlog e retenção; ensaio de reversão sem reset de banco.
- [x] Provar disputa painel/grupo e rollback com falha antes do commit.

## F42-S3 Regra de negócio API e jobs

**Saída:** integração local contra stub, mantendo domínio e painel funcionais com Evolution indisponível.

- [x] Implementar porta de canal e adapter HTTP de saída com base e destinatário apenas da configuração confiável.
- [x] Persistir ocorrência na revisão humana inicial, contestação e proposta de texto; não duplicar aviso em retry nem pedir decisão depois de autoaprovação.
- [x] Registrar webhook autenticado com limite de corpo, schema allowlist, normalização do participante e receipt durável antes do ACK.
- [x] Ignorar eventos próprios, históricos/alterados não admitidos e outros grupos; não persistir conversa inteira.
- [x] Validar operador, tenant, grupo, instância, referência, validade, snapshot e estado atual antes de decidir.
- [x] Executar APPROVE/REJECT pelo serviço compartilhado e exigir motivo; manter campos/versão aprovados conforme caso de uso.
- [x] Worker entrega com backoff/retry limitado, trata timeout ambíguo e recupera pendências após reinício.
- [x] Emitir confirmação de decisão após commit, incluindo decisão pelo painel; falha da confirmação não reverte decisão.
- [x] Conectar falha de estorno ao evento durável; não usar array em memória como garantia externa.
- [x] Desconexão/dead-letter ficam no painel; envio de recuperação é agregado e não recursivo.
- [x] Sem suporte comprovado a autenticação/identidade, manter ação remota desligada e rota segura ao painel.

## F42-S4 Interface composição e estados

**Saída:** administrador gerencia estado/entrega sem ver segredos e conserva moderação no painel.

- [x] Adicionar área Integrações conforme navegação atual, com status, último erro, tentativas e backlog.
- [x] Exibir instância/grupo configurados de forma administrativa e sem valor de API key; diferenciar não configurado, desligado, conectado, falhando e entrega incerta.
- [x] Restringir alteração/retry a ADMIN com CSRF, versão esperada e auditoria.
- [x] Confirmar retry manual em entrega incerta; não oferecer botão de reenviar indiscriminado.
- [x] Manter o painel de moderação como alternativa e mostrar decisão/conflito real entre canais.
- [x] Mensagens do grupo com ações em texto e acesso ao painel; botões como melhoria condicional após prova.
- [x] Estados de loading/erro/sucesso, foco, teclado, mobile e capturas com dados fictícios.

## F42-S5 Integração contrato persistência e falhas

**Saída:** F42-I01–I03, PG01–PG03, R01–R03 e T01–T26 verificados com estado final.

- [x] Exercitar webhook sem auth, auth inválida, assinatura/cabeçalho conforme D44, evento forjado e grupo/instância errados.
- [x] Enviar duplicatas/replays e provar uma decisão e efeitos únicos; não afirmar que provedor garante mensagem exatamente uma vez.
- [x] Rebaixar/revogar ADMIN após envio e antes de comando; referência válida não contorna autorização atual.
- [x] Disputar painel e grupo no PostgreSQL; erro antes de commit não consome referência nem deixa caso/link parcialmente atualizados.
- [x] Testar nova submissão, contestação e alteração de texto via dispatch tipado.
- [x] Reiniciar worker com outbox pendente; simular 500, timeout após aceite, desconexão e fila esgotada.
- [x] Confirmar e-mail/funil/embedding e slots conforme contrato legado com regressão de moderação.
- [x] Testar alerta de estorno e prevenção de loop de alertas.
- [x] Registrar PG na lista explícita test:pg/CI; testes Redis no ambiente isolado sem porta compartilhada com produção.

Comandos futuros no backend: `npx vitest run src/http/evolution-webhook.http.spec.ts`; com PG_SPECS=1 e banco descartável, `npx vitest run --no-file-parallelism src/http/evolution-moderation.pg.spec.ts`; suíte Redis com variáveis do harness apropriadas.

## F42-S6 E2E Playwright e revisão visual

**Saída:** E01–E07 passam no harness real da aplicação com Evolution simulada.

- [x] Incluir evolution-moderation.spec.ts no testMatch/projetos apropriados; conferir descoberta antes de rodar.
- [x] Estender serve.mjs com stub Evolution isolado e exemplos redigidos, sem credenciais reais.
- [x] Não mockar API/BFF/banco internos; forçar decisão ADMIN pela fixture de moderação, não pelo DOM.
- [x] Submeter, observar mensagem capturada, simular webhook aprovado e verificar publicação após reload.
- [x] Repetir recusa com/sem motivo, edição pendente, replay e corrida com painel.
- [x] Simular indisponibilidade: submissão e decisão no painel continuam funcionando.
- [x] Testar negados/segredos no DOM e rede; desktop 1280×720 e mobile 390×844, teclado e estados de erro.
- [x] Guardar relatório, trace e screenshots de falhas. Ensaio real M01 separado, realizado com autorização posterior, iPhone e operador final 8391; resultado no registro de execução.

Comando futuro no frontend, após registro do projeto:  
`npx playwright test e2e/evolution-moderation.spec.ts --project=features`.  
Mobile: o mesmo arquivo em features-mobile quando esse projeto existir.

## F42-S7 Regressão rollout e fechamento auditável

**Saída:** ACs com evidência, fluxo legado preservado e decisão de ativação registrada.

- [x] Rodar lint/typecheck/unit/build e regressões de moderação, submissão, edição, contestação, pagamentos/estorno, sessão, CSRF e tenant.
- [x] Confirmar testes descobertos no CI com contagens/skip e evidências reais.
- [x] Revisar observabilidade sem segredos: revisão->aviso, aviso->decisão, backlog, falhas, replays recusados e entrega incerta.
- [x] Manter toggles separados de notificação e ação remota; habilitar para o ensaio controlado após D44–D47 e consolidar ativação após M01.
- [x] Rotação/revogação e rollback: desligar comandos/envio, manter fila e painel, preservar auditoria; não repetir entregas incertas automaticamente.
- [x] Atualizar ledger F42-S0–S7 e matriz T01–T26 com commit/ambiente/comando/resultado/evidência e responsável.
- [x] Liberar o gate de prioridade para F01–F41 apenas depois de F42 aceita, ou mediante alteração explícita da prioridade pelo usuário.

## Aceitação final

- [x] F42-AC01–F42-AC26 rastreados, sem casos ignorados indevidamente.
- [x] Toda decisão por grupo atribuída a ADMIN ativo real e auditada.
- [x] Falha externa não bloqueia nem resolve submissão automaticamente.
- [x] Nenhuma credencial real em arquivos, frontend, logs, teste ou relatório.
- [x] Painel e grupo usam a mesma regra de decisão e fronteira transacional.
- [x] Instância, versão e comandos verificados em ensaio real. Botões: não aplicável ao MVP, permanecem desligados e sem suporte presumido.
- [x] Fonte, ordem, roadmap, inventário, matriz e evidências consistentes.

**Registro inicial histórico:** implementação ainda não autorizada no planejamento. **Registro atual:** responsável técnico Codex; implementação e testes locais executados, fechamento/rollout acompanhados no [registro de execução](../execucao-f42.md).


## Extensão de 17/10/2026 — páginas e convites no WhatsApp

Por novo pedido expresso, revisões humanas de F09/F12 e suas contestações também usam o grupo Evolution configurado, a mesma autorização por operador ADMIN e a mesma operação de decisão do painel. O aviso citado identifica a versão exata; expiração, substituição e contestação invalidam mensagens anteriores. Decisão e registro do aviso de confirmação são atômicos, sem alterar aprovação automática, regras de segurança ou cobrança. Avisos ganham símbolos distintos por evento e mantêm seções curtas.

Contrato, critérios, limites, evidências e resultados no [complemento da implementação](../../frontend-profissional/revisao-paginas-convites.md#complemento-autorizado--aprovação-pelo-whatsapp).
