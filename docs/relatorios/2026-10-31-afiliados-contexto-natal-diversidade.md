# Contexto de Natal, diversidade e chamadas — 31/10/2026

## Diagnóstico confirmado

Leitura autorizada dos lotes deixados pelo usuário: o rascunho Natal `cmvwkuzcq0037oa01jbpltwml` tinha 24 entradas, com 10 repetições de produto entre anúncios diferentes; 14 produtos distintos, dos quais somente 2 natalinos e 12 possíveis presentes. O lote aprovado de Pets para 01/11, `cmvwkt0m8000soa01n8r80y3a`, tinha quatro repetições entre 24 entradas (areia com sufixos comerciais e ração). IDs distintos escapavam da deduplicação anterior. Ambos foram apenas lidos durante a implementação.

## Mudanças

- Identidade compara catálogo e nome normalizado, neutralizando sufixos de anúncio e diferenças como 3kg/3 kg. Preserva modelo, medidas e associação número/unidade/quantidade: 2m com 3 unidades difere de 3m com 2 unidades. Agrupamento indexado evita comparar quadraticamente o catálogo inteiro.
- O histórico de anúncios equivalentes soma campanhas confirmadas. Família com pendência não entra como produto novo. A aprovação revalida equivalências entre rascunhos sob os bloqueios existentes; o worker verifica repetição antes de reconferir o anúncio.
- Planejamento automático usa análise semântica de nome/termos do segmento e produtos, em qualquer segmento. A IA escolhe a quantidade, sequência e composição, classificando núcleo e complementos com justificativa e enquadramento (tema, presente ou complemento). Cerca de 70% é referência de prompt, nunca quota fixa; a composição pode ser integralmente temática. O servidor exige predominância do núcleo, preserva exclusões de Pets e não aceita IDs desconhecidos ou repetidos. Não há lista fechada de categorias natalinas na aceitação da análise.
- A antiga opção de presentes e o limite de 20% foram substituídos pelo pedido posterior do usuário. O campo opcional legado continua aceito para compatibilidade de configurações/idempotência, sem governar a composição nova. UI explica a composição automática e mostra o total real de itens do tema/complementos.
- Sem IA válida, seleção conservadora pelo catálogo, desconto e histórico, identificada como RULES. Não inventa relações para preencher quantidade. Após falhas, complementos excedentes são retirados somente se o núcleo perder predominância; aprovação confere novamente após remoções do administrador.
- IA de copy recebe o contexto escolhido para cada produto. Presente externo ao tema recebe chamada de presente; item complementar pode fazer referência à rotina/contexto sem ser forçado a presente. Contexto explícito prevalece sobre heurísticas legadas. A chamada fica acima do nome objetivo; mantém preço, desconto, foto, link e CTA curto. Validação factual do nome e vocabulário das chamadas permanece.
- Flag opcional assinada habilita a chamada nas novas mensagens. Tokens e mensagens já aprovados sem a flag continuam usando o texto antigo, coberto por regressão de agendamento/worker. Nova conferência pode produzir novo texto, que exige revisão e aceite.
- Seleção manual mantém o anúncio escolhido, mesmo se outro vendedor equivalente tiver melhor posição no catálogo; rejeita selecionar o mesmo produto duas vezes.
- Pet de pelúcia representando um pássaro não é tratado automaticamente como brinquedo para animais: exige destinatário pet explícito nessa categoria.

## Validação

A etapa anterior de deduplicação e chamadas passou pelos testes backend/frontend e jornada de afiliados. A adaptação contextual posterior passou novamente em lint/typecheck/build backend e frontend. Suíte geral backend com infraestrutura local descartável: 211 arquivos e 1025 testes passaram, um ignorado. PostgreSQL final: 17 testes de agenda passaram. Frontend: 8 testes do planejador e 2 cenários Playwright Test desktop/mobile passaram. A primeira tentativa geral sem configurar a infraestrutura Pix falhou; repetição com banco e Redis próprios e migrações aplicadas passou. Recursos próprios removidos ao final.

Regressões novas incluem composições com quantidades diferentes, segmento Yoga (tapete/bloco e garrafa complementar), presentes não previstos em regex (chocolates), exclusão de infantil em Pets, preservação de COMPANION para ceia, redução após falhas, remoção de núcleo antes da aprovação e mensagem assinada legada sem chamada. Revisão independente encontrou e corrigiu duas sobras da política anterior: whitelist de Natal e heurística que sobrescrevia contexto explícito.

Playwright MCP em contexto isolado confirmou composição automática sem checkbox, foto pública com 800px, chamada antes do produto, ausência de overflow em 390px e em 320px/fonte200%, e retorno de foco ao botão Planejar o dia. Capturas inspecionadas; preços/links de fixture sintéticos, sem WhatsApp real nos testes. O reparo remoto em dry-run confirmou quatro duplicados e um item fora do tema em Pets, com 19 remanescentes. Nova revisão Natal deve ter análise OPENAI válida antes de substituir a anterior.

Sem alteração de dependências, lockfiles, permissões ou limites de lote. Teste de template mobile foi corrigido para medir somente um card visível e mensurável, preservando a comparação final de menos de um pixel; caso real passou três vezes no ambiente isolado.

## Produção e limites

Publicação e reparo dos lotes serão registrados após a esteira finalizar. O reparo mantém as mensagens já aprovadas; cancelamentos serão limitados a duplicatas ou itens fora do tema, sem alterar horários dos itens preservados. O rascunho Natal será substituído somente após existir uma revisão nova válida, sem aprovação ou envio automáticos.

Equivalência usa dados de catálogo e nomes normalizados; não é comparação visual ou identificação universal de produtos com nomes inteiramente diferentes. Catálogos e IA podem falhar; a revisão apresenta a quantidade pronta e utiliza chamada neutra quando a IA não retorna copy válida. Não há garantia de descontos futuros ou entrega de todos os horários do dia.

Reversão do código por revert do commit desta entrega. Não reenviar ou reativar cancelamentos operacionais sem nova revisão do estado e das pendências. Grafo atualizado de forma incremental e code-only, sem LLM/API; relatórios e artefatos antigos foram preservados fora do commit.


Complemento de conferência: limite de presentes recalculado sobre ofertas READY após falhas de preparação; mudança de contexto entre cache e catálogo bloqueia o item; aprovação revalida a proporção caso itens natalinos tenham sido removidos. A seleção manual continua explícita. 23 testes PostgreSQL afetados passaram, incluindo três regressões novas; typecheck, lint e build passaram após o complemento. Revisão independente não encontrou novo problema importante nesse patch.


A esteira `41221726002` teve uma falha preexistente em F16-E03 de modelos de página mobile: `boundingBox()` retornou null e o teste acessou height. Capturas de loading e conteúdo foram inspecionadas. A conta de ações retornou 403 (admin necessário) ao pedir repetição isolada do job. O teste agora aguarda card visível, mede dimensões positivas pelo DOM e mantém a comparação final menor que 1px sem retry dessa comparação. Rede, conflito de versão e foco em 320px permanecem cobertos. O cenário completo passou três vezes consecutivas em infraestrutura própria com offset107 e run-id exclusivo; typecheck e lint passaram. Nenhuma tela ou regra comercial de modelos foi alterada. Revisão independente confirmou que as asserções de layout não foram enfraquecidas.
