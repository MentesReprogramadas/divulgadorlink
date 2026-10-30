# Convite independente da instância — 30/10/2026

Pedido: permitir entrada pelo convite salvo mesmo quando a conta de automação estiver desconectada e publicar em produção. Base isolada d8374eef; alterações paralelas de Pets/Shopee/políticas preservadas fora deste lote.

GET destino e POST entrada agora usam o convite HTTPS validado já persistido quando a ocupação registrada indica vaga. Antes de devolver o destino, revalidam tenant, grupo ativo, versão do grupo, segmentação ativa e versão da segmentação; GET também exige REDIRECT. Sem convite válido ou com lotação registrada, mantêm o fluxo existente de consulta/expansão. Não modifica autenticação, consentimento, métricas, participantes nem cria grupo por ocupação desconhecida.

TDD: dois casos falharam antes (GET null e POST503 com instância desativada); passaram após correção.58 testes direcionados passaram, incluindo integração HTTP/PostgreSQL em container descartável próprio e82 migrações existentes. Lint, tipos e build backend aprovados. Sem migração nova ou mudança frontend. CI completo e verificação pública pós-deploy ainda pendentes neste registro inicial.

Operação: painel autenticado mostrou Principal01 conectada; vínculo Natal salvo com sucesso. Grupos Natal#03 e Pets#1 já apontam para a mesma conexão lógica. Não foi criada outra conexão ou outro grupo e não foi enviada mensagem/oferta.

Limites: lotação é a última leitura sincronizada; WhatsApp aplica capacidade/permissões atuais. Convite revogado diretamente no WhatsApp exige sincronização/atualização do convite salvo; desconexão não permite descobrir revogação remotamente. A instância segue necessária para sincronização, envio, medição por webhook e expansão. Reversão de código: reverter este lote pelo CI; nenhuma reversão de dados necessária.
