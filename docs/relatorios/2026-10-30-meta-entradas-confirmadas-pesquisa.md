# Campanhas e ingresso confirmado — pesquisa e validação

## Decisão do usuário

Em 30/10/2026 o usuário pediu otimização por entrada em grupo e autorizou identificação na LP com número de WhatsApp e aceite de mensuração. Isso substitui, para o percurso dos anúncios, a preferência anterior por nenhuma etapa de identificação. O convite público rápido continua disponível para outros usos.

## Evidências verificadas

- Campanhas existentes de Natal e Pets têm objetivo de Tráfego. Natal usa cliques; Pets usa visualizações da página. Orçamentos observados: Natal R$40/dia, Pets R$30/dia. Não inferir orçamento pelo nome antigo da campanha.
- Pixel 2981954672158122 recebe eventos de aquisição/publicação/cobrança do produto. Nenhum evento normal de ingresso em grupo estava disponível no início desta tarefa.
- LP Pets independente não possuía pixel, cookies de publicidade nem formulário. Webhook de participantes mantém medição agregada, sem identidade de navegador ou envio publicitário.
- Recepção CAPI testada com `test_event_code`, identidade sintética de domínio reservado `.invalid`, `GroupJoinConfirmed` e `action_source:chat`: HTTP200, events_received1. Não é participante real nem prova de atribuição/otimização.
- UI de criação de conversão personalizada mostrou apenas Site/Loja física como fonte. Não trocar a origem do ingresso para website para passar por essa limitação.
- Na campanha Leads pausada, local Site, apareceu **Maximizar o número de leads qualificados**, desabilitado até integrar o CRM. A interface exige eventos de formulário e qualificação no mesmo dataset.
- O guia CRM aberto pela própria conta instrui `action_source:system_generated`, `custom_data.event_source:crm` e `custom_data.lead_event_source` com nome do CRM. Pede estágio inicial e alterações de estágio. Lead ID gerado pela Meta é recomendado/opcional; identificador interno não substitui lead_id Meta.
- Endpoint `/group/participants` da Evolution instalada devolveu somente LIDs como identidade canônica dos dez participantes atuais dos dois grupos, mas contém alias **phoneNumber com JID PN explícito**. A correlação precisa desse alias, não da remoção de @lid.
- Pets ainda não tinha baseline de acompanhamento no inventário; Natal tinha READY. Ativação de Pets deve registrar os membros existentes como baseline, sem contá-los como aquisição.

## Modelo adotado

1. Cadastro consentido realmente realizado na LP: evento `Lead`, origem website, URL/UA reais e dados mínimos permitidos.
2. Webhook autenticado confirma a primeira entrada e o número corresponde ao cadastro anterior: estado CRM muda para qualificado. Evento `QualifiedGroupLead`, origem system_generated, `event_source:crm`, `lead_event_source:Tem Link Aqui` e `segment_id` opaco.
3. O evento de qualificação é uma transição real no CRM, não o mesmo evento chat com origem trocada. Não enviar em paralelo outro evento de ingresso para inflar resultados.
4. Sem aceite, participação permanece possível, sem contexto publicitário. Sem telefone/alias inequívoco, instante confiável ou correlação, não enviar qualificação.
5. Outbox durável, IDs estáveis e ordem inicial antes de qualificado; deduplicar reentregas/instâncias/reentradas. Dados cifrados até7d; recibo mínimo de deduplicação até90d.
6. Selecionar a meta de qualificação somente após a Meta validá-la nesta conta. Receber eventos, corresponder pessoas, atribuir ao anúncio e permitir otimização são verificações distintas.

## Campanhas preparadas

Objetivo não é editável nas campanhas atuais. Foram criadas campanhas Leads **pausadas** para preparar a migração, sem novo orçamento nem veiculação:

- Pets: 120248307980520106.
- Natal: 120248308027790106.
- Rascunho de conjunto Pets:120248307996550106; rascunho de anúncio:120248307996560106, ainda sem publicação.

Só substituir as antigas após configurar e verificar a meta correta, preservando os totais de orçamento e evitando campanhas antigas e novas consumirem em paralelo. Não chamar um evento de formulário, clique ou pedido de aprovação de entrada confirmada.

## Referências

- Meta/WhatsApp, otimização de mensagens individuais: https://whatsappbusiness.com/resources/resource-library/down-funnel-optimizations-whatsapp/ . Destino de mensagem individual não representa ingresso em grupo.
- Meta Blueprint atual: https://www.facebookblueprint.com/student/activity/603002-improve-lead-quality-with-meta-conversions-api-for-crm . Abrange formulários instantâneos e formulários no website; não generalizar a restrição antiga de Instant Forms.
- Guia CRM da conta, consultado na UI autenticada: https://eventsmanager.facebook.com/events_manager2/crm_implementation_guide/2981954672158122?business_id=1622617289329498&act=1779992427037532 . Evidência concreta dos parâmetros e sequência exigidos.
- Meta, CRM: https://developers.facebook.com/docs/marketing-api/conversions-api/conversion-leads-integration/crm-integration/3-implementing-the-crm-integration . Links diretos tiveram429; complementar com guia autenticado e SDK público.
- SDK oficial, origens: https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/action_source.py . Chat e website descrevem ações diferentes; estágio automático CRM segue o contrato próprio.
- SDK oficial, dados: https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/serverside/user_data.py . Dados normalizados/hash e identificador Meta de lead não são identificadores arbitrários.
- Meta, CAPI parameter builder: https://github.com/meta/capi-param-builder . Parâmetros de clique/navegador só podem representar o mesmo participante consentido.
- Evolution, webhook: https://github.com/evolution-foundation/evolution-docs/blob/main/docs/02-Configuration/Webhooks.md . Add/remove de participantes, sem atribuição nativa ao clique do anúncio.
- Grupos Inteligentes, documentação da própria implementação: https://help.gruposinteligentes.com/es/best-practices/improve-ad-performance/ . Separa ingresso observado e associação estimada de clique. Não constitui garantia de elegibilidade Meta.
- Sparkle, guia da própria implementação: https://www.sparkletracker.com/blog/campanha-para-grupo-de-whatsapp . Recomenda devolver ingresso real via CAPI e conferir evento/conversão; alegações de desempenho não foram tomadas como prova.
- Jon Loomer, explicação de conversões: https://www.jonloomer.com/facebook-custom-conversions/ . Referência operacional, não normativa.

## Limites

Pesquisa ampla não prova melhoria de custo/conversão. Não há promessa de50 resultados, correspondência universal, leitura de mensagens ou vendas. Seletores desabilitados não devem ser contornados por eventos fictícios. Um teste externo usa Test Events e não valida dados reais nem desbloqueia por si só campanhas. Nenhuma conversa, nome ou número de participante foi exposto na pesquisa.
