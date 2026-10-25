# Home: catálogo e exploração de direções

## Scope and visitor mode

- `/`: catálogo público, modo **Operate**. Tarefa: buscar interesse, comparar entradas, abrir detalhes ou salvar favorito.
- `/dev/homes` e suas variantes: galeria interna, modo **Experience**. Tarefa: experimentar e comparar várias homes completas antes de escolher uma direção.
- `/dev/home-preview`: exploração Liquid Glass anterior, também interna. Não define o material das outras alternativas.

## Content and constraints

A exploração original ampliou a galeria para 32 variantes. A contagem de entrega e a validação ficam nos testes e no registro de implementação, não neste brief. Conteúdo e contagens da galeria são fictícios e comparáveis entre opções; fotografias são ilustrativas. Busca e favoritos do mock não demonstram integração com dados reais.

Em 23/10/2026, após escolher e aprofundar Ondas, o usuário aprovou explicitamente sua promoção para todas as telas e componentes reais da branch `codex/roadmap-f37-testes`. Esse pedido posterior autoriza a migração da home pública e do tema da plataforma, preservando contratos e jornadas. Não transforma as outras direções em temas globais nem permite substituir dados reais pelos mocks. Páginas personalizadas, campanhas, mídia kit e prévias mantêm a paleta e a composição do proprietário.

## Direction contract

**THESIS:** a galeria preserva múltiplas composições comparáveis; Ondas é a direção escolhida e promovida à plataforma. A home real sustenta busca, comparação de links e distinção explícita entre conteúdo orgânico e patrocinado.

**OWN-WORLD:** preservar navy, turquesa, Outfit e Source Sans 3. A plataforma aplica o material Ondas registrado em DESIGN.md e nos tokens atuais; materiais e paletas das alternativas não escolhidas continuam no escopo experimental de cada uma.

**STORY:** o visitante reconhece o catálogo, encontra um assunto e compara entradas; o usuário do laboratório compara composições com o mesmo conteúdo ilustrativo.

**FIRST VIEWPORT:** na home Ondas, hero centralizado, título objetivo em uma linha e sem placa de fundo, busca em vidro e ondas decorativas. O catálogo usa capas opcionais acima do texto, sem sobreposição; ausentes ou com erro, não reservam região vazia. Patrocinados são distinguíveis e identificados. A galeria continua permitindo comparar alternativas completas.

**FORM:** a decisão atual deriva da preview implementada de Ondas e da aprovação explícita de promoção, sem novo torneio visual. O registro histórico da galeria permanece: concept-seed do Impeccable não foi executado porque o pedido original exigia múltiplas alternativas comparáveis; não se alegou indisponibilidade da ferramenta. O Taste original usou seed `22102026` e proposta `Accent ladder`, como insumo de exploração, não como aprovação autônoma. O backend de anexos agora é real, opcional e moderado, com vínculo próprio ao Link; Sobre reutiliza a descrição existente.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved decisions

Direção e promoção à home real estão decididas no pedido de 23/10/2026. Permanecem sob validação a implementação completa, os estados e as jornadas de todas as rotas. Consultar `docs/superpowers/ondas-route-matrix.csv` e os relatórios atuais; aprovação da direção não é aprovação automática das 95 telas.

Revisões antigas de acabamento com escopo restrito não aprovam a migração atual nem a galeria inteira. DESIGN.md e o sidecar foram atualizados a partir da implementação compartilhada Ondas. Fontes: PRODUCT.md, spec e plano de `docs/superpowers`, código em `features/home-directions`, `features/home-preview`, catálogo real e shell compartilhado.
