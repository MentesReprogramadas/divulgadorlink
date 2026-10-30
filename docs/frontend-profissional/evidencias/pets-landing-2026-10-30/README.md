# Pets — landing e configurações, 30/10/2026

> Registro histórico da implementação inicial. Na revisão anterior à publicação, a rota principal `/ofertas/pets` foi reduzida a imagem, título e um único botão. A LP completa permanece no projeto separado `C:/VSCODE/achadinhos-pet-lp` e não foi reincorporada. O avatar atual da rota é o cartoon aprovado `avatar-cartoon-v2.webp` (50.804 bytes), copiado do asset pronto desse projeto, sem alterar sua fonte. As capturas e descrições da LP longa abaixo são históricas; a validação atual está no relatório `docs/relatorios/2026-10-30-frontend-prepublicacao.md`.

## Escopo

Nova landing em `/ofertas/pets`. Os dois CTAs usam `/ofertas/entrar/pets`; a rota do convite e seu modo REDIRECT foram preservados. A landing não busca destinos, não conta entradas e não chama a operação de ingresso ao carregar.

Interface administrativa: credenciais próprias Shopee em Configurações das ofertas, fonte da coleta na mesma aba, distinção de disponibilidade por provedor e política desejada de entrada/mensagens na edição da segmentação. Usadas primitivas já instaladas; nenhuma dependência adicionada.

## Direção e conteúdo

Referência fornecida: `https://achadinhos.pet/`. Aproveitado o argumento descrito na inspeção da tarefa principal: proposta pet, convite gratuito no WhatsApp, imagem próxima da ação, conteúdo de benefícios e repetição do CTA. Texto, implementação e asset são próprios. Não foram reproduzidas notificações, ocupação de 87%, urgência, depoimentos ou garantias.

Marca navy/turquesa, Outfit e Source Sans 3 do projeto. Cabeçalho, rodapé e consentimento compartilhados continuam presentes. Taste foi consultada com `--keep palette,type`; a amostra está em `direction.json`. As composições sorteadas exigiam arquivos/fotografias inexistentes ou outra estrutura. O pedido explícito de referência, o único avatar disponível e a marca existente orientaram esta extensão; não houve adoção de novo sistema visual global.

Na página, o convite para o grupo torna-se o elemento principal: proposta, ação e imagem de identidade aparecem juntas. A seção clara reúne os assuntos possíveis, seguida do percurso e das dúvidas que antecedem o ingresso. FAQ nativa é a interação progressiva e funciona por teclado.

| Before | After | Why |
| --- | --- | --- |
| Não existia apresentação dedicada Pets | Landing SSR com proposta, convite e condições | Informar antes de abrir o convite existente |
| Catálogo identificado apenas como Mercado Livre | Fonte de coleta explícita em Configurações e rótulo por produto | Evitar identificar produtos Shopee como ML |
| Preferência de grupo sem superfície de aplicação | Política desejada separada do estado de cada grupo | Não declarar ativa uma configuração não confirmada |

## Origem das imagens

`frontend/public/ofertas/pets/avatar.webp`: cópia de `output/pets-setup/avatar-pets.webp`, 512 × 512, 56.798 bytes. Imagem original gerada com imagegen na tarefa principal; prompt e original em `output/pets-setup/prompt-avatar.txt` e `avatar-pets-original.png`. Nenhum asset do concorrente foi copiado. O logo do site vem do shell existente em `public/brand/ondas-logo.svg`; o ícone WhatsApp usa o asset de marca existente.

## Limites confirmados

- O convite real depende da conexão/disponibilidade do WhatsApp. Nenhuma entrada real foi executada pela validação da landing.
- O teste adicional sem JavaScript encontrou o fallback `Carregando conteúdo` do Suspense do RootLayout, enquanto o HTML contém título e CTA. Esse limite compartilhado foi informado à tarefa principal e não foi alterado aqui. SSR de conteúdo e canonical foram verificados separadamente; não declarar suporte integral sem JS.
- Shopee e política de grupos usam fixtures isoladas no E2E. Isso valida UI/contratos, não credenciais reais nem capacidade operacional do provedor.
- A política informa a extensão necessária; `UNSUPPORTED`, `WAITING_CONNECTION`, `PENDING` e demais estados não são apresentados como aplicados. Pausar não desfaz configurações do WhatsApp.
- Axe cobre somente superfícies inspecionadas. Não representa acessibilidade total. Não houve teste em aparelho físico nem comprovação de conversão.

## Verificações executadas

- `npm run lint`: aprovado no frontend.
- `npm run typecheck`: aprovado, incluindo fontes E2E.
- `npm test -- src/features/affiliates`: 133 testes em 19 arquivos aprovados.
- Rodada dirigida incluindo `src/middleware.test.ts`: 66 testes aprovados; CSP permite imagens `susercontent.com` e subdomínios sem ampliar scripts ou conexões.
- Build de produção pelo executor `e2e/affiliates-server.mjs`, com `TEMLINK_E2E_BUILD=1`: aprovado. Permanecem avisos anteriores de CSS/autoprefixer e configuração de workspace/standalone.
- Seis E2E passaram no artefato compilado, em desktop 1440 × 900 e mobile 390 × 844. Incluem largura 320, conteúdo/canonical SSR, dois CTAs corretos, imagem carregada, FAQ por Enter, salvamento Shopee, fonte só em Configurações, PUT completo de política e estado pendente.
- Axe sem violações nas superfícies testadas da landing, configurações Shopee e dialog de edição. Foco de ação e FAQ exercitados. Overflow horizontal da landing ausente em 320/390/1440.
- Inspeção adicional Playwright MCP da landing em desktop/mobile; título, quebra do h1, CTAs com cerca de 57px e ausência de overflow confirmados. As capturas E2E foram abertas e examinadas para as duas superfícies administrativas.

A primeira tentativa administrativa falhou por fixture sem `membership.groups`; corrigida. A seguinte falhou porque o seletor axe incluía um `main` inexistente no shell administrativo; corrigida para as superfícies existentes. Essas falhas não foram apresentadas como validação aprovada. O teste adicional sem JS permanece como limite conhecido acima. A repetição final usou o mesmo build, sem recompilar quando só testes/fixtures mudaram.

## Reversão

Remover a rota/feature/asset e os testes novos para retirar a landing. As alterações administrativas são isoladas nos componentes de afiliados e no acréscimo de hosts de imagens da Shopee em `img-src`. Nenhuma migração ou ação de produção é executada pela UI ao carregar.
