# F29 — Evento na página

20/10/2026. Implementação local na branch codex/roadmap-f37-testes, após F28. Sem push/deploy. Decisão D31 registrada com alternativas; primeira rodada vermelha preservada em output/f29-domain-red.log (o contrato recusava o bloco ausente).

## Jornada e contrato

Minha página → Grupos e links → abrir grupo → Adicionar link → Evento. Três etapas: título/descrição/local; data/horário/fuso; inscrição/situação. DatePicker, Select e FormSteps existentes, conversão civilToUtc/utcToCivil da F14 e validação de horários inexistentes por fuso. Salvar altera o rascunho; Publicar usa a moderação F09 e seu histórico. Item URL recebe EventBlock opcional, sem duplicar título/destino e sem editor de página paralelo. O destino HTTPS informa inscrição ou detalhes externos; não há sistema de ingressos nem inscrição confirmada pelo clique.

A prévia e a página pública usam o mesmo EventCard, cores/fontes/cantos/botões do tema. Programado, data atualizada, cancelado e encerrado são estados distintos. Cancelado/encerrado removem a inscrição, mantendo informação e calendário. O agendamento de visibilidade F14 continua independente da data do evento. Estado de carregamento mantém o conteúdo e reserva as duas ações. Sem fonte, token ou dependência nova.

## Dados, publicação e calendário

Migration expansiva profile_items.event JSONB nullable, com constraint de objeto e tipo URL. Sem backfill: itens antigos seguem legíveis. ProfileInput valida formato, datas reais, ordem início/fim, fuso IANA, comprimento e tipo. ReconcileProfileEvents calcula remarcação contra a publicação e ignora previousStartsAt enviado pelo cliente. JSON de rascunho, publicação, histórico e exportação/importação preserva evento. Descrição/local entram na análise de conteúdo e na fila humana existente; pendência mantém versão anterior.

GET /api/v1/profiles/:slug/events/:eventId/calendar.ics usa a projeção pública real: tenant, publicação, conta ativa, idade, grupos/itens ocultos e agenda F14. Rascunho não fornece ICS público. Arquivo text/calendar, UID estável do item sem dados pessoais, SEQUENCE da revisão publicada e DTSTAMP do snapshot. Datas UTC com fuso preservado no bloco; escape de texto/CRLF e dobra em 75 octetos sem quebrar Unicode. Cancelar mantém UID e STATUS:CANCELLED. Baixar novamente é uma atualização manual; não promete sincronização automática de calendários externos. [Referência normativa RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html).

## Critérios e testes

| Critério | Oráculo executado |
| --- | --- |
| AC01/T01 | Datas impossíveis/fim anterior/fuso inválido recusados sem persistência; conversão São Paulo 12h → 15h UTC em E01; domínio/PG/componentes |
| AC02/T02 | Remarcação calculada pelo servidor, SEQUENCE incrementa, UID preservado; cancelamento informa estado e retira inscrição em E01 |
| AC03/T03 | Evento encerrado continua no público/ICS, sem ser marcado como link morto; cancelado/encerrado sem CTA em componente e PG |
| AC04/T04 | Link diz Ver inscrição, sem presença confirmada, sem ATTENDEE; calendário parseado no E2E, métricas de clique existentes sem novo evento de inscrição |

Frontend completo 442/442; domínio backend de perfis 90/90; regressão PostgreSQL em sete arquivos 52/52, abrangendo histórico, exportação, templates, busca e agendamento. Ampliação final de eventos: 5 PG + 4 domínio = 9/9, incluindo fila humana e evento encerrado. Não somar rodadas sobrepostas. Playwright final 7/7 nos dois viewports; build de produção pelo harness; lint/typecheck de ambos e build backend aprovados. Logs output/f29-*.log, relatório output/f29-playwright-final.json e manifesto evidencias-f29.json.

Primeira rodada E2E: 5/7; o teste navegava antes da confirmação da publicação, abortando a requisição. Corrigido para aguardar Perfil publicado, sem alterar o produto. Relatório inicial e traces preservados. Um teste PG tentou publicar uma página sem itens visíveis e foi recusado pela regra existente; corrigida a fixture com outro link visível, preservando a regra. Inspeção visual direta: card público mobile e modal desktop; reflow 320px/200%, teclado, falha de autosave recuperável sem perda e Axe no artigo público. Capturas em docs/frontend-profissional/evidencias/f29-2026-10-20.

## Operação e reversão

Nenhuma env nova. Aplicar migration antes da versão que lê event. Não reverter simplesmente para um parser antigo estrito depois que snapshots com evento forem publicados: manter leitores compatíveis e desabilitar somente a entrada de edição, preservando snapshots e histórico. Nenhuma migração destrutiva ou alteração no banco pessoal executada. Arquivo não usa fila/cron novo; cancelamento é uma publicação, e dados privados continuam privados.

