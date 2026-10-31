# Agendas: repetição por dia e substituição de produtos

O planejamento usava o histórico global de pendências, enquanto a aprovação também comparava produtos de agendas em outras datas. Isso podia bloquear o aceite com “Este produto já está em outra agenda pendente”. A consulta agora reserva identidades físicas por tenant, segmento e data de Brasília. Uma agenda pendente em outra data não bloqueia a seleção nem o aceite. Envios diretos pendentes ou incertos conservam sua proteção; o fluxo de envio imediato não foi alterado.

Antes da análise da IA, a seleção exclui produtos reservados naquele dia. Se outra agenda reservar um produto durante a revisão, o aceite encaminha substitutos para preparação no lote original e exige nova revisão. Isso também atende seleções manuais: a escolha conflitante é substituída, apresentada e confirmada antes de entrar na fila.

Ao verificar novamente uma falha, o sistema tenta conferir o produto original. Se falhar de novo, analisa alternativas elegíveis e prepara outro produto na mesma entrada, posição e horário. O histórico de identidades tentadas evita ciclos, incluindo anúncios equivalentes e produtos cancelados que ainda ocupam a chave única do lote. Produtos já aceitos não mudam. Sem alternativa elegível, a falha permanece recuperável com motivo explícito. O ajuste temporal existente continua limitado à janela escolhida quando a preparação ultrapassa horários ainda não aceitos.

O aceite de produtos recuperados/substituídos compara reviewRevision: hash das entradas READY, produtos, horários e prévias assinadas. Uma aba antiga não consegue aceitar um substituto que ainda não carregou. Links, preços, tenant, administrador, destinos e vínculo de afiliado continuam validados. Substituições geram auditoria; chamadas de análise renovam o lease entre blocos.

## Evidências

- Regressões RED anteriores à implementação e 45 testes direcionados PostgreSQL/HTTP aprovados: datas distintas, virada 23:59/00:00 em Brasília, identidades equivalentes, tenant/segmento, seleção manual, falha repetida, posição preservada, colisão com item cancelado, renovação de lease e revisão antiga bloqueada.
- Backend: lint, typecheck e build aprovados pelo implementador. O agente principal executou mais 39 testes PostgreSQL (35 da agenda e quatro da Shopee) e a suíte geral: 1.045 testes aprovados, um ignorado. Banco e Redis próprios descartáveis, com migrations atuais, foram removidos ao terminar.
- Frontend: lint/typecheck aprovados; 162 testes de afiliados/domínio aprovados.
- Playwright Test: oito casos desktop/mobile aprovados; dois casos de substituição repetidos após vínculo da revisão, também aprovados. O setup concluiu build Next. Axe não encontrou violações nos diálogos examinados.
- Playwright MCP em contexto local isolado: produto substituto visível no mesmo lote, somente uma chamada inicial de aceite, revisão anterior identificada e ausência de overflow em 390px. Captura inspecionada. Providers e dados de UI são fixtures, sem envio real de mensagens.
- Graphify incremental local code-only: 16 arquivos reprocessados, 1.784 reutilizados; 9.074 nós e 32.687 relações. Sem API/LLM na indexação. Código e testes confirmam as relações; grafo não certifica runtime.

A leitura de produção confirmou que o lote indicado cmvwvnclv001ysa01zpv3yjve já estava CANCELLED. Esse estado foi preservado; nenhuma agenda foi reativada ou aprovada nessa investigação. Evidência local em output/same-day-replacements/before.json. Falhas reais incluem anúncio sem preço único e vínculo de vendedor/link não confirmado; essas proteções continuam e passam a permitir a substituição solicitada.

Nenhuma dependência ou migração adicionada. Reversão: reverter o commit desta correção pelo fluxo normal de publicação. Não apagar auditoria nem reativar entradas canceladas. Disponibilidade de alternativas depende do catálogo e da confirmação atual das lojas; os testes não garantem disponibilidade futura.
