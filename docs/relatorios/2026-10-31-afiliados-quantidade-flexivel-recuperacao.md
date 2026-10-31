# Quantidade flexível e recuperação de agendas — 31/10/2026

O bloqueio de 24 existia no formulário, seleção manual, validação de entrada, distribuição de horários e contrato de resposta da IA. A amostra única de 120 candidatos também podia deixar a agenda incompleta mesmo havendo mais produtos no catálogo.

O pedido automático aceita inteiros seguros e só aloca horários depois de consultar os produtos disponíveis. A quantidade efetiva respeita produtos físicos distintos e os minutos existentes no período: um horário por minuto, sem a restrição anterior de 15 minutos. A seleção manual aceita até a capacidade física de um dia (1.440 horários); o servidor valida também o período específico. Não há aumento de vazão do provedor.

A análise percorre blocos de até 120 candidatos, com aliases e resposta limitados por chamada, até alcançar a quantidade ou esgotar o catálogo disponível. Quando a análise natalina fica curta, pode acrescentar produtos distintos do núcleo natalino já reconhecido, sem inventar relação para complementos. A origem OPENAI inclui composições com apoio da IA e complemento conservador. Lease e expiração da preparação são renovadas a cada progresso. Identidades persistidas continuam permitindo retomada; READY e ofertas já agendadas não são preparadas novamente.

Falhas podem ser verificadas individualmente ou em conjunto dentro da agenda original, inclusive APPROVED. Durante a recuperação, os envios PENDING permanecem ativos. As recuperadas ficam READY e exigem novo aceite; a aprovação incremental afeta somente essas ofertas. A predominância contextual considera também o núcleo já aprovado. Para horários passados, o administrador escolhe outro período futuro no mesmo dia; a busca de horários preserva slots ocupados. O sistema não muda automaticamente a data. Se não houver tempo naquele dia, uma nova data exige nova agenda. A leitura apresenta horários cronológicos e preserva identidades/posições originais.

Verificações executadas:

- Backend: lint, typecheck e build; 22 testes de domínio/adapter/HTTP.
- Frontend: lint e typecheck; 35 testes do planejador e descoberta.
- PostgreSQL descartável: 21 testes da agenda, incluindo 60 ofertas, pedido de 1 milhão limitado aos produtos disponíveis, recuperação incremental, continuidade dos envios previamente aceitos, ausência de envio das recuperadas sem aceite, colisões, predominância do núcleo e ordem cronológica após reagendamento. Banco próprio criado/removido sem imprimir credenciais.
- Playwright Test: seis casos aprovados entre desktop e mobile; repetição dos dois casos de recuperação após ajuste de cópia também aprovada. O setup fez build Next e usou somente servidores isolados 3016/4458. Axe não encontrou violações nos diálogos examinados; fluxo por teclado e ausência de overflow foram verificados. Capturas de 60 ofertas e recuperação no mobile foram inspecionadas visualmente.

As provas de UI usam BFF simulado; as de PostgreSQL usam providers de catálogo/link simulados. Elas não comprovam disponibilidade de anúncios, prazo de entrega ou chamadas reais da IA/lojas. A indexação Graphify integrada e a publicação ficam sob a etapa final do agente principal. Sem dependências, migração, commit, push ou deploy nesta etapa. Reversão de código: restaurar os arquivos deste patch; dados existentes não tiveram migração nem reescrita.


## Integração final

Verificação do agente principal: 25 testes PostgreSQL (agenda e Shopee) e 1039 testes gerais backend passaram, um ignorado, com banco/Redis próprios descartáveis e migrations atuais. Frontend: 157 testes de afiliados passaram; lint, typecheck e build aprovados. Após ajuste de foco/cancelamento, os 11 testes do planejador e dois E2E de recuperação desktop/mobile passaram novamente. A navegação Voltar à revisão não submete a conferência.

Playwright MCP em contexto isolado confirmou formulário com 60 sem atributo max24, recuperação no mesmo batch, nenhuma aprovação automática e ausência de overflow mobile. Reproduziu campos de recuperação fora da área visível em lista longa; foco passou ao primeiro horário e tornou o formulário visível após a correção. Capturas finais com reduced-motion foram inspecionadas. Dados de UI são fixtures.

Em produção, antes deste deploy, o pedido operacional de completar as agendas foi concluído por API e transação auditada: Pets19+5 e Natal9+15, ambos APPROVED com24produtos distintos para01/11,10–21h. Horários/textos existentes preservados; intervalos Pets28–29min e Natal27–41min. As48fotos responderamHTTP com conteúdoimage/*. Três prévias temporárias foram incorporadas e canceladas, sem envio imediato. Uma oferta sem preço único foi substituída por outra confirmada; não se relaxou a validação de preço. Evidência em output/fill-tomorrow-24/.

Publicação e SHA finais serão registrados após conclusão da esteira. Nenhuma migração ou dependência nova neste ajuste.
