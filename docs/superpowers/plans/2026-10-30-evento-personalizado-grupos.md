# Evento personalizado de cadastro em grupos

Pedido: mesmo tipo da campanha de divulgação, com evento e conversão personalizados para Natal/Pets em produção, preservando formulário e orçamento. Branch existente atualizada em fast-forward para a main816aec22, sem alterar a campanha de divulgação.

1. Evento website do INITIAL_LEAD passa de Lead a SubmitGroupRegistration. Preservar identificação, horários, idempotência, privacidade e QualifiedGroupLead de ingresso real.
2. Vermelho/verde do contrato; integração PostgreSQL, lint/types/build e CI protegido. Sem migração nova.
3. Publicar pelo CI. Sem fabricar cadastro ou reprocessar registros antigos como novas conversões.
4. Vendas/WEBSITE/OFFSITE_CONVERSIONS com novo evento e conversões por LP, conforme disponibilidade Meta. Só ativar após emissor em produção. Trocar sem sobrepor30+30/dia; preservar criativos/público.
5. Confirmar API/worker no SHA aprovado, Test Events e readback Meta; documentar limites e reversão.
