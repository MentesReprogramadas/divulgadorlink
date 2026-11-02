# Pets com variedade e planejamento entre marketplaces

O planejador aceitava uma análise válida formada apenas por ração, e o fallback completava pelo ranking de desconto. A expansão de Pets dependia das poucas sugestões da IA, sem garantir buscas de areia, comedouros, arranhadores, brinquedos ou higiene. A seleção também podia concentrar o dia em uma loja, mesmo havendo alternativas da outra.

## Comportamento implementado

- Pets amplo passa a pesquisar categorias de uso diferentes: areia, comedouros, arranhadores, brinquedos, banho/higiene, descanso, bebedouros, passeio, ração e petiscos. Espécies específicas preservam seu escopo; campanhas de produto específico não recebem uma expansão geral. Configurações antigas são recompostas de forma idempotente, sem apagar páginas ou agendas. A coleta existente aquece as buscas ainda sem primeira página.
- A listagem de Pets intercala categorias antes da paginação. O planejamento seleciona categorias disponíveis e distribui opções escassas ao longo do dia, preservando desconto e histórico dentro dos grupos elegíveis. Comedouros e areia Pipicat são reconhecidos mesmo sem repetir a palavra pet; produtos infantis e bebedouros humanos continuam excluídos.
- Todas as segmentações passam a considerar alternância entre Mercado Livre e Shopee. Amostras e pedidos à IA incluem os dois fornecedores. Famílias equivalentes mantêm um único anúncio; pendências físicas continuam bloqueando o produto inteiro no mesmo dia.
- A variedade de loja depende de pertinência: produtos Pets/natalinos reconhecidos e contextos avaliados pela IA podem compor a sequência. Um nome amplo, como Tecnologia, não é usado como prova literal de que qualquer produto serve. A análise adicional da loja sub-representada é limitada, renova o lease e não inventa relação se o modelo recusar as alternativas.
- Seleções manuais e agendas já aprovadas não são reescritas. Preço, vínculo de afiliado, fotografia, isolamento por tenant, confirmação e aceite da revisão continuam pelos caminhos existentes.

Não há obrigação de uma divisão fixa de lojas ou categorias. A quantidade depende das ofertas elegíveis, distintas e confirmadas. Sem alternativa pertinente em uma loja, o sistema usa o que estiver disponível; não inclui produto fora do segmento para preencher proporção.

## Validação

O agente principal executou 64 testes PostgreSQL de descoberta, agenda e Shopee, além da suíte geral backend: 1.080 aprovados, um ignorado. As provas persistidas incluem agendas Pets com seis categorias, alternância em Pets/Natal/Yoga, deduplicação, pendências e preservação do contexto. Os 38 testes focados de seleção/adaptador e 23 de coleta/classificação também foram aprovados; fazem parte da cobertura integrada, não uma contagem adicional de casos independentes. Lint, typecheck e build backend passaram.

A revisão independente encontrou e acompanhou a correção de três limites: expansão indevida de campanhas Pets específicas, seleção só de uma loja em segmento amplo sem termos específicos e seleção desequilibrada 11/1. As regressões cobrem análise adicional contextual, recusa do modelo, escassez de ofertas de uma loja e ausência de repetição dos IDs previamente analisados. Nenhum bloqueio concreto permaneceu na revisão final.

As primeiras execuções gerais foram interrompidas por indisponibilidade do Redis de fixture. A configuração Vitest fixa a porta 6380, por isso somente alterar a variável do runner não bastava. O Redis descartável final atendeu 6380 e 6407, com portas livres verificadas; a execução completa passou. Bancos próprios e Redis foram removidos ao terminar. A fixture PostgreSQL foi restituída ao estado parado em que se encontrava antes desta tarefa.

Fixtures de catálogo, IA e lojas não comprovam preço ou estoque real. Não foram enviados WhatsApps nem alteradas agendas de produção durante os testes. A leitura direta do catálogo de produção por SSH ficou indisponível por timeout de conexão; não se atribuiu a ela uma validação que não ocorreu. O conector Coolify respondeu com API/site saudáveis durante a investigação.

Nenhuma dependência, migração ou alteração visual foi adicionada. Reversão: reverter o commit desta mudança pelo fluxo normal da main; os lotes aprovados existentes não tiveram reescrita. Evidências em output/pets-variety/integrated.log, backend-build.log e graph-final.log, além de output/pets-day-plan/postgres.log.
