# Contexto de Natal, diversidade e chamadas — 31/10/2026

## Diagnóstico confirmado

Leitura autorizada dos lotes deixados pelo usuário: o rascunho Natal `cmvwkuzcq0037oa01jbpltwml` tinha 24 entradas, com 10 repetições de produto entre anúncios diferentes; 14 produtos distintos, dos quais somente 2 natalinos e 12 possíveis presentes. O lote aprovado de Pets para 01/11, `cmvwkt0m8000soa01n8r80y3a`, tinha quatro repetições entre 24 entradas (areia com sufixos comerciais e ração). IDs distintos escapavam da deduplicação anterior. Ambos foram apenas lidos durante a implementação.

## Mudanças

- Identidade compara catálogo e nome normalizado, neutralizando sufixos de anúncio e diferenças como 3kg/3 kg. Preserva modelo, medidas e associação número/unidade/quantidade: 2m com 3 unidades difere de 3m com 2 unidades. Agrupamento indexado evita comparar quadraticamente o catálogo inteiro.
- O histórico de anúncios equivalentes soma campanhas confirmadas. Família com pendência não entra como produto novo. A aprovação revalida equivalências entre rascunhos sob os bloqueios existentes; o worker verifica repetição antes de reconferir o anúncio.
- Planejamento automático de Natal usa produtos natalinos por padrão. Opção explícita de presentes limita as exceções a 20%, intercaladas e com variedade de categorias. Um fone ou tênis com Natal no SEO continua classificado como presente. Sem produtos suficientes, a quantidade diminui e a revisão explica o motivo.
- IA recebe o segmento, termos e finalidade da chamada. Presentes externos ao tema são apresentados como opção de presente para o Natal. Produtos nativos mantêm contexto de Natal. As novas prévias incluem a chamada acima do produto, preservando preço, desconto, foto, link e CTA curto.
- Flag opcional assinada habilita a chamada nas novas mensagens. Tokens e mensagens já aprovados sem a flag continuam usando o texto antigo, coberto por regressão de agendamento/worker. Nova conferência pode produzir novo texto, que exige revisão e aceite.
- Seleção manual mantém o anúncio escolhido, mesmo se outro vendedor equivalente tiver melhor posição no catálogo; rejeita selecionar o mesmo produto duas vezes.
- Pet de pelúcia representando um pássaro não é tratado automaticamente como brinquedo para animais: exige destinatário pet explícito nessa categoria.

## Validação

Backend lint, typecheck e build passaram. Suíte geral local durante a implementação: 211 arquivos e 1021 testes passaram, um ignorado. Verificação final focada: 91 testes passaram; PostgreSQL final: 104 testes em dez arquivos passaram, incluindo a mensagem legada assinada. CI registrado após conclusão. Testes cobrem equivalência, modelos/medidas/quantidades diferentes, categorias de presente, limites, seleção manual, bloqueio entre rascunhos e mensagem assinada legada.

Frontend lint e typecheck passaram; 150 testes de afiliados passaram. Playwright Test: 42 cenários existentes passaram; os dois novos cenários desktop/mobile passaram após corrigir a fixture da integração configurada. Build Next concluído pelo servidor isolado.

Inspeção Playwright MCP em contexto isolado: Natal exclusivo por padrão; opção envia includeGiftIdeas=true; chamada aparece acima do produto; foto pública de 800px decodificada; sem overflow mobile390 ou320 com fonte200%; foco retorna a Planejar o dia. Capturas inspecionadas. Preço e link das fixtures são sintéticos; nenhum WhatsApp real foi disparado nos testes.

Revisão independente identificou e permitiu corrigir seleção manual de vendedor, unidades equivalentes, associação número/unidade e categorias/pendências entre rascunhos. Não houve alteração de dependências, lockfiles, permissões ou limites de lote.

## Produção e limites

Publicação e reparo dos lotes serão registrados após a esteira finalizar. O reparo mantém as mensagens já aprovadas; cancelamentos serão limitados a duplicatas ou itens fora do tema, sem alterar horários dos itens preservados. O rascunho Natal será substituído somente após existir uma revisão nova válida, sem aprovação ou envio automáticos.

Equivalência usa dados de catálogo e nomes normalizados; não é comparação visual ou identificação universal de produtos com nomes inteiramente diferentes. Catálogos e IA podem falhar; a revisão apresenta a quantidade pronta e utiliza chamada neutra quando a IA não retorna copy válida. Não há garantia de descontos futuros ou entrega de todos os horários do dia.

Reversão do código por revert do commit desta entrega. Não reenviar ou reativar cancelamentos operacionais sem nova revisão do estado e das pendências. Grafo atualizado de forma incremental e code-only, sem LLM/API; relatórios e artefatos antigos foram preservados fora do commit.
