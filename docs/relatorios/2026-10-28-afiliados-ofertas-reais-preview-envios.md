# Ofertas reais, prévia única e envios — 28/10/2026

Implementação em `C:/VSCODE/temlink-afiliados`, branch existente `codex/afiliados-whatsapp`, baseada na main. Alterações anteriores preservadas; sem commit, push, deploy ou importação dos grupos/instâncias do VHG.

## Entrega

- Criar segmentação cria a descoberta na mesma transação e inicia a coleta em segundo plano. OpenAI expande o tema; primeiro coleta a página inicial de cada termo, depois avança as páginas de cada termo em rodízio. O estado por termo é persistido. Aquecimento com intervalos de 30 segundos; ciclos normais de 15 minutos. Navegação manual preserva o progresso automático.
- Paginação por termo e página da fonte, contador/barra pelo agendamento real, atualização forçada com prioridade e intervalo mínimo. Páginas ainda não coletadas recebem solicitação única e acompanhamento. Total da fonte não é apresentado como total de anúncios disponíveis. Recusa de paginação pelo ML aparece como limite do provedor.
- Avaliação separa desconto informado, mediana do histórico próprio e reputação confirmada. Política v1: reputação verde e desconto informado de pelo menos 10%, ou queda de pelo menos 5% contra mediana de três dias anteriores distintos numa janela de 30 dias. Sem evidência suficiente fica em revisão. Preço anterior e histórico não são inventados. Motivos aparecem para selecionados, revisáveis e descartados, incluindo rejeições técnicas.
- Abrir produto revalida cotação, gera link e título e apresenta foto, mensagem exata e destinos. Cancelar não cria oferta. Confirmar salva oferta/distribuição/decisão numa transação idempotente. Token assinado vincula operador, tenant, segmentação, conta, preços, mensagem e grupos; validade de cinco minutos. Mudança de destinos exige outra prévia.
- Descarte e restauração persistem por segmentação; produto já enviado não volta a ser elegível por restauração.
- Envio inicia após commit e o worker drena afiliados a cada segundo, preservando leases, rotação, cooldown de três segundos por conta e tratamento manual de resultado incerto. Não há promessa de entrega instantânea nem garantia do provedor contra duplicação.
- Envios em cards paginados com contagens, detalhes e snapshot imutável de produto/mensagem. Legado sem snapshot não usa o preço atual da oferta como preço do envio antigo. Auditoria e resolução de falhas continuam disponíveis.
- OpenAI gpt-4o-mini usa saída estruturada, timeout de 12 segundos, cache de 24 horas e fallback. Títulos removem repetições e usam palavras originais/conectivos, sem atributos novos, humor ou urgência. Chave somente no servidor; nenhuma credencial registrada neste relatório.

## Verificação executada

- Frontend global: 903 testes passaram antes dos últimos ajustes de página fria/label; rodada dirigida final de discovery: 17/17, além dos testes de overview. Lint global e typecheck app/E2E passaram; checks dirigidos repetidos após esses ajustes. Build final passou.
- Backend global: 185 arquivos / 849 testes passaram, incluindo provas Pix com PostgreSQL/Redis exclusivos de regressão. Rodada afiliados/HTTP/PostgreSQL/ponte: 8 arquivos / 76 testes passaram. Ajuste final do prompt: 3/3 testes, typecheck, lint e build passaram.
- Playwright Test: 12/12 cenários UI com fixtures e 4/4 cenários integrados desktop/mobile passaram. A integração usa API, PostgreSQL e provedor loopback isolados. Verifica descoberta após criar segmentação antes de abrir Ofertas, sem POST de refresh/page/busca; prévia/cancelamento sem persistência, confirmação, entrega em até 15 segundos e histórico após reload. Fixture sem timer de drenagem de entregas comprova o início após confirmação.
- Revisão independente estática final sem achados materiais após vincular destinos e congelar dados do histórico. Não substitui testes de execução.
- Playwright MCP em contexto isolado com login local real: foto carregada sob CSP normal, cotação e novo link real, prévia desktop/mobile, Escape com retorno de foco e zoom CSS de 200%, sem overflow horizontal. Prévia cancelada; nenhum botão Enviar real foi acionado. A foto real no modal mobile carregou com largura natural de 1200px.
- Consulta real por termos expandidos encontrou kit de quatro capas de almofada: R$47,43, preço anterior informado R$59,90, reputação 5_green, desconto informado 20,82%. Histórico próprio insuficiente foi mostrado separadamente. Chaveiro R$15,07 sem preço anterior ficou em revisão. São observações desta execução, não preços garantidos.
- Consulta real do catálogo aceitou offsets 60/80/100, além das primeiras três páginas; recusou 120/180 com HTTP400. Não foi inferido um limite universal. Recusas não foram contornadas.
- OpenAI real respondeu com termos pertinentes a Natal e título objetivo. Após corrigir o prompt para não substituir palavras por sinônimos, o título repetitivo do chaveiro virou `Chaveiro de Natal sortimento`, aceito pelo validador. Chamadas reais foram autorizadas no pedido; testes usam chave vazia e fixtures.
- Migrations até `20261029012000_discovery_term_pages` aplicadas apenas em `affiliate_ops` e no banco descartável de regressão, no PostgreSQL local identificado da porta5638. Prisma gerado; dados locais existentes preservados.
- Graphify incremental code-only: 8521 nós/30706 relações, 56 arquivos reprocessados/1630 reutilizados. Sem LLM/API ou envio de código para indexação. `git diff --check` passou; configuração privada e ponte permanecem ignoradas.

## Fontes e limites

[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat) fundamenta saída estruturada. Documentação oficial do ML de reputação e catálogo foi consultada via Context7 e confirmada por respostas reais; página pública de reputação respondeu403 na ferramenta web. Não se inferiu cobertura completa de busca, histórico externo ou garantia de afiliação/comissão.

Histórico próprio começa agora; são necessários dias de observação para comprovar queda. Falta de vendedor válido nas fichas do catálogo continua possível e é explicada; expansão de termos não torna toda ficha negociável. Sessões, permissões e disponibilidade dependem dos provedores. Não foi enviado WhatsApp real nesta validação.

Painel permanece em `http://localhost:3016/admin/afiliados`, API3351, worker e ponte4452. Banco/Redis/servidor simulados de regressão são separados da operação real local e removidos ao encerrar os testes.

Reversão: retirar somente os deltas desta etapa, mantendo a árvore anterior. Tabelas novas podem permanecer inertes; não apagar histórico/contas/grupos ou reverter migrations com dados sem backup. Nenhuma publicação foi feita.
