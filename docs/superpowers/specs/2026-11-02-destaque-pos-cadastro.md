# Funil de destaque pós-cadastro — contrato aprovado
Data: 2026-11-02. Branch codex/destaque-pos-cadastro a partir de origin/main 0f9f0a7a.
Usuário autorizou implementação real e branch da main, preservando alterações anteriores. Sem commits, push ou deploy.
Objetivo: destacar CTA em Meus links; oferta opcional após cadastro com 20% OFF evidente; upgrade Home por card inteiro clicável diretamente acima do CTA no resumo desktop e mobile; recuperação com prazo real; pagamento confirma aprovação/publicação e ativação sem revisão manual nesta jornada com limiar 0.
Manter publicação gratuita, tenant, dono, canSubmit, suspensão, autorização de equipe, idade/Home, disponibilidade, idempotência, pagamento e analytics existentes.
Desconto: calculado no servidor, sobre preços correntes do catálogo na emissão, congelados na oferta. Uma oferta por conta/tenant, vinculada a link recém-criado (até24h), válida24h; nova emissão só para novo link após30dias. Fechar não aumenta desconto. Sem reiniciar timer. Política: preço de oferta reservado em pedido criado dentro da validade, válido até vencimento da cobrança; pagamentos tardios seguem contrato existente.
Alternativa de retenção: ao fechar convite inicial, uma única bottomsheet do Completo, mesmo20%, dispensável. Após fechar, lembrete recuperável no painel/header autenticado até expiração. Dismiss do lembrete suprime aparição nessa campanha.
Não oferecer Home em nichos com restrição etária. Estado PENDING_MODERATION não bloqueia receber oferta; com limiar0, resolver publicação automática no servidor antes do checkout se necessário, e garantir ativação ao confirmar pagamento. Não presumir que qualquer pagamento revoga suspensão/URL inválida/idade/tenant.
Contrato API:
POST /v1/promotions/launch-offer body {linkId:string} idempotente retorna {offer:LaunchOffer|null}
GET /v1/promotions/launch-offer retorna {offer:LaunchOffer|null} para recuperar da conta
DELETE /v1/promotions/launch-offer/:id dispensa lembrete persistente (não altera termos de pagamento existentes)
LaunchOffer = {id:string,linkId:string,linkName:string,discountPercent:20,expiresAt:string,dismissed:boolean}
GET /v1/promotions/offers?linkId=ID mantém catálogo completo, aplica preços da campanha ativa correspondente e adiciona launchOffer?:LaunchOffer; cada price tem {durationDays:7|14|28,amountCents:number,referenceAmountCents?:number}; superficies permitidas por link. Sem linkId preservar contrato antigo.
POST checkout existente recebe launchOfferId?:string, servidor valida e calcula valor; descontos não vêm do navegador.
UI infra frontend: criar features/promotions/launch-offer.ts com tipos e helpers para reaproveitar contrato. API tool backend só conhece DTO acima.
20% inicial por7dias; usuário pode consultar outros planos/durações existentes; upgrade troca SEARCH_NICHE por SEARCH_NICHE_HOME em um único pedido.
Preços exemplificados17,90→14,32 e32,90→26,32 são apenas base de screenshots; sempre usar backend.
Entrega: capturas do site real em localhost390x844 e1440x900, teclado, foco,320/zoom, expiração, reabertura, seleção pelo card, confirmar pagamento. Nada de screenshot de mockup como validação.


## Revisão posterior autorizada — complementos e +18
- Completo não apresenta complemento. Busca oferece Nicho + Home; Nicho oferece Busca + Home; Busca + Nicho oferece Home. Home avulsa oferece Busca + Nicho.
- Para +18, somente Busca, Nicho e Busca + Nicho; catálogo, checkout, renovação e reapresentação idempotente nunca aceitam Home/Completo.
- Convite e retenção começam em Busca + Nicho, com Home opcional. A retenção anterior que selecionava Completo foi substituída.
- Verificação e capturas atuais: docs/frontend-profissional/evidencias/destaque-complementos-2026-11-02.md.
