# Quantidade flexível e recuperação de agendas — 31/10/2026

O bloqueio de 24 existia no formulário, seleção manual, validação de entrada, distribuição de horários e contrato de resposta da IA. A amostra única de 120 candidatos também podia deixar a agenda incompleta mesmo havendo mais produtos no catálogo.

O pedido automático aceita inteiros seguros e só aloca horários depois de consultar os produtos disponíveis. A quantidade efetiva respeita produtos físicos distintos e os minutos existentes no período: um horário por minuto, sem a restrição anterior de 15 minutos. A seleção manual aceita até a capacidade física de um dia (1.440 horários); o servidor valida também o período específico. Não há aumento de vazão do provedor.

A análise percorre blocos de até 120 candidatos, com aliases e resposta limitados por chamada, até alcançar a quantidade ou esgotar o catálogo disponível. Quando a análise natalina fica curta, pode acrescentar produtos distintos do núcleo natalino já reconhecido, sem inventar relação para complementos. A origem OPENAI inclui composições com apoio da IA e complemento conservador. Lease e expiração da preparação são renovadas a cada progresso. Identidades persistidas continuam permitindo retomada; READY válidas e ofertas já agendadas não são preparadas novamente; a reconferência explícita de READY expiradas está descrita no complemento abaixo.

Falhas podem ser verificadas individualmente ou em conjunto dentro da agenda original, inclusive APPROVED. Durante a recuperação, os envios PENDING permanecem ativos. As recuperadas ficam READY e exigem novo aceite; a aprovação incremental afeta somente essas ofertas. A predominância contextual considera também o núcleo já aprovado. Para horários passados, o administrador escolhe outro período futuro no mesmo dia; a busca de horários preserva slots ocupados. O sistema não muda automaticamente a data. Se não houver tempo naquele dia, uma nova data exige nova agenda. A leitura apresenta horários cronológicos e preserva identidades/posições originais.

Verificações executadas:

- Backend: lint, typecheck e build; 22 testes de domínio/adapter/HTTP.
- Frontend: lint e typecheck; 35 testes do planejador e descoberta.
- PostgreSQL descartável: 21 testes da agenda, incluindo 60 ofertas, pedido de 1 milhão limitado aos produtos disponíveis, recuperação incremental, continuidade dos envios previamente aceitos, ausência de envio das recuperadas sem aceite, colisões, predominância do núcleo e ordem cronológica após reagendamento. Banco próprio criado/removido sem imprimir credenciais.
- Playwright Test: seis casos aprovados entre desktop e mobile; repetição dos dois casos de recuperação após ajuste de cópia também aprovada. O setup fez build Next e usou somente servidores isolados 3016/4458. Axe não encontrou violações nos diálogos examinados; fluxo por teclado e ausência de overflow foram verificados. Capturas de 60 ofertas e recuperação no mobile foram inspecionadas visualmente.

As provas de UI usam BFF simulado; as de PostgreSQL usam providers de catálogo/link simulados. Elas não comprovam disponibilidade de anúncios, prazo de entrega ou chamadas reais da IA/lojas. A indexação Graphify integrada e a publicação ficam sob a etapa final do agente principal. Sem dependências, migração, commit, push ou deploy nesta etapa. Reversão de código: restaurar os arquivos deste patch; dados existentes não tiveram migração nem reescrita.

## Complemento temporal antes da publicação

Reprodução RED com PostgreSQL e relógio simulado somente para Date: o administrador escolheu 30 ofertas para hoje às 09:02; cada preparação consumiu dez segundos e a prévia terminou às 09:05. As 30 ofertas estavam READY, mas o aceite retornava 409 e mandava gerar outro lote. Também foi testado o atraso de três minutos na análise da IA antes da persistência das identidades.

A distribuição inicial agora usa o instante de criação da solicitação já validada. Ao terminar a preparação, somente horários de READY ainda não aceitas que ficaram passados/próximos são ajustados para horários futuros livres, com dois minutos para revisão, dentro do período escolhido e sem alterar IDs, posições, mensagens ou ofertas PENDING/QUEUED. A prévia explica o ajuste. Se faltar espaço, a prévia e os produtos permanecem no lote; Escolher outro período ajusta somente seus horários e conserva o aceite explícito. O ajuste não estende a validade de quinze minutos. Janelas específicas ficam na metadata do snapshot e são respeitadas também após reconferência lenta, sem ampliação silenciosa até o término original do dia.

READY expiradas exigem a ação explícita Conferir ofertas expiradas: somente elas voltam a BUILDING, passam novamente pelos providers e precisam de novo aceite. O servidor rejeita essa reconferência enquanto a revisão estiver válida e nunca inclui PENDING/SENT. Uma transição de UI entre ajuste de READY e verificação de falhas foi coberta para impedir envio ao endpoint errado.

