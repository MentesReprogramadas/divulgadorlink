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
