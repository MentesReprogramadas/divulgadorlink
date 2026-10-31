# Agenda diária de afiliados e mensagem curta

Implementação solicitada e publicação autorizada pelo usuário em 31/10/2026. Checkout isolado; alterações anteriores de relatórios e grafo preservadas, sem incluir no commit do produto.

## Entrega

- Mensagem começa pelo produto; preço com fogo; desconto antes da economia; CTA `Compre aqui 👇`. Removidas chamada acima do título e ressalva final. Notas manuais explícitas continuam disponíveis. Regenerar exige mudar o título efetivamente usado na mensagem; alterar somente a chamada interna não produz falso sucesso. Até duas tentativas validadas, preservando fatos e medidas.
- `Planejar o dia`: dia e período em Brasília, até 24 ofertas por lote, até 30 dias de antecedência. Padrão de 12 ofertas das 09h às 21h, editável; não é alegação de uma cadência universal de outros grupos. Slots com intervalo mínimo de 15 minutos.
- Uma chamada OpenAI recebe somente IDs, títulos públicos, preços, descontos e contagens de envios. Só aceita IDs existentes, sem repetição. Descontos vêm primeiro; dentro dessa prioridade, produtos menos enviados e sequência proposta pela IA. Sem IA, regras locais completam o lote, incluindo produtos sem desconto. Fontes desconectadas ou com credenciais inválidas não entram na seleção automática.
- Seleção manual por checkbox, mantida entre páginas, com barra flutuante. Prévia compacta com imagem, título, preço, percentual, envios anteriores e mensagem/link expandíveis. Permite remover itens antes de aceitar. Mostra mensagens do lote por grupo, total e volume no dia incluindo outros lotes/distribuições.
- Rascunho persistente, construção em segundo plano com lease e retomada pelo worker, validade de 15 minutos. Nenhuma entrega nasce antes do aceite explícito. Reabrir rascunhos e consultar andamento pela Agenda. Cancelamento interrompe pendências; preserva entregas confirmadas, em envio ou incertas.
- No horário, o worker reconfirma preço, desconto, anúncio, foto, configuração, ator e grupos. Diferenças bloqueiam o item para revisão. Mensagem aprovada permanece exata. Broadcasts usam chave idempotente por item e fila existente, sem envio duplicado em retomada. Tolerância de 30 minutos, inclusive após entrar na fila; depois disso a oferta expira.
- Produtos enviados continuam na lista, inclusive depois de expirar o cache de coleta. Badge conta distribuições com ao menos uma entrega `SENT`, não quantidade de grupos nem mero aceite. Pendências/incertezas aparecem separadamente e impedem distribuição concorrente. Uma nova revisão permite reenvio intencional após concluir pendências; prévias anteriores à última aprovação são recusadas.

## Implementação e revisão

Migração aditiva `20261031010000_affiliate_schedule_batches`: lotes, itens, leases, índices, FKs compostas por tenant e `AffiliateOffer.itemId`, com preenchimento do histórico existente a partir das decisões. Não modifica mensagens/distribuições já aprovadas.

Identidade, URL e data consultada ficam também no snapshot imutável de cada distribuição. A migração complementar `20261031011000_affiliate_product_snapshot_identity` preenche esses metadados nos snapshots anteriores, sem alterar mensagem ou preços. Assim, editar o anúncio de uma oferta antiga não troca o produto do histórico nem apaga sua contagem. Trocar URL manualmente limpa a identidade herdada na oferta editável. Regressões PostgreSQL cobrem ambos os caminhos.

Reutilizados geração de link, validação de produto, prévia assinada, fingerprint de grupos e `approveAffiliateBroadcast`/`runAffiliateDeliveries`. Não foram adicionadas dependências ou alterados limites comerciais, permissões ou contratos de envio incerto.

Revisão independente encontrou diferença entre catálogo e anúncio do ML. O worker agora preserva `catalogId` do snapshot; histórico recupera `/p/{catalogId}` do URL. Regressão usa catálogo `MLB999999` distinto dos anúncios. Leitura final do revisor não encontrou bloqueios restantes.

Referência de interação: [Buffer, fila por horários](https://support.buffer.com/en-us/articles/setting-up-your-timezones-and-posting-schedules-P4iSag90Fl). Fundamenta fila e horários configuráveis, sem atribuir frequência de grupos concorrentes. Preservada identidade Ondas/Glass e componentes de diálogo, botão e imagem existentes.

## Verificação local

- Backend: lint, typecheck e build passaram. Suíte completa executada com PostgreSQL e Redis descartáveis: 1009 testes passaram, 1 ignorado. Após os refinamentos finais, suítes afetadas foram repetidas, incluindo adapter de IA e revisão: 23 testes passaram. O CI executará novamente a suíte integral do commit.
- PostgreSQL: 159 testes afetados passaram; última regressão específica do lote passou com 5 testes, incluindo seleção conjunta Shopee/ML, preço alterado, destinatários alterados, expiração, lease interrompido, corrida entre workers, idempotência, cancelamento, contagem e reenvio. Nenhum WhatsApp real: porta de envio em memória.
- Frontend: lint, typecheck e build passaram; 988 testes completos passaram. Depois, 31 testes afetados e a suíte específica da agenda foram repetidos conforme as alterações.
- Playwright Test: 40 jornadas desktop/mobile passaram. O novo fluxo foi repetido separadamente nos dois viewports após ajustar a densidade. Axe do diálogo sem violações nesses testes; isto não certifica acessibilidade integral.
- Playwright MCP: inspeção real da versão compilada em 1440×900, 390×844 e 320×844 com texto a 200%. Página e diálogo sem overflow horizontal; foto pública real Shopee decodificada com 1024 px. Escape restaurou foco em `Planejar o dia`. Fixtures de agenda/contagens locais; nenhuma aprovação externa ou envio real. Capturas em `docs/frontend-profissional/evidencias/afiliados-agenda-2026-10-31/` foram inspecionadas.
- Detector Impeccable sem achados nos arquivos consultados. Grafo atualizado incrementalmente, apenas código, sem LLM/API: 9020 nós e 32449 relações na passagem registrada. Grafo não valida SQL, CSS ou runtime.

O primeiro ensaio integral encontrou banco antigo na configuração padrão das provas Pix. As provas foram repetidas em banco/Redis próprios migrados e passaram; fixtures anteriores foram limpas pelos scripts, sem registros `prove-*`/`pixexp-*` remanescentes no banco consultado. Nenhum banco alheio foi migrado ou container alheio encerrado.

## Publicação e reversão

Publicar somente pelo pipeline integral do main. Registrar SHA, CI, migração e smoke depois do deploy. Teste de produção limitado a consulta/prévia e criação/cancelamento de rascunho: não aceitar lote nem chamar envio para provar implantação.

Reversão: cancelar pendências aprovadas antes de voltar ao binário anterior; manter tabelas/colunas aditivas e dados de auditoria. Não remover mensagens entregues ou repetir envios incertos. Horário é entrada na fila, não garantia de chegada simultânea; disponibilidade de catálogo e WhatsApp continua necessária.
