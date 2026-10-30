# Shopee com imagem real e regeneração de chamadas — 30/10/2026

## Causas reproduzidas

A Open API retornou `https://cf.shopee.com.br/file/...` nos 60 anúncios de três consultas reais. O adaptador só aceitava `susercontent.com`, descartando as imagens como `null`. A URL alternativa `down-br.img.susercontent.com/file/...` entregou os mesmos bytes em 6 de 6 comparações. A coleta agora normaliza somente o host exato e o caminho de arquivo esperado, conservando HTTPS, ausência de credenciais/porta e a proteção existente de origem. CSP, validação da prévia e envio de mídia já permitem esse CDN; nenhuma origem arbitrária foi liberada.

Os títulos reais da Shopee também trazem repetição e caudas de SEO. A lista usa `displayTitle`, derivado do compactador já existente; o original permanece no produto, nos detalhes e na entrada de validação. O compactador deixa de terminar uma alternativa com “ou”. Não há preço anterior inferido, reputação verde artificial ou mudança na classificação de ofertas.

A geração real de copy respondeu HTTP 200 com `Um petisco saboroso para seu cão 🐾`, para um anúncio que dizia “Cães”. A validação literal recusava a flexão, devolvia a identificação original e fazia a regeneração terminar em 503. Agora somente uma lista explícita de flexões comuns é equivalente na chamada; sinônimos, marcas e atributos novos continuam sujeitos à validação literal. Uma identificação inválida da IA não invalida uma chamada segura: preserva-se a identificação anterior válida ou a versão segura do original, com medidas e quantidades.

Títulos qualificados conservam sua restrição inteira. A chamada pode ser neutra, mas não pode promover uma característica negada, como WiFi em “Câmera sem WiFi”. Chamadas repetidas, inventadas, recusas, interrupções e falhas do provedor continuam sem substituir uma prévia aprovada. O frontend exibe uma única mensagem quando o servidor já informou que a prévia anterior foi mantida. O modelo, limite de tokens por chamada, permissões e confirmação de envio foram preservados. Na regeneração, uma resposta textual inválida ou repetida pode receber uma única tentativa corretiva: até duas chamadas, sem retentativa para erro HTTP, recusa ou resposta interrompida. A correção usa um enum de chamadas derivadas do anúncio, previamente validadas e diferentes da versão anterior; a seleção continua sendo feita pela IA.

## Prova local com serviços reais

As credenciais permaneceram no runtime do servidor. O código novo rodou localmente e usou um transporte SSH temporário para assinar as consultas no servidor autorizado. Foram retornados somente dados públicos dos produtos; nenhum segredo foi gravado no repositório.

- Três buscas reais: `pet`, `ração pet`, `pá areia gato`. Respectivamente 18, 17 e 12 anúncios com preço único válido, todos com imagem normalizada: 47 de 47.
- Revalidação oficial do mesmo `shopId/itemId` e geração oficial de link do anúncio confirmadas.
- O anúncio exato do print, `SHP1906192909_44615273206`, foi reencontrado e revalidado por loja/anúncio: R$ 162,80 e imagem no CDN permitido. Sua copy inicial e outra chamada foram aceitas no teste real; a segunda precisou da única tentativa corretiva. O caso revelou também “espaço” como contexto neutro ausente e a tendência do modelo a inventar “prática”; a primeira foi admitida como contexto e a segunda continua proibida se ausente na fonte.
- Copy real antes da correção: HTTP 200, mas geração e regeneração rejeitadas localmente. Depois: duas chamadas diferentes aceitas, com a mesma identificação e peso de 1 Kg.
- PostgreSQL descartável: prévia assinada com imagem e preço real, regeneração com nova assinatura e mensagem, mantendo preço, link, imagem e vencimento. Usou as respostas reais de IA capturadas anteriormente, sem novas chamadas. Zero entregas criadas. A primeira execução comprovou as invariantes, mas falhou na limpeza por ordem de FK; corrigida a ordem e a execução completa passou.
- Playwright MCP em contexto local isolado: imagem real do CDN, sem interceptação da requisição de imagem, decodificada em 1000 × 1000 na lista e na prévia; troca de chamada renderizada com zero alertas. As respostas administrativas desse navegador reproduziram os dados e as prévias reais capturados pelo código local. Não se declara que esse replay seja uma sessão autenticada de produção.
- Desktop, mobile de 390 px e 320 px com texto a 200% conferidos; zero overflow horizontal e ação de revisão presente. Capturas inspecionadas em `docs/frontend-profissional/evidencias/shopee-e-titulos-2026-10-30/`.

## Regressão e checks

- Backend: lint, typecheck e build aprovados; 206 testes afetados aprovados e 1 já ignorado na primeira passagem. A revisão com o anúncio exato acrescentou duas regressões; inteligência, compactação e prévia passaram com 30 testes focados.
- Frontend: lint, typecheck e build de produção aprovados; 135 testes de componentes de afiliados aprovados.
- Banco descartável com as 85 migrações existentes: 26 testes de descoberta, Shopee e prévia/envio aprovados.
- Playwright Test: 38 cenários aprovados em desktop/mobile. O teste novo carrega a imagem com fixture determinística, confere a foto na prévia, preserva a mensagem durante uma falha e permite nova tentativa sem duplicar o erro. As chamadas reais e imagens externas pertencem à prova local separada acima.
- Graphify incremental local, code-only: 25 arquivos reavaliados, 1729 reutilizados; 8835 nós e 31794 relações. Sem LLM/API ou envio externo. CSS e arquivos sem símbolos continuam comprovados pelos testes e inspeção, não pelo grafo. Índice permanece local.

Referências consultadas: [Explorer oficial da Shopee BR](https://open-api.affiliate.shopee.com.br/explorer/v2), cuja página/schema foi lida por HTTP; [Structured Outputs da OpenAI](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat), para manter JSON estrito, recusa e término completo. O Context7 encontrado cobre a API de vendedores, não esta API de afiliados; não foi usado como contrato equivalente.

## Cache e publicação

Leitura limitada à operação administrativa solicitada identificou 43 imagens ausentes em cinco páginas recentes de cache, nos segmentos Natal e Pets. Todas foram reencontradas por anúncio/loja na API oficial e validadas localmente pelo parser corrigido. O reparo de apresentação foi preparado com backup e comparação de versão para preservar atualizações concorrentes. Não altera preço, horário de consulta, elegibilidade, decisões, oferta aprovada ou entregas. A aplicação em produção e os healthchecks serão registrados após o deploy.

Reversão: reverter somente o commit desta correção e, se necessário, os campos de apresentação do cache a partir do backup privado local. Sem rollback de banco: não há nova migração, dependência ou alteração de credenciais. A disponibilidade do CDN/API/IA continua externa; nenhuma mensagem de teste foi enviada ao WhatsApp e não se certifica entrega real ou disponibilidade contínua.

O contexto do Impeccable informou metadados antigos em PRODUCT.md e no sidecar de DESIGN.md. Esses arquivos não foram modificados; sua manutenção fica fora deste reparo.
