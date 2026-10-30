# Shopee: padrão De / preço atual / economia — 30/10/2026

O usuário pediu o mesmo padrão de ofertas do Mercado Livre e autorizou calcular a referência anterior a partir do percentual. A implementação anterior apenas mostrava o percentual ao lado da prévia; ele não integrava a mensagem aprovada. Este reparo substitui essa limitação.

## Comportamento

A referência é calculada em centavos por `round(preçoAtual × 100 / (100 − desconto))`. O percentual inteiro da Shopee pode ter precisão menor que os preços da loja; por isso a referência e a economia ficam identificadas como estimadas. Para o anúncio real `SHP968780823_23797550603`, a Open API confirmou R$ 21,30 e 39%; a referência calculada é R$ 34,92 e a economia estimada é R$ 13,62. O percentual exibido permanece 39%, evitando que o arredondamento em centavos o transforme em 38%.

A lista, a revisão e as ofertas cadastradas usam o mesmo componente de preço para ambos os provedores: preço atual, preço riscado e selo `% OFF`. Referências calculadas incluem “estimado”. A mensagem da Shopee passa a conter `De (estimado)`, preço atual e `Economia estimada … · 39% OFF`. Quando o preço anterior é confirmado, o padrão existente do Mercado Livre e o cálculo conservador do percentual permanecem iguais.

Valores inválidos, taxas zero/100, referência fora dos limites ou que arredonde para o próprio preço não produzem preço anterior calculado. Uma taxa confirmada de 100% continua podendo ser exibida sem dividir por zero ou criar referência. A referência estimada não passa a comprovar histórico próprio ou a conceder classificação automática de boa oferta.

Percentual e natureza da referência fazem parte da prévia assinada, são preservados na regeneração de título, persistidos na oferta e copiados ao snapshot da distribuição. A mensagem enfileirada continua exatamente a mensagem aprovada. Uma edição manual de preço/produto limpa a evidência derivada; uma referência antiga estimada não vira silenciosamente preço confirmado. O corpo HTTP não aceita percentual arbitrário.

A migração aditiva `20261030223000_affiliate_offer_discount` adiciona `reportedDiscountPercent` e `oldPriceEstimated`, com limites e integridade da referência no banco. Registros anteriores permanecem sem taxa e com `oldPriceEstimated=false`. Descobertas já em cache recebem a referência na leitura, pelo mesmo cálculo; não há edição em massa de preço, horário de coleta, decisões ou mensagens já aprovadas.

## Validação

- TDD: o teste de mensagem sem preço anterior falhou primeiro por ausência do percentual; passou com a implementação. Casos adicionais cobrem cálculo inverso, centavos, taxa inválida/100, limites, preço anterior confirmado e preservação da taxa original.
- Backend: lint, typecheck e build aprovados; 211 testes afetados e um teste existente ignorado. Após os ajustes finais de regeneração, 39 testes focados e typecheck passaram novamente.
- Frontend: lint, typecheck, build e 140 testes de afiliados aprovados. Avisos existentes de CSS/autoprefixer/configuração do workspace continuam sem falhar o build.
- PostgreSQL descartável: 87 migrações aplicadas e 60 testes aprovados, incluindo Shopee, aprovação, snapshot, envio idempotente, edição manual e HTTP. A primeira passagem não executou a suíte de revisão porque seu nome novo de banco não constava na proteção existente; o banco descartável foi renomeado para um nome permitido, sem afrouxar a proteção, e os oito testes restantes passaram. Banco removido ao final.
- Playwright Test: seis cenários passaram em desktop/mobile. A primeira passagem encontrou seletor ambíguo porque o percentual passou a existir também na mensagem; o seletor foi tornado exato e os cenários passaram novamente.
- Playwright MCP: dados públicos reais da API com respostas administrativas locais de fixture, imagem real do CDN decodificada em 1024 × 1024, lista e diálogo inspecionados. Sem overflow em 390 px ou 320 px com texto a 200%; diálogo também sem overflow. A captura inicial pegou a animação de abertura; as evidências finais foram estabilizadas com animações desabilitadas na captura. Esse replay não é uma sessão autenticada em produção.
- Capturas inspecionadas em `docs/frontend-profissional/evidencias/shopee-padrao-desconto-2026-10-30/`.
- Graphify incremental code-only: 41 arquivos reavaliados, 1739 reutilizados; 8939 nós e 32119 relações. Índice permanece local, sem LLM/API.

## Publicação e reversão

A publicação será realizada após CI completa e seguida de conferência nas rotas reais de descoberta, prévia e regeneração, sem chamar envio em produção. Publicação, SHA e resultados serão registrados após a conclusão.

Reversão de aplicação: reverter somente o commit deste reparo. As duas colunas são aditivas e podem permanecer durante rollback de código; não remover dados ou reverter migrações concorrentes automaticamente. Nenhuma mensagem real de teste foi enviada ao WhatsApp. Valores derivados permanecem estimativas baseadas na taxa informada pela Shopee.
