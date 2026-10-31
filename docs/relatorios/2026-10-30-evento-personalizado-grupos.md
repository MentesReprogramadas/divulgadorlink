# Cadastro de grupos: evento personalizado

Por pedido expresso, o INITIAL_LEAD passa a enviar SubmitGroupRegistration com action_source website, após registro persistido e autorizado. QualifiedGroupLead continua reservado ao ingresso real confirmado. Preservados event_id, event_time, atribuição, hash do telefone, retry e idempotência. Sem nova migração, biblioteca ou pixel no navegador; nenhuma alteração visual na LP.

O padrão conferido da campanha de divulgação é OUTCOME_SALES, OFFSITE_CONVERSIONS, WEBSITE, pixel2981954672158122 e evento personalizado SubmitLink (custom_event_type OTHER / custom_event_str SubmitLink). As campanhas de grupos serão preparadas nesse mesmo padrão com SubmitGroupRegistration e orçamento30/dia cada, sem alterar divulgação.

Validação: teste de contrato observado falhar com Lead e passar com SubmitGroupRegistration;31 testes em6 arquivos de domínio, HTTP e PostgreSQL passaram em container descartável local, removido ao terminar. Backend lint, typecheck e build passaram. Revisão independente somente leitura não achou bloqueantes. Graphify incremental code-only:40 arquivos processados,1740 reutilizados,8939 nós/32121 arestas, sem API/LLM. CSS, configuração Meta e runtime não são comprovados pelo grafo.

Meta Test Events recebeu SubmitGroupRegistration, HTTP200/events_received1, sem dados reais. Teste não fabrica adesão nem comprova atribuição. Publicação e troca de campanhas dependem da conclusão do CI e conferência do emissor real. Não reprocessar eventos SENT: nomes distintos não se deduplicam entre si. Conferir fila sem pendências antes do deploy. Conversões históricas Lead não serão renomeadas.

Reversão: restaurar o nome Lead no emissor e os conjuntos de formulário Lead, em troca ordenada sem sobrepor orçamento. Nunca reutilizar SubmitLink para o cadastro de grupos.
