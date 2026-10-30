# Cadastro e qualificação por ingresso real — backend

Implementação local em 30/10/2026. Sem commit, publicação, alteração de produção ou chamada real à Meta por este agente.

## Contrato e opt-in

`POST /api/v1/public/affiliates/:slug/conversion-intent`

Headers: Host público do tenant, Origin real da LP, User-Agent real. O tenant é resolvido pelo host existente. Corpo estrito: `{phone:string,marketingConsent:boolean,sourceUrl:string,fbclid?:string,fbp?:string}`. Resposta somente `{joinUrl,tracked}`; URL canônica `/ofertas/entrar/<slug>` no host do tenant. Consentimento falso permite continuar sem persistência ou envio publicitário. Não fabricar fbclid, fbp, consentimento ou contexto de origem.

Config por tenant, chave `AFFILIATE_META_CONVERSIONS`, `value` JSON estrito:

```json
{"enabled":false,"pixelId":"123","segmentIds":["segment-id"],"allowedOrigins":["https://tenant.example"]}
```

Origin HTTPS exata, sem caminho/barra final/query. Pixel deve coincidir com `META_PIXEL_ID`. Usa `META_CAPI_TOKEN` e `WEBHOOK_ENCRYPTION_KEY` existentes. `sourceUrl` permite somente pathname `/` ou `/ofertas/participar/<slug>`; query/hash são descartados, sem permitir path livre com dados pessoais. UA e origem/caminho verdadeiros permanecem cifrados. Telefone bruto nunca é persistido, retornado, adicionado a URL ou logado; lookup usa HMAC separado por propósito/tenant/segmento, dados Meta usam AES-GCM/AAD do helper existente.

Rate limit local por SHA256(IP do socket, tenant, slug): 20 requisições/minuto, janela móvel, máximo 10.000 chaves, sem apagar limites ativos sob churn; 429 com Retry-After 60. Limite adicional de 16 operações simultâneas. Não confia em X-Forwarded-For arbitrário. Sem canal autenticado para IP original, várias visitas pelo mesmo BFF compartilham o limite de IP no backend. Limites são por processo; infraestrutura distribuída pode complementar este controle.

## Dois fatos e dois eventos

- `INITIAL_LEAD`: criado junto ao intent consentido. Evento `Lead`, `action_source: website`, tempo da captura, origem/caminho e User-Agent reais da LP.
- `QUALIFIED_GROUP_LEAD`: criado na mesma transação da confirmação autenticada de ingresso, somente após baseline READY e correlação válida com intent anterior à entrada. Evento `QualifiedGroupLead`, `action_source: system_generated`, `custom_data: {event_source:'crm',lead_event_source:'Tem Link Aqui',segment_id}`. Não envia origem/UA da LP como observação do ingresso.

Os dois eventos recebem external_id = SHA256 do ID opaco do intent (ID CRM próprio, não Meta Lead ID). Consentimento registrado como affiliate-lead-qualification-v1. API Meta nova pinada em v26.0, conforme guia CRM observado pela raiz. `record-funnel.ts` e aquisição de publicadores permanecem sem alteração. Não há envio paralelo de GroupJoinConfirmed/chat. Qualificação somente é enviada após INITIAL_LEAD SENT. Falha definitiva inicial cancela o envio qualificado, preservando o fato de domínio confirmedAt. Elegibilidade e otimização CRM na conta Meta dependem de validação/dados reais posteriores, não são provadas por testes locais.

Outbox com unique(intentId,kind), IDs estáveis por tipo+intent e CHECK SQL: cadastro inicial sem grupo; qualificação obrigatoriamente com grupo. Worker com lease de 30s, timeout HTTP 5s, cinco tentativas e backoff. Aceite exige HTTP OK e events_received 1. Erros e respostas do provedor não entram em logs. Um crash após aceite externo pode repetir o mesmo event_id; deduplicação externa depende do provedor.

## Aliases LID explícitos

