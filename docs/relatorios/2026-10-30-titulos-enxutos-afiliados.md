# Títulos enxutos de afiliados — 30/10/2026

Pedido: remover repetições, manter título em aproximadamente duas linhas, testar e publicar em produção. Lote isolado sobre a1376495; não inclui mudanças paralelas de Shopee, políticas de grupos ou frontend.

Causas confirmadas: a IA recusada/indisponível devolvia o nome bruto do vendedor; o validador considerava210cm e210 cm tokens incompatíveis, recusando uma versão curta correta. Seis regressões de compacidade falharam antes do ajuste; uma regressão separada comprovou a recusa indevida de medidas equivalentes.

Correção compartilhada no domínio: deduplica palavras por caixa/acentuação, preserva unidades e valores distintos, prioriza identificação inicial e especificações numéricas e limita a60 caracteres por palavras completas. Aplicado tanto à geração/fallback quanto à composição da mensagem para proteger ofertas antigas. Prompt pede identificação enxuta, sem cauda de SEO; cache versionado. Guardas contra atributos inventados, imagens não confiáveis, preços e hype permanecem. Uma prévia aprovada continua vinculada à mesma mensagem; broadcasts já aprovados não são reescritos.

Exemplo recebido117 caracteres →54 caracteres:

Árvore De Natal Luxo 210 Cm 1200 Galhos NEXMIDIO Verde

Título objetivo aceito com resposta estruturada simulada:

Árvore de Natal NEXMIDIO 210 cm 1200 Galhos

Validação local final:42 testes unitários em5 arquivos e57 testes PostgreSQL/HTTP em3 arquivos, em banco descartável próprio recém-migrado. Inclui prévia assinada, aprovação da mesma mensagem, preço/link preservados, idempotência, histórico, isolamento e grupos. O nome exigido pelo guard do banco foi respeitado, sem remover proteções. Lint, tipos e build backend passaram. CI completo e deploy ainda pendentes neste registro inicial. Testes de IA usam respostas simuladas; nenhum pedido pago à OpenAI ou mensagem real no WhatsApp foi enviado.

Limites: duas linhas visuais dependem de largura/fonte do WhatsApp, que não é controlada pelo site. Restrições iniciadas por sem/não/somente são preservadas integralmente, enquanto a parte anterior pode ser enxugada. Quando as restrições e especificações obrigatórias sozinhas excedem60 caracteres, o título permanece íntegro para não omitir fatos/modelos. Novas prévias usam a correção; histórico e mensagens já enviadas são preservados. Reversão: reverter apenas este lote pelo CI, sem migração ou alteração de dados.
