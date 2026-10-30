# Conversões de entrada real em grupos — plano

> **For agentic workers:** usar execução de plano e verificação antes de concluir. A implementação foi dividida entre backend, frontend e revisão de elegibilidade Meta, sem sobreposição de arquivos.

**Goal:** medir ingresso confirmado no WhatsApp e preparar campanhas para otimizar esse evento, sem contar cliques como participantes.

**Architecture:** a LP registra número declarado e aceite opcional de mensuração. O backend guarda contexto mínimo cifrado e identidade HMAC por conta/segmentação. Somente webhook autenticado de entrada, posterior ao cadastro e baseline, pode gerar evento idempotente em outbox. Worker envia à CAPI com origem verdadeira; campanha só migra após aceitação e elegibilidade verificadas.

**Tech Stack:** Fastify/Prisma/PostgreSQL, worker existente, Next 15/React 19, LP estática existente, Meta CAPI/Marketing API e Evolution 2.3.7.

**Spec:** pedido do usuário de 30/10/2026 e resposta explícita “Identificar na LP e medir entrada real”. Preservar entrada no grupo sem aceite publicitário, isolamento de tenant, orçamento e criativos existentes.

## Restrições

- Não transmitir nomes, mensagens ou telefone sem proteção. Não fabricar consentimento, identificador de clique, origem ou ingresso.
- Pedido de aprovação não é entrada; baseline, retries, duas instâncias e reentrada não multiplicam aquisição.
- Nenhum LID será convertido em telefone por remoção de sufixo.
- Consentimento desmarcado permite participação e não persiste contexto publicitário. DNT/GPC preservados.
- Nenhum dado de formulário em URL, console ou localStorage. Contexto cifrado, prazo curto e expurgo.
- Configuração publicitária opt-in por tenant e segmentações explícitas. Aquisição de publicadores permanece independente.
- Não alterar convite rápido /ofertas/entrar; Natal recebe rota de identificação distinta para uso no anúncio. Pets mantém LP independente e modal no CTA.
- Meta diferencia evento recebido, correspondência, atribuição e elegibilidade de otimização. Não prometer equivalência entre contadores.
- Objetivo de campanha é imutável. Se for necessária substituição, preparar pausada e preservar orçamento total, sem duplicar gasto.
- WIP concorrente de catálogo e índices não pertence a esta entrega.

## Contrato

`POST /api/v1/public/affiliates/:slug/conversion-intent`

Body: `{phone,marketingConsent,fbclid?,fbp?,sourceUrl}`. UA vem do transporte real. Resposta: `{joinUrl,tracked}`. Tenant vem do Host público, com resolução existente.

Config tenant `AFFILIATE_META_CONVERSIONS`: `{enabled,pixelId,segmentIds,allowedOrigins}`; pixelId coincide com META_PIXEL_ID no servidor. Origem HTTPS validada. sourceUrl persistida sem query/hash.

BFF dedicado `/api/affiliate-entry/[slug]`: POST/OPTIONS com allowlist de Origin, sem cookies administrativos nem mudança de CSRF/CORS global.

Contrato final após conferir o guia CRM da conta: cadastro real da LP envia `Lead/website`; a transição CRM após ingresso comprovado envia `QualifiedGroupLead/system_generated`, `event_source:crm`, `lead_event_source:Tem Link Aqui`, `segment_id` e external_id opaco estável. O teste inicial `GroupJoinConfirmed/chat` fica apenas como evidência da pesquisa, sem emissão paralela em produção.

## Tarefas e verificações

- [x] Backend: registro consentido minimizado, associação ao ingresso, outbox, worker/expurgo e configuração. 59 testes focais aprovados, lint/tipos/build; aliases explícitos LID, ordem de estágios, baseline de expansão e retenção validados. Suíte global teve duas falhas de fixture Pix/coluna emailDigest fora do escopo; CI limpo continua obrigatório.
- [x] Frontend: modal na LP Pets e captura simples /ofertas/participar/[slug] para Natal; BFF dedicado. Consentimento opcional, teclado, DNT/GPC, retry, transporte sem cookies, limite de corpo, destino, privacidade e mobile validados. Checks/build aprovados; chamadas reais bloqueadas nos testes.
- [ ] Meta: pesquisar documentação oficial e experiências de fornecedores; conferir eventos/conversões disponíveis e restrições de origem/objetivo. Não ativar evento inelegível.
- [ ] Integração: revisar diffs dos agentes, executar checks necessários e CI do commit exato; publicar somente alterações desta entrega.
- [ ] Produção: configurar somente conta autorizada, conferir baseline/webhook de Natal/Pets e validar CAPI em modo Test Events com dado de teste autorizado. Não enviar membro histórico como aquisição.
- [ ] Campanhas: preparar substituições quando necessário; conferir evento elegível e destino, manter orçamentos atuais, migrar sem sobreposição de gasto e verificar estado final. Se a Meta impedir a otimização, registrar erro concreto e manter campanhas atuais sem afirmar migração.

## Riscos a validar

1. Ingresso em chat pode não ser elegível para otimização de conversão de website nesta conta; validar na Meta, sem falsificar action_source.
2. Número declarado não verifica posse; a correlação só se completa após identidade equivalente ser observada no grupo. Não prometer atribuição determinística universal.
3. Webhook pode trazer somente LID; nesse caso omitir a conversão até haver mapeamento explícito confiável.
4. Dados mínimos não garantem correspondência Meta; baixo volume pode limitar aprendizado.
5. Convite compartilhado e ingresso orgânico não devem receber identificação inventada do último clique.