A seleção conservadora também completa análise curta de Pets usando apenas candidatos já aprovados pelo filtro estrito de espécie e exclusão de infantis; segmentos desconhecidos continuam sem esse complemento. O adapter aceita até 120 resultados válidos por chamada mesmo quando faltam menos ofertas, corta ao restante e mantém a predominância do núcleo e a validação de todos os IDs/contextos recebidos.

Verificação deste complemento: 25 testes backend de domínio/adapter/HTTP, 26 testes PostgreSQL e 38 testes frontend aprovados; lint/typecheck em ambos os pacotes e build backend aprovados. O Playwright realizou build Next e aprovou oito casos entre desktop e mobile, incluindo ajuste de READY, reconferência de expiradas e aceite separado; o ajuste final de transição de modo foi coberto pelo teste unitário posterior. Axe não encontrou violações nos diálogos examinados, o teclado/foco foi exercitado e a captura mobile da revisão expirada foi inspecionada. Banco descartável próprio foi removido; nenhuma chamada real de produto, IA ou envio foi feita por este complemento.


## Integração final

Verificação do agente principal: 25 testes PostgreSQL (agenda e Shopee) e 1039 testes gerais backend passaram, um ignorado, com banco/Redis próprios descartáveis e migrations atuais. Frontend: 157 testes de afiliados passaram; lint, typecheck e build aprovados. Após ajuste de foco/cancelamento, os 11 testes do planejador e dois E2E de recuperação desktop/mobile passaram novamente. A navegação Voltar à revisão não submete a conferência.

Playwright MCP em contexto isolado confirmou formulário com 60 sem atributo max24, recuperação no mesmo batch, nenhuma aprovação automática e ausência de overflow mobile. Reproduziu campos de recuperação fora da área visível em lista longa; foco passou ao primeiro horário e tornou o formulário visível após a correção. Capturas finais com reduced-motion foram inspecionadas. Dados de UI são fixtures.

Em produção, antes deste deploy, o pedido operacional de completar as agendas foi concluído por API e transação auditada: Pets19+5 e Natal9+15, ambos APPROVED com24produtos distintos para01/11,10–21h. Horários/textos existentes preservados; intervalos Pets28–29min e Natal27–41min. As48fotos responderamHTTP com conteúdoimage/*. Três prévias temporárias foram incorporadas e canceladas, sem envio imediato. Uma oferta sem preço único foi substituída por outra confirmada; não se relaxou a validação de preço. Evidência em output/fill-tomorrow-24/.

Publicação e SHA finais serão registrados após conclusão da esteira. Nenhuma migração ou dependência nova neste ajuste.


## Revisão de preparação demorada e expiração

Uma regressão PostgreSQL reproduziu30ofertas preparando por dez segundos cada: o início escolhido dois minutos à frente já tinha passado ao concluir, e a aprovação exigia outro lote. Outra prova avançou o relógio durante a análise IA antes da persistência. O planejamento inicial agora usa o instante da solicitação validada; ao finalizar, somente READY atrasadas são reposicionadas em horários futuros livres, preservando dia/janela, IDs, mensagem e PENDING. Janela insuficiente mantém a revisão e permite escolher outro período no mesmo lote. Metadata scheduleWindow preserva o limite específico escolhido em recuperação.

POST reschedule altera somente horários de READY com revisão vigente. POST recheck-ready, com confirmação explícita, reconfere somente READY expiradas e exige novo aceite; não renova validade sem conferir os produtos e não toca mensagens já aprovadas. Produtos Pets já elegíveis também completam uma análise curta. Resposta de IA maior que o restante solicitado é validada e cortada, sem perder o bloco inteiro.

Nova validação integrada do agente principal:30testesPG de agenda/Shopee e1042testes gerais backend passaram, um ignorado. Os38testes frontend afetados passaram; lint/typecheck e build foram concluídos. Playwright MCP confirmou bloqueio da revisão expirada, rechecagem e mudança de período no mesmo ID de lote, mensagem preservada no ajuste, nenhuma aprovação automática, foco correto e ausência de overflow em320px/fonte200%. Providers da UI são simulados. Revisão independente identificou e corrigiu alternância de modo READY/falhas, coberta por regressão.

A correção CAS da Shopee já foi validada em produção no release86bf9b00: duas prévias simultâneas da mesma conta retornaramHTTP200, produto confirmado e imagem, sem chamada de envio. Evidência em output/fill-tomorrow-24/live-concurrent-result.json. A publicação final do ajuste temporal será registrada após a esteira.
