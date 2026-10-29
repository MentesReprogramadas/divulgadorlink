# Central de afiliados e WhatsApp — desenho

Pedido: integrar a lógica de MentesReprogramadas/vhg-promos no Tem Link Aqui, partindo da main, exclusivamente para administradores. O usuário autorizou escolhas de implementação e ampliação necessária do escopo, sem gates intermediários de design; nenhuma publicação, gasto ou envio real está incluído.

Base: origin/main 2e30da70; referência clonada em C:/VSCODE/vhg-promos-reference-20261028, HEAD e68fac86. O VHG usa SQLite, destino/instância fixos, OAuth Mercado Livre, serviço próprio para gerar afiliados e confirmação explícita de envio. Adaptar lógica, sem importar banco, segredos, identidade fitness, Next 16, Drizzle ou pnpm.

## Abordagens
Incorporar o aplicativo inteiro duplicaria autenticação e persistência. Um iframe conservaria o limite de um grupo. Escolha de engenharia: módulo nativo Fastify/Prisma/PostgreSQL com frontend Next 15/React 19 existente, conectores próprios, serviços externos configuráveis e fila persistente drenada pelo worker existente.

## Comportamento
- Novo destino /admin/afiliados, dashboard operacional com totais reais, segmentações, instâncias, grupos, catálogo/ofertas e histórico de envios.
- Segmentação (ex. Natal) define nome-base, descrição, imagem, capacidade, pausa, expansão automática e instância provisionadora. Cada grupo pertence a uma segmentação e uma instância. Nome sequencial #2, #3 etc, sem lacunas calculadas por contagem.
- Convite público /ofertas/entrar/[slug] pode ser usado em Minha Página/convites como URL comum. GET não cria recursos. POST explícito consulta ocupação real e escolhe grupo disponível; se permitido, provisiona cópia sequencial com nome/descrição/imagem. Bloqueio distribuído impede duplicação concorrente. Falha incerta de criação exige reconciliação e bloqueia nova criação automática.
- Ofertas incluem título, anúncio/produto, link de afiliado, preço em centavos, referência opcional, imagem, texto, expiração e data de verificação. Sem desconto/cupom/comissão inventados.
- Aprovação cria broadcast com snapshot de conteúdo e destinos, idempotência por oferta/chave. Entrega isolada por grupo; nenhuma falha parcial reenvia grupos confirmados. Estado UNCERTAIN em timeout/crash pós-início exige resolução explícita. Pausa de segmentação/instância bloqueia envios, oferta vencida não envia.
- Conector Evolution usa servidor confiável configurado em ambiente, segredo por instância cifrado com utilitário AES-GCM existente; permite criar/conectar instâncias, QR, importar grupos, sincronizar ocupação. Nenhum endpoint arbitrário vindo do navegador.
- Mercado Livre: OAuth com state de uso único/PKCE/expiração, tokens cifrados, consulta de catálogo via conta conectada; respostas 403/429 não viram catálogo vazio. Geração de afiliados usa serviço privado compatível com VHG e nunca constrói URL afiliada fictícia. Link manual permanece disponível. Contas reais precisam de configuração e validação do operador.
- API restringe administrador ACTIVE consultado no banco + tenant do host; cookie visual/role JWT não bastam. CSRF/BFF existentes. Respostas no-store; segredos nunca retornados. Auditoria de mutações.

## Contrato HTTP compartilhado
Prefixo /api/v1 no backend e /v1 no api() frontend. Rotas do módulo: /admin/affiliates.
- GET raiz: {segments,instances,offers,broadcasts,deliveries,summary}; listas com limites explícitos.
- POST /segments, PATCH /segments/:id: {name,slug,description,imageUrl,capacity,autoExpand,instanceId,enabled}; PATCH parcial.
- POST /instances: {name,apiKey?}; PATCH /instances/:id: {enabled}; POST /instances/:id/connect; GET /instances/:id/status; GET /instances/:id/groups; POST /instances/:id/sync.
- POST /groups: {segmentId,instanceId,jid}; PATCH /groups/:id: {enabled}.
- POST /offers: {segmentId,title,productUrl,affiliateUrl,priceCents,oldPriceCents?,imageUrl?,note?,expiresAt?,checkedAt?}; PATCH /offers/:id para revisão/arquivar (status DRAFT/ARCHIVED).
- POST /offers/:id/send: {idempotencyKey,scheduledAt?}; POST /deliveries/:id/resolve: {resolution: SENT|RETRY,confirmUncertain:boolean,providerMessageId?}.
- GET /public/affiliates/:slug retorna {name,description,available}; POST /public/affiliates/:slug/join retorna {url}. Rota pública separada do admin.
- Catálogo: GET /admin/affiliates/catalog/status; POST /catalog/config {clientId,clientSecret}; POST /catalog/connect -> {url}; GET /catalog/callback?state&code; GET /catalog/search?q; POST /catalog/affiliate {productUrl} -> {url}; POST /catalog/disconnect. Status sem tokens.

Entidades Prisma: AffiliateInstance(id,tenantId,name,secret?,enabled,createdAt,updatedAt); AffiliateSegment(id,tenantId,name,slug,description,imageUrl?,capacity,autoExpand,instanceId?,enabled,nextSequence,provisionState,provisionStartedAt?,createdAt,updatedAt); AffiliateGroup(id,tenantId,segmentId,instanceId,jid,name,sequence,participantCount,capacity,inviteUrl?,enabled,syncedAt?,createdAt,updatedAt); AffiliateOffer(id,tenantId,segmentId,title,productUrl,affiliateUrl,priceCents,oldPriceCents?,imageUrl?,note,status,checkedAt,expiresAt?,createdAt,updatedAt); AffiliateBroadcast(id,tenantId,segmentId,offerId,idempotencyKey,message,imageUrl?,scheduledAt,createdAt); AffiliateDelivery(id,tenantId,broadcastId,groupId,state,providerMessageId?,errorCode?,lockedAt?,nextAttemptAt,createdAt,updatedAt); AffiliateConnection(id,tenantId,provider,credentials,status,oauthState?,oauthVerifier?,oauthExpiresAt?,updatedAt). Credentials cifradas JSON, provider MERCADO_LIVRE, unique tenantId/provider. Todas relações do módulo confinadas a tenant nas consultas e constraints compostas.

## Validação e limites
Testes de domínio/conectores/HTTP, PostgreSQL para locks/idempotência/tenant, frontend unitários, lint/typecheck/build dos pacotes, E2E desktop/mobile isolado e inspeção Playwright MCP. Testes não enviam a WhatsApp real nem alteram contas. Configuração ausente deve aparecer como pendência, jamais integração concluída. Sem prometer exatamente uma entrega quando o provedor não suporta idempotência. Check de ocupação não reserva vaga no WhatsApp: novas entradas externas podem ocupar a última vaga. GET não garante capacidade.
