# Lotes de ofertas: falhas, Pets e Agenda — 31/10/2026

## Problemas observados e mudanças

Buscas genéricas de brinquedos, expandidas a partir de termos de Pets, retornavam itens infantis. A busca preserva agora o contexto animal; descoberta, preparação, revisão e entrega verificam o tema. Rascunhos antigos escondem itens fora do tema; aprovação cancela esses itens, sem modificar envios já confirmados. Rações de filhotes com idade em meses continuam elegíveis.

A foto já existia no snapshot bruto de itens que falharam, mas a leitura exigia uma prévia completa e a ocultava. A revisão agora preserva foto e preço da coleta, identificados como não conferidos. Erros de catálogo conservam a mensagem útil; preparação serial com até três tentativas somente para erros transitórios 429/502/503 reduz rajadas. Não foi possível reconstruir o status HTTP histórico de cada falha.

O modal permite Verificar novamente por item e Verificar falhas em conjunto. Rascunhos futuros reconferem somente FAILED, preservando identidade, horários e snapshots READY. Falhas de agendas aprovadas ou horários passados abrem novo rascunho manual com horário futuro para revisão explícita; não reabrem envios já aprovados.

Agenda possui aba própria, cards e paginação de oito lotes, com estado vazio, erro e nova tentativa. Consultas são isoladas por tenant e segmentação. A seta de Segmentações mantém 16px de espaço interno no mobile. Foco retorna ao botão Abrir agenda mesmo após atualização dos cards.

Título integral da origem segue no snapshot assinado e no histórico, separado do título de apresentação. Isso evita bloquear um produto animal quando o título curto perde a espécie. Tokens antigos permanecem legíveis.

## Incidente de envio e autorização

Consulta de produção em 31/10 às 11:27 BRT encontrou os dois lotes aprovados para 01/11: Pets com 17 PENDING e 7 FAILED; Natal com 19 PENDING e 5 FAILED. Nenhuma oferta pendente estava vencida. Worker ativo, sem reinícios; ausência de erro em logs não prova entrega. O formulário abria amanhã por padrão. Agora abre hoje com início futuro arredondado, ou amanhã às 09h após o período das 21h, e mostra Hoje/Amanhã mais data absoluta.

O usuário autorizou antecipar os dois lotes para hoje após publicação, mantendo intervalos. Script operacional separado, com dry-run, baseline de IDs/estados/configuração/snapshots, transação atômica, exclusão de itens fora do tema Pets, auditoria e idempotência. FAILED, mensagens e preços não são promovidos ou alterados. Resultado efetivo será registrado após publicação; ainda não aplicado neste registro inicial.

## Verificações locais

- Backend: lint, typecheck e build passaram; suíte completa com infraestrutura própria: 210 arquivos, 1013 testes passaram, um ignorado. Após teste adicional de paginação, 62 testes focados passaram.
- PostgreSQL de regressão próprio: dez arquivos e 101 testes passaram, incluindo concorrência, tenant, retries, integridade dos snapshots, filtros e entrega por adaptador falso.
- Frontend: lint e typecheck passaram; 152 testes em 23 arquivos passaram.
- Playwright Test: 42 cenários da jornada completa passaram em desktop/mobile; primeira passagem tinha somente uma expectativa de caminho BFF incorreta no teste novo, corrigida; repetição específica e a suíte final completa passaram nos dois tamanhos.
- Playwright MCP em contexto isolado: foto real pública decodificada com 1024px, sem overflow em 390px ou 320px com fonte 200%; foco retornou a Abrir agenda; espaço interno da seta de voltar 16px. Capturas inspecionadas. Fixtures não enviam WhatsApp real. Extração final Graphify local, code-only e incremental, sem LLM/API, atualizou o índice após as mudanças.
- Revisão independente encontrou três problemas (título curto, consulta AGENDA inválida e idade de filhotes); todos corrigidos e rechecados. Revisão do script operacional foi somente leitura.

## Limites e reversão

A conferência continua dependendo dos catálogos externos. Mudanças de preço, grupos ou configuração bloqueiam a oferta para nova revisão; estado incerto não é reenviado automaticamente. Limites de lote existentes (24 ofertas, intervalo mínimo 15 minutos) permanecem e agora são explicados no formulário.

Reversão do código por revert do commit desta entrega. A antecipação operacional deve ser consultada pelo audit log; nunca executar deslocamento reverso sobre ofertas já em fila ou confirmadas. Não houve disparo real nas verificações locais. Relatórios e grafo antigos não integram o commit do produto.
