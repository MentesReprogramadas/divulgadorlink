# Auditoria de campanhas em produção — 21/10/2026

## Resultado

Há perda reproduzível de atribuição mesmo com consentimento. Ainda não é possível afirmar qual condição explica os zeros das campanhas do Instagram sem conferir uma URL real de anúncio.

O painel não mede aceites por campanha: mede contas com um toque de aquisição registrado. Zero nessa coluna não prova ausência de aceite nem ausência de cadastros.

## Evidências de produção

Consultas agregadas via Prisma no container da API, em transações com `SET TRANSACTION READ ONLY`, aproximadamente às 12h de Brasília. Não foram consultados nomes, e-mails, telefones ou identificadores de usuários.

- 244 escolhas de aceite de marketing; 36 de recusa. São eventos de escolha, não necessariamente pessoas únicas.
- 97 eventos de cadastro: 40 com campanha e 57 sem toque registrado. Não há informação suficiente para dividir esses 57 por consentimento ou campanha.
- 39 cadastros atribuídos a `meta / paid / captacao_links`.
- 1 cadastro atribuído a `google / cpc / tla_publicadores_br`, registrado em 21/10 às 12:04 de Brasília. Portanto, o zero dessa campanha na listagem enviada já mudou.
- Nenhum toque de cadastro com origem `ig` ou `fb`.
- As entradas citadas pelo usuário foram confirmadas nos agregados. As campanhas Instagram/Facebook chegam a `/divulgar`.
- As 46 entradas de `tla_catalogo_br` chegam a `/rede/:slug`, fora do caminho elegível para atribuição de publicadores.

Frontend e API estavam saudáveis no Coolify. As imagens em execução identificavam o commit `a7aad9c77b7817909319c23fcbb938808e631870`. Os arquivos atuais de captura, validação e consulta de atribuição foram comparados com esse commit, sem diferenças nesses arquivos.

## Achados

### 1. Um parâmetro opcional inválido descarta toda a campanha

`frontend/src/domain/campaign-touch.ts:21-23` exige caracteres ASCII restritos e até 80 caracteres em todos os parâmetros. Espaços, acentos, chaves de macros não substituídas ou valores longos em `utm_content` ou `utm_term` invalidam o toque inteiro. O backend aplica a mesma restrição em `backend/src/domain/acquisition/touch.ts`.

Entradas usam somente source/medium/campaign. Assim, uma visita pode aparecer corretamente na campanha e nunca gerar atribuição de cadastro por causa de content/term, mesmo após aceite.

Reprodução contra `POST https://temlinkaqui.com/anuncio/toque`, enviando consentimento de marketing e Referer controlado:

| Cenário | HTTP | stored |
| --- | --- | --- |
| `/divulgar`, `ig / paid / 120257166892340011`, opcionais vazios | 200 | true |
| Mesmo caso, `utm_content=Video Instagram` | 200 | false |
| Mesmo caso, `utm_term=Publico aberto` | 200 | false |
| `/divulgar`, Google, `utm_term=divulgar grupo` | 200 | false |
| Campanha Google em `/rede/whatsapp` | 200 | false |
| `/cadastro` sem UTMs, com aceite | 200 | false |
| `/divulgar` com campanha válida e consentimento negado | 200 | false |

Essas chamadas não criaram contas nem eventos de entrada/aceite. Somente exercitaram a emissão do cookie na resposta HTTP, sem persistência no banco ou chamadas aos pixels.

### 2. Aceitar depois de sair da landing perde o contexto

`consent.tsx` chama `/anuncio/toque` no aceite. A rota recupera os parâmetros do Referer atual; não há transporte da campanha inicial nesse fluxo. O CTA público leva a `/cadastro` sem UTMs.

Quando alguém chega sem consentimento, avança ao cadastro e aceita ali, o Referer já é `/cadastro`. Nenhum toque é criado. O cadastro pode ser concluído com consentimento e continuar sem campanha atribuída. Não foi criado cadastro de teste em produção para esse diagnóstico.

### 3. A apresentação permite uma conclusão que os dados não sustentam

O relatório junta entradas anônimas agregadas com registros de `acquisition_touches`. `consent_daily` não possui dimensão de campanha. “Cadastros com aceite” não representa o número de aceites da campanha.

O toque também exige `/divulgar`, source/medium/campaign válidos, opcionais válidos e captura antes do cadastro. O primeiro toque já existente é preservado por até 30 dias: uma nova entrada pode aparecer em outra campanha enquanto o cadastro continua atribuído à anterior. Essa preservação é o contrato atual, não um erro demonstrado.

Há ainda uma limitação futura: entradas e cadastros são limitados separadamente aos 12 maiores grupos antes da junção no frontend. Uma campanha fora do top 12 de cadastros pode ser exibida com zero. Isso não explica a amostra atual, que possui somente dois grupos com cadastros.

## Validação e limites

- 19 testes frontend passaram: consentimento, middleware e painel de tráfego.
- 16 testes backend passaram: parser, HTTP de aquisição/tráfego e registro de funil.
- O teste HTTP de tráfego emitiu também um log de `Cannot write headers after they are sent` durante cenário de acesso negado, apesar do resultado aprovado. Não foi investigado como causa destes zeros.
- Não foram executados build, lint ou E2E completo: não houve mudança de implementação.
- A API conectada do Google Ads bloqueou leitura de anúncios reais porque o projeto possui autorização apenas para contas de teste. Não foi possível conferir os parâmetros efetivamente configurados por essa integração.
- Não foram alterados dados de produção, código de aplicação, anúncios ou configuração. Sem deploy, commit ou push. Este documento é a única entrega criada pela auditoria e pode ser removido para revertê-la.
- Para fechar a causa das campanhas Instagram, falta conferir a URL final real, especialmente `utm_content` e `utm_term`. Os dados agregados existentes não permitem reconstruir atribuição histórica perdida nem identificar quais dos 57 cadastros sem toque consentiram.

## Correções indicadas

Tratar falhas de campos opcionais sem perder o núcleo válido da campanha, preservando limites e proteção contra dados pessoais; preservar o contexto necessário durante a navegação sem gravar marketing antes do aceite; e explicar no painel que se trata de cadastros atribuídos. Qualquer mudança deve manter o primeiro toque e o consentimento como condições, com regressões cobrindo esses cenários.
