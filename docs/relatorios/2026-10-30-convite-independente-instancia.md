# Convite independente da instância — 30/10/2026

Pedido: permitir entrada pelo convite salvo mesmo quando a conta de automação estiver desconectada e publicar em produção. Base isolada d8374eef; alterações paralelas de Pets/Shopee/políticas preservadas fora deste lote.

GET destino e POST entrada agora usam o convite HTTPS validado já persistido quando a ocupação registrada indica vaga. Antes de devolver o destino, revalidam tenant, grupo ativo, versão do grupo, segmentação ativa e versão da segmentação; GET também exige REDIRECT. Sem convite válido ou com lotação registrada, mantêm o fluxo existente de consulta/expansão. Não modifica autenticação, consentimento, métricas, participantes nem cria grupo por ocupação desconhecida.

TDD: dois casos falharam antes (GET null e POST503 com instância desativada); passaram após correção.58 testes direcionados passaram, incluindo integração HTTP/PostgreSQL em container descartável próprio e82 migrações existentes. Lint, tipos e build backend aprovados. Sem migração nova ou mudança frontend. CI completo e verificação pública pós-deploy ainda pendentes neste registro inicial.

Operação: painel autenticado mostrou Principal01 conectada; vínculo Natal salvo com sucesso. Grupos Natal#03 e Pets#1 já apontam para a mesma conexão lógica. Não foi criada outra conexão ou outro grupo e não foi enviada mensagem/oferta.

Limites: lotação é a última leitura sincronizada; WhatsApp aplica capacidade/permissões atuais. Convite revogado diretamente no WhatsApp exige sincronização/atualização do convite salvo; desconexão não permite descobrir revogação remotamente. A instância segue necessária para sincronização, envio, medição por webhook e expansão. Reversão de código: reverter este lote pelo CI; nenhuma reversão de dados necessária.

## Reconexão e recriação autorizada de Pets

O usuário confirmou uso de outro número e depois autorizou recriar Pets com os participantes do Natal e os mesmos administradores. Principal01: estado open, conta presente e administradora no Natal#03; convite recuperável. Webhook habilitado, evento GROUP_PARTICIPANTS_UPDATE e compensação180 preservados. A consulta de metadados retornou intermitentemente HTTP404 com Error: rate-overlimit; não era ausência permanente do grupo. Não realizar consultas em lote a cada entrada.

Criado uma única vez TLA | Achadinhos Pet 🐶🐱 #2. Verificação real confirmou conjunto exato de5 participantes e3 administradores do Natal, anúncio somente por administradores, edição restrita, descrição igual à segmentação e foto aplicada. Novo grupo importado pelo painel administrativo na segmentação Pets/Principal01,5/1024; vínculo antigo#1 pausado sem excluir grupo ou histórico. Não foram enviadas ofertas ou mensagens manuais. A criação/adição/promotores gera os eventos de sistema normais do WhatsApp.

Grafo consultado antes e atualizado incrementalmente após integrar somente o ajuste local por cima das mudanças existentes:15 arquivos reprocessados,1732 reutilizados,8798 nós/31679 relações. Sem LLM/API/custo externo. Nove testes direcionados também passaram na árvore compartilhada com as políticas ainda não publicadas. CSS/Prisma/runtime não são comprovados pelo índice. O container descartável próprio de PostgreSQL foi encerrado e removido.

O novo Pets#2 ainda exige leitura inicial própria para medir entradas reais; não considerar os5 participantes administrativos copiados como conversões. A medição do Natal permanece com baseline anterior e webhook preservado. A lista temporária de telefones usada para copiar participantes/admins foi removida do estado operacional após verificar os conjuntos exatos; ficaram apenas identificadores dos grupos, contagens e etapas concluídas.

## Produção concluída

SHA a1376495acf5ab4b8a51ae5c7e865bdf9d96739f. CI https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/41087428208 concluído success,25/25 jobs aprovados, incluindo deploy. Bridge/API/web running:healthy; worker running:unknown sem probe próprio, todos fixados no mesmoSHA. Readiness API e health web HTTP200. Verificação HTTPS pública sem seguir destino e com DNT/GPC: Natal307/850ms e Pets307/802ms, ambos com convite HTTPS validado e comparado ao convite real do grupo esperado. Nenhum ingresso fictício ou oferta enviada. Não comprova abertura física do aplicativo no celular.

Painel de produção relido após deploy: Pets#2 ativo,Principal01,5/1024; Pets#1 pausado. A primeira recarga exibiu novamente o bug transitório Entre para continuar; a segunda recuperou sessão e dados sem novo login. Esse problema de sessão não foi alterado neste lote.