PN canônico `@s.whatsapp.net` é correlacionado diretamente. `@lid` nunca tem seus dígitos tratados como telefone. O receiver já autenticado pode fazer GET read-only `/group/participants/<instancia>?groupJid=...` antes da transação. Exige relação tenant/grupo/instância, segmento habilitado, tracking READY, tempo posterior ao baseline, config ativa e intent consentido ainda elegível. Só parseia `{id:'...@lid',phoneNumber:'...@s.whatsapp.net'}` validado; outros campos, nomes e imagens são descartados. O webhook não fornece esse alias: seu campo phoneNumber pode vir de fallback inseguro do upstream.

Mapeamento ambíguo em qualquer direção é descartado; pares idênticos são deduplicados. Cache de pares validados em memória, escopado por tenant/instância/grupo/baseline/participantes, TTL físico de 5s e máximo de 32 entradas. Falha de lookup produz 503/retry sem consumir o evento de membership. Antes da correlação, a transação revalida escopo, baseline e idade do mapeamento. Um PN já visto no baseline não vira nova conversão por chegar depois com alias LID. O cálculo agregado conserva a identidade canônica original e não foi convertido para telefone.

## Grupos novos

O provisionamento normal em invitations.ts, inclusive autoexpansão, executa baseline antes de entregar o convite somente quando a configuração de conversão permite aquele segmento/pixel. Usa participants do port existente e a rotina HMAC de baseline, sem emitir CAPI para membros já presentes. Se a leitura falhar, registra tracking UNCONFIGURED/CONVERSION_BASELINE_UNAVAILABLE e mantém a disponibilidade comercial do convite. Contas sem opt-in não têm leitura de participantes ou escrita de tracking por esse hook. Grupos importados ou reconciliados por outros fluxos continuam exigindo baseline explícito do operador.

## Retenção e pausa

Primeiro toque válido vence por telefone/segmento durante sete dias. INITIAL_LEAD SENT conserva attribution cifrada até qualificação final ou o TTL original, sem renovar os sete dias. Qualificação concluída/falha/cancelada, revogação e expiração apagam ciphertext. Intents sem confirmação expiram e são removidos; recibos/HMAC mínimos de confirmações expiram 90 dias após confirmedAt. A garantia de deduplicação é dessa janela, não vitalícia.

Config inválida/ausente/desativada, remoção do segmento, troca de pixel, segmento/grupo desativado, tracking não READY/expirado ou revokedAt bloqueiam o envio aplicável. O drain reavalia em até 10s. Não recolhe chamadas já iniciadas ou eventos já aceitos externamente. A qualificação exige tracking; a captura inicial real da LP não finge ser ingresso nem exige um grupo já confirmado.

## Migração, validação e reversão

Migration original não publicada `20261030150000_affiliate_conversions` foi regenerada para o modelo final de dois estágios e validada em PostgreSQL/pgvector descartável exclusivo, porta local 5662. Não aplicada em produção por este agente.

Validação focal final: 59 testes em dez arquivos HTTP/unit/PostgreSQL. Cobrem consentimento falso, isolamento tenant, origem/path/pixel, primeiro toque cifrado, PN/LID, alias ambíguo/duplicado/cache/falha, autenticação, baseline concorrente, mapeamento fora de escopo/obsoleto, concorrência entre instâncias/workers, ordem Lead→qualificação, id/tempo estável em retries, TTL7d sem renovação, limite de cinco tentativas, revogação/pausa, retenção 90d e rate limit serial. Meta somente com fetch stub e dados sintéticos. Lint, typecheck e build do backend aprovados. Suíte global: 976 testes aprovados, dois falharam e um ignorado (205 arquivos). As duas falhas são pix-expiration.redis.spec.ts e pix-worker.redis.spec.ts: scripts prove-pix-* acessaram banco sem a coluna emailDigest, fora deste patch; pagamentos não foram alterados.

Reversão: desativar config; cancelar pendências; remover registro da rota/drain. Tabelas podem permanecer vazias. Eliminar recibos antecipadamente reduz a janela de deduplicação. Nenhum downgrade destrutivo foi executado.