S0–S6 comprovados localmente; S7/CI/liberação remota pendentes. Próxima sequência F32 → F33 → F10 e parada após F10, conforme autorização.

Commit de implementação: b100747814a9a988ad8382954dc3c613ee9d7de1.

## Ajuste de clareza — 2026-10-20

Pedido do usuário: esclarecer os campos e remover a ação de calendário ou substituí-la por Google Agenda. Escolha: remover a ação de calendário da interface para simplificar, sem adicionar integração externa. O endpoint ICS existente permanece compatível e coberto pelo E2E via requisição direta. “Onde acontece o evento?” orienta endereço físico ou plataforma online; “Link para participar ou se inscrever” informa o destino do botão “Acessar evento”. Etapa final: “Como participar”, avanço: “Definir acesso”. Validações, moderação, publicação, datas e fuso permanecem. Skeleton acompanha a única ação; cancelados e encerrados não reservam espaço de botões. Reversão: restaurar somente esta fatia de editor/card/testes/CSS, sem migration.

Validação do ajuste: `npm run test -- src/features/profile-events` (4/4), `npm run lint`, `npm run typecheck`, `npm run build` e Playwright `e2e/profile-events.spec.ts --project=features --project=features-mobile` (7/7 incluindo setup), com E2E_PORT_OFFSET=700 e E2E_RUN_ID=f29-clarity-20261020. Capturas event-editor/event-public desktop/mobile inspecionadas em frontend/test-results; teclado, autosave com erro, zoom 200% a 320px e axe cobertos pela suíte. Houve falhas intermitentes de inicialização API/worker no Windows; primeira rodada funcional 5/7 revelou resolução DNS do cliente HTTP de teste, corrigida usando fetch do navegador. Build inicial concorrente ao E2E falhou por tipos gerados removidos pelo setup; build final sequencial passou. Sem validação em aparelho físico, sem deploy e sem alteração no backend ou banco.

## Hierarquia do card e ação personalizada — 2026-10-20

Pedido: priorizar título, início, término, local, descrição e ação; retirar fuso e avisos de remarcação da exibição. Card mantém tema, centralização e estilo de botão da página. Datas usam lista de definição com rótulos Começa/Termina, data curta e horário em destaque; faixa estreita empilha as duas células. Cancelado/Encerrado continuam explícitos e retiram a ação. Eventos programados não exibem estado redundante. Fuso e histórico continuam no contrato para cálculo correto/compatibilidade, sem aparecer no card.

Texto do botão: campo obrigatório no editor, padrão Acessar evento, até 40 caracteres. Contrato JSON aceita buttonLabel opcional para manter eventos e versões antigos válidos; publicação e projeção preservam o campo. Moderação completa e comparação de alterações incluem o texto novo. Sem migration, integração ou dependência nova. Escolha de rótulo personalizado em vez de lista fechada atende ao pedido sem duplicar destinos. Reversão exige manter suporte ao campo no parser enquanto houver dados salvos; pode-se retirar o editor/visual novo conservando leitura compatível.

Referência complementar: [GOV.UK Summary list](https://design-system.service.gov.uk/components/summary-list/) fundamenta a relação semântica rótulo/valor (dl/dt/dd), sem copiar identidade visual. Refero não disponível nesta sessão; consulta à referência Eventbrite falhou e não foi usada como evidência visual. Visual validado pelo próprio card no tema existente, sem alegação de melhora de conversão.

Validação desta fatia: frontend 6/6 testes de componentes, backend 12/12 testes de evento/moderação, lint e typecheck em ambos os pacotes; build backend passou. Playwright desktop/mobile 7/7 incluindo setup após ajuste final de espaçamento (primeira captura identificou token inexistente, corrigido para space-4); axe, teclado, zoom 200% a 320px, autosave com erro, publicação, remarcação, cancelamento e persistência do botão personalizados cobertos. Build frontend comum falhou em coleta de páginas administrativas geradas; repetição isolada `TEMLINK_E2E_BUILD=1 npm run build` passou. Sem encerrar servidores locais. Capturas finais inspecionadas: [desktop](../frontend-profissional/evidencias/f29-card-2026-10-20/public-desktop.png), [mobile](../frontend-profissional/evidencias/f29-card-2026-10-20/public-mobile.png), [editor mobile](../frontend-profissional/evidencias/f29-card-2026-10-20/editor-mobile.png). Mobile é emulação Chromium, sem aparelho físico. Sem deploy ou commit.
