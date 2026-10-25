# Ondas — administração, publicação, conta e cobrança

Data: 24/10/2026. Responsável pela fatia: `ondas_resource_visual_finish`.

## Escopo e método

Referência: preview Ondas aprovada, vidro compartilhado, ondas da marca, ícones monocromáticos e hierarquia atual. Consulta inicial ao grafo local (7.580 nós), confirmada nos consumidores atuais; o grafo não comprova CSS nem renderização. Aplicadas as instruções de Superpowers, Taste, Impeccable, Emil e `temlink-ui-validation`. A árvore contém alterações preexistentes e trabalho paralelo, preservados.

As capturas usam 1440×900 e 390×844, com movimento reduzido, consentimento negado, fontes carregadas, imagens locais e datas fixas. Cada PNG precisa ser aberto e revisado após a execução coordenada pela raiz, diretamente ou por pranchas que incluam todos os seus pixels e mantenham o vínculo com SHA256. Arquivo gerado não significa aprovação visual. Emulação mobile não equivale a aparelho físico.

Fixtures de apresentação interceptam somente respostas do navegador, com DTOs confirmados na fonte. São identificadas como simulações e não comprovam permissões, pagamentos ou decisões no backend. Sessões usam os usuários isolados do helper existente; somente o administrador novo da própria fixture recebe o papel ADMIN. Escritas visuais são interceptadas: nenhuma cobrança, mensagem ou decisão real é disparada. Os E2E integrados existentes continuam sendo evidência separada dos contratos reais.

## Inventário explícito de rota e estado

| Rota | Estados e variações a capturar | Fonte/fixture necessária |
| --- | --- | --- |
| `/login` | vazio; preenchido; validação nativa; enviando; credencial recusada; conexão indisponível | `LoginForm`; POST local sem sessão concedida |
| `/cadastro` | vazio; preenchido; validação; enviando; e-mail já usado; indisponibilidade de código | formulário atual; POST local 409/503 |
| `/esqueci-senha` | vazio; preenchido; enviando; confirmação neutra; limite de tentativas; falha | POST local 200/429/503, sem e-mail |
| `/recuperar-senha` | token ausente; formulário com token; validação; enviando; vencido; senha salva | `ResetForm`; token sintético e POST local |
| `/painel/conta` | formulários; novos identificadores; pendência; confirmação; rejeição; exclusão recusada; conta suspensa | sessão própria; identificadores/exclusão interceptados |
| `/painel/verificar` | carregamento; código vazio/parcial/completo; código recusado; reenvio em espera; trocar e-mail; troca recusada | sessão sem confirmação simulada; nenhum código enviado |
| `/painel/links` | todos os status; vazio; filtros sem resultado; carregamento; falha; select aberto; paginação | coleção própria tipada + contagem local |
| `/painel/links/novo` | etapa endereço vazia/preenchida/inválida; conteúdo e classificadores; selects; review sem imagem; review com ícone/imagem; enviando; erro preserva dados; sucesso | formulário real e anexos locais; envio interceptado |
| `/painel/links/[id]/editar` | publicado; alteração pendente; sem link; carregamento; erro; editor de descoberta; anexos ausentes/aprovados/pendentes/rejeitados; envio recusado | link UUID próprio; respostas locais do DTO atual |
| `/painel/links/[id]/contestar` | vazio; texto; validação; enviando; erro mantém texto; em revisão | POST de contestação interceptado |
| `/painel/links/[id]/disponibilidade` | desconhecido/acessível/suspeito/inconclusivo/indisponível; histórico; saldo pausado; vazio; loading; erro/negado; correção e validação | `AvailabilityData` local |
| `/painel/links/[id]/resultado` | dados; sem eventos; parcial; fora da retenção; carregamento; falha; período inválido/negado; gráfico/tabela; calendário/filtro de campanha | `PerformanceReport` local |
| `/painel/links/[id]/destaque` | catálogo e 7/14/28 dias; seleção; sem ofertas; loading/falha; método Pix/cartão indisponível; cobrança gerando; QR; pagamento recusado; expirado; pago/pago após prazo; renovação por superfície | catálogo/pedidos locais, sem Stripe externo ou cobrança real |
| `/painel/pedidos` | coleção com todos os rótulos existentes; vazio; loading; erro; busca e situação/select aberto | `PanelOrder` + links próprios |
| `/painel/assinatura` | sem página; somente grátis; catálogo; recurso contextual; loading/erro; confirmar assinatura/troca/cancelamento; assinatura pendente/ativa/atrasada/em conferência/encerrada/expirada; retorno de checkout | `BillingState` e `ProfilePlan` locais; nenhum checkout externo |
| `/admin/assinaturas` | vendas incompletas/habilitadas; pendências; sem pendências; loading/erro; configurar vendas; preço; recursos/liberação; validação; erro preserva formulário | `BillingAdminState`; configuração interceptada |
| `/admin/configuracoes` | exibição; aprovação IA; resumos de rede/nicho; edição de resumo; switches/selects; loading/erro; validação/retorno de salvamento | respostas de configuração do runtime + fixture local |
| `/admin/denuncias` | conteúdo/disponibilidade; recebida/em análise/resolvida; histórico; vazio; filtros; loading/erro/negado/inválido; decisão e justificativa | `ReportQueueRow` local |
| `/admin/destaques` | vazio; URL inválida; link encontrado; consulta pendente/erro; diálogo loading/erro; elegível/inelegível; período/indeterminado/data; conflito com pago; validação | link próprio + `PromotionContext` local |
| `/admin/disponibilidade` | correção preenchida; contexto ausente; vazio; loading; erro/negado; decisão/select/justificativa; erro preserva dados | `UrlProposal` local |
| `/admin/estornos` | situações existentes; vazio; filtros sem resultado; loading/erro; select; marcação pendente/recusada | DTO de estorno atual, sem liquidar valor |
| `/admin/integracoes` | desconectado/conectado; configuração pendente; loading/falha; operações pendentes; tipos/situações de entrega; confirmação de reenvio incerto; operadores | contrato Evolution atual; somente respostas locais, sem mensagens; esta tela não contém fluxo de QR |
| `/admin/moderacao` | abas Links/Anexos/Minha página/Links permanentes; envios/texto/contestação; anexos ícone/imagem e inelegível; busca/tipo; vazio/loading/erro/negado; recusa e motivo; decisão recusada mantém dados | filas tipadas locais; decisões interceptadas |
| `/admin/planos` | catálogo; duração 7/14/28; vazio/loading/erro; diálogo editar; preços inválidos; salvar recusado mantém valores; ordem por teclado | ofertas locais; nenhuma configuração real alterada |
| `/admin/visao` | nove áreas; subabas de tráfego/financeiro; gráfico/tabela/listas; período e select; preenchido/vazio/loading/erro; contas ativas/suspensas; confirmação de suspensão/retirada; menu/foco | dados reais obtidos do runtime e variações locais no mesmo DTO |

Não se aplica uma combinação cartesiana infinita. Variações que compartilham exatamente a mesma apresentação são agrupadas; cada estado nomeado acima precisa de evidência ou de um limite explícito. Perfil, equipe, agência, favoritos, integrações pessoais e recursos permanentes pertencem às outras fatias.

## Preparação e dependências

- Helper compartilhado: `frontend/e2e/ondas-visual-fixture.ts`; usuários UUID por teste no tenant local conhecido. Nenhum reset global.
- Spec desta fatia: `frontend/e2e/ondas-full-admin-visual.spec.ts`.
- Ambiente e execução pertencem à raiz. Não iniciei E2E, build, servidor ou setup/teardown global nesta etapa.
- O runner usará o runtime privado de produção na porta 3018 e a API/banco/stubs locais existentes. URLs/portas efetivas devem ser registradas pela raiz no resultado.

## Verificações da preparação

- ESLint focal de `e2e/ondas-full-admin-visual.spec.ts`: aprovado, exit 0.
- TypeScript focal: `createProgram` com somente o entrypoint desta spec e opções existentes de `e2e/tsconfig.json`, `noEmit`: aprovado, exit 0. Não foi um typecheck global nem uma execução de Playwright.
- Helper de captura da raiz integrado, com PNG/JSON, hash, DOM, Axe e overflow por estado. Rotas UUID são normalizadas como `[id]`. Os resultados continuam identificados como `presentation-fixture`.
- A gestão recebe 300 segundos para percorrer nove áreas, subabas e apresentações de relatórios no mesmo teste. Nenhuma espera de controle foi relaxada; não há sleeps.

## Limites explícitos

- O iframe proprietário do `PaymentElement` não é carregado com credenciais falsas nem substituído por uma UI inventada. A apresentação própria cobre cartão indisponível e os estados de Pix, pedidos e assinaturas; renderização interna da Stripe exige uma fixture de SDK/provedor separada e não está certificada aqui.
- Pix pago e pago após prazo são estados transitórios locais antes do redirecionamento existente. Não representam pagamento no provedor.
- Capturas de carregamento seguram a resposta correspondente e a liberam em `finally`; falhas e decisões usam respostas HTTP locais. A apresentação de suspenso/verificação não concede permissões ao backend.
- Não existe QR no componente administrativo Evolution desta fonte; não foi criado um fluxo ausente por efeito da revisão visual.

## Resultado atual

Etapa em andamento; não há aprovação da fatia completa. Verificações antigas de 23/10 são históricas e não preenchem esta revisão.

A raiz executou `admin-initial`, cujo relatório `output/ondas-v24/admin-initial.json` registra 48 casos D/M: 10 passaram e 38 falharam. Inspeção dos erros: 22 falhas vêm de seletores de alerta que também encontravam o anunciador do Next; 13 vêm das sentinelas de foco do Base UI; três contêm React 418. Os alertas foram delimitados ao `main` ou diálogo correto na spec. A raiz corrigiu a exclusão estreita das sentinelas no helper, preservando as demais verificações Axe. Essas correções ainda exigem nova execução; não convertem falhas antigas em aprovação.

Foram realmente abertas e examinadas por este responsável as 62 pranchas congeladas `output/ondas-v24/admin-initial-boards/board-001.png` a `board-062.png`, cobrindo todos os 246 recortes dos 170 PNGs do lote parcial. Depois, foram abertas as pranchas `admin-initial-boards-remaining/board-001.png` a `board-060.png` (240 recortes; 142 registros tocados). O revisor `ondas_final_visual_audit` abriu e examinou as 59 pranchas restantes, 061–119 (236 recortes), com evidência atribuída em `admin-remaining-public-review.json`. O registro 141 atravessa as duas fatias e foi reconciliado por recortes, sem presumir que um só revisor viu ambos.

O vínculo final de rota, estado, viewport, SHA256 e revisor está em `output/ondas-v24/admin-initial-review-reconciled.json`: 438 registros, 418 hashes únicos, todos os 722 recortes examinados em 181 pranchas. Este agente abriu 122 dessas pranchas; não afirma ter aberto as 59 atribuídas ao outro revisor. A revisão da apresentação capturada não aprova comportamento: cada registro mantém `behaviorApproval: false`/`runtimePassClaim: false`. As imagens anteriores aos fixes continuam sendo evidência histórica, sem aprovação da renderização atual.

Achados materiais e encaminhamento:

- `ADMIN-V01`: a barra de ações nos diálogos de assinatura tinha cantos quadrados e botões junto à borda. Ajustados `border-radius` e padding de `confirmationActions` em `billing.module.css`. Fonte corrigida; nova renderização e captura pendentes.
- `ADMIN-V02`: o checkbox do editor administrativo de planos usava `Input` textual e aparecia como um quadrado cinza grande. A raiz assumiu a correção compartilhada `Input`/`Checkbox`, também necessária aos consumidores de outros fluxos. Nenhuma migração concorrente foi feita neste lote; recheck após build permanece necessário.
- `ADMIN-H01`: capturas de página inteira realizadas após foco/scroll registraram sidebar fixa e atmosfera em posições deslocadas. O conteúdo visível foi examinado, mas essas composições não recebem aprovação final. A raiz normalizou o scroll no helper para a próxima execução.
- `ADMIN-H02`: gráficos de resultado foram capturados no fallback do import dinâmico, que usa `aria-busy` e não `data-skeleton`. A spec agora aguarda a região real e seu SVG, mantendo os estados de carregamento explicitamente separados. Nenhuma mudança de produto foi atribuída à captura antecipada.
- `ADMIN-H03`: modais longos de recursos de plano têm scroll interno. O conteúdo da viewport foi revisado; o rodapé ausente não foi presumido aprovado. `ondas-admin-visual-tools.ts` acrescenta capturas sobrepostas das demais posições do diálogo, restaurando seu scroll ao final.
- A fixture financeira apresentava resumos zerados e séries preenchidas. Corrigida apenas a consistência do DTO local (26 pedidos, R$ 335,40), sem alterar cálculo ou regra comercial do produto.
- `ADMIN-V03`: Mais clicados e Pagadores vazios mostravam só o fundo. Adicionados estados vazios nas duas composições de `OfficeBoard`, preservando o contrato de `ReportView`. Dois testes falharam antes da correção e passaram depois; nova captura pendente.
- `ADMIN-V04`: erro de transporte do editor mostrava também “Link não encontrado”. Agora erro e ausência são mutuamente exclusivos, com `ErrorState` e nova tentativa de leitura; ausência usa `EmptyState` e volta aos links. `useMyLinks.reload` somente repete GET. A lista de links reutiliza a mesma recuperação. Dois testes de composição falharam antes do ajuste; testes de composição e recuperação passam depois. Nenhuma escrita de link ou regra de autorização foi adicionada.
- Os estados negados de disponibilidade e resultado preservam mensagem e `role=alert`, agora na superfície de vidro sem inventar uma ação permitida. O card da fila de correção usa o raio compartilhado `radius-lg`.
- A data quebrada da retenção era outra fixture incompatível: o backend devolve `YYYY-MM-DD`, mas a simulação inicial fornecia ISO com horário. Corrigida somente a fixture para `2025-10-24`; não foi modificado o formatador ou o prazo real.
- Tabelas mobile quebravam palavras curtas e datas no meio. Achado do revisor complementar confirmado na fonte compartilhada; a raiz assumiu o ajuste de legibilidade preservando rolagem horizontal. Recheck pendente.

React 418 permanece aberto, observado em `subscription-past_due` desktop, `settings-filled` desktop e `performance-http-403` mobile. Não foi tratado como falso positivo. A spec diagnóstica `ondas-admin-hydration-diagnostic.spec.ts` reproduz assinatura/configurações/resultado na origem de desenvolvimento existente `http://checklist.localhost:3013`, com os mesmos usuários UUID e sem iniciar servidor. Anexa console, erro e stack completos; HTML do servidor e do cliente são preservados se houver erro. A raiz executará o diagnóstico; até lá não há causa comprovada nem correção declarada.

A leitura offline dos traces preservados de configurações e resultado localizou a falha durante a hidratação do novo documento. Em configurações: navegação em 283969 ms, erro em 284126 ms, primeiro snapshot em 284166 ms. Em resultado mobile: reload em 577809 ms, erro em 577967 ms, resposta 403 interceptada somente em 578066 ms. Portanto o DTO 403 e uma interação posterior não explicam essa ocorrência. O caso de assinatura desktop não tem `trace.zip` preservado; seu erro/contexto permanecem evidência com limite explícito. Resumo da extração: `output/ondas-v24/admin-hydration-trace-summary.json`.

Os HTMLs SSR extraídos (`hydration-27088-server.html` e `hydration-db7ba-server.html`) não geraram erros de parsing nem fechamento implícito no parse5 local. Isso afasta somente a hipótese específica de estrutura HTML reparada pelo parser nesses dois documentos, sem provar determinismo completo. A inspeção de `LiquidLens` confirmou primeiro render `map=null`/frosted e IDs derivados de `useId`; canvas, viewport, transparência e refração são consultados nos efeitos. `SiteNavigation` também lê sessão/viewport nos efeitos, e `AreaFrame` começa com `ready=false` tanto no servidor como no cliente. `DatePicker` inicializa a data atual, mas seu calendário fechado não a imprime no HTML inicial. Nenhum desses fatos confirma a causa; atualizações durante hidratação e diferenças externas à árvore continuam hipóteses a testar, sem supressão de aviso ou edição de produto.

O diagnóstico agora preserva amostras precoces em `DOMContentLoaded` e `window-error` (IDs, lentes, Menu e `main`), associa erro/console à URL e captura os documentos SSR que chegaram pelo navegador. O novo caso de resultado percorre os estados e reloads até 400/403/503; a barreira existente de Menu é observada antes/depois, sem limpar erros acumulados. ESLint da spec e TypeScript focal passaram após essa ampliação. Nenhum runner foi executado por este responsável.

A raiz executou o diagnóstico dev em 24/10/2026, 05:16 UTC: seis casos aprovados, sem retries, em 141 segundos. Foram lidos os 40 anexos JSON de assinatura (nove por viewport), configurações (quatro por viewport) e resultado (sete por viewport). Todos registram zero `pageerror` antes e depois da barreira; nenhuma mensagem de console contém divergência de React/hidratação. Há mensagens HTTP esperadas das falhas simuladas e avisos do driver WebGL sobre `ReadPixels`, preservados nos anexos. Consolidação: `output/ondas-v24/admin-hydration-diagnostic-review.json`. A falha inicial não foi reproduzida neste runtime de desenvolvimento; isso não comprova sua causa nem uma correção, e o novo build de produção ainda precisa confirmar os três caminhos.

## Complemento preparado e checks focais

`ondas-full-admin-variants-visual.spec.ts` acrescenta 12 casos por viewport para superfícies distintas: operações/retorno de assinatura, paginação e tooltip de resultados, preparação/conflitos de anexos, rascunho/storage/falhas de publicação, paginação e menu dos links, detalhes de perfis na moderação, histórico e decisão de denúncias, calendário/conflito/remoção de destaque, retenção, pendências de cobrança, configurações restritas e calendário/período das oportunidades de busca. São 72 estados-base planejados por viewport, além de capturas condicionais de scroll interno; não são 72 aprovações. O diagnóstico de hidratação possui três casos por viewport e não substitui a regressão de produção.

Checks realmente executados pelo responsável desta fatia: ESLint focal dos quatro arquivos E2E e, após os reparos, dos onze arquivos de fonte/testes afetados, exit 0; TypeScript focal dos três entrypoints E2E e imports, exit 0; `billing-screen.test.tsx` e `billing-admin.test.tsx`, 11 testes aprovados antes dos novos reparos. Depois deles: seis arquivos (`office`, página editar, `my-links-resource`, `panel-links`, formulário de correção, `billing-admin`), 15 testes aprovados. A migração dos quatro checkboxes de `BillingAdmin` à primitiva existente também passou em lint e seus três testes. Houve quatro RED de composição observados antes dos fixes e cinco GREEN incluindo o teste de recuperação da leitura. Não se afirma que o teste novo de recuperação foi executado antes da implementação.

A configuração TypeScript temporária vive somente em `output/ondas-v24/admin-review.tsconfig.json`; não houve alteração de configuração global. Nenhum E2E, build, servidor ou reset global foi executado por este agente. A raiz continua responsável por execução integrada e pelo build atualizado.

Os dois usos de `Input type=date` nas oportunidades de busca foram migrados para `DatePicker` após a confirmação do contrato compartilhado `min/max`. Preservados valores ISO, aplicação dos filtros e restrição `Até >= De`. A entrada visual agora usa `dd/mm/aaaa`; o request continua `YYYY-MM-DD`. Novo teste de faixa inválida/correção observado RED → GREEN; cinco testes do arquivo passaram. O E2E existente somente teve a digitação adaptada ao formato visual, mantendo a asserção ISO. Após essa migração, ESLint dos quatro arquivos envolvidos e TypeScript focal de quatro entrypoints E2E passaram, exit 0. Fonte de produto congelada para rebuild/rechecks da raiz.

Os ajustes compartilhados de DatePicker (calendário dentro de diálogo) e ColorPicker (Lens no wrapper persistente), feitos pela raiz, ainda exigem recheck na nova renderização. O runtime usado nas imagens iniciais precede essas correções.

## Complemento de hosts de carregamento

Foram abertos os dois PNGs originais D/M de denúncia carregando (`profile-initial/*9dd9c*/carregando-*.png`). Os campos tinham vidro, mas o host do formulário era apenas uma grade sem superfície. `reports.module.css` e `ReportSubmissionSkeleton` agora compõem o material compartilhado com `LiquidLens`; `ReportForm` usa o mesmo host para manter paridade entre conteúdo e carregamento. `AppealSkeleton` reutiliza a classe e a lente já presentes no formulário vivo de contestação. Não existe captura preservada desse skeleton de apelo em particular; o alinhamento foi confirmado na fonte, sem alegar inspeção anterior desse estado.

Mudanças restritas a apresentação nos três arquivos de moderação; carregamento, controles inertes, transporte, moderação e permissões preservados. ESLint dos dois TSX aprovado; os quatro testes existentes de `report-form.test.tsx` passaram. Nenhum teste novo que apenas reproduza o CSS foi adicionado. Fonte congelada novamente; build e capturas dos hosts atualizados pertencem à raiz.

## Revisão complementar atribuída

Além da fatia administrativa, foram abertas e examinadas as 15 pranchas `primitives-final-boards/board-025.png` a `board-039.png`: 59 recortes, 58 registros completos e 51 hashes únicos, documentados em `output/ondas-v24/primitives-final-resource-review.json`. Não apareceu novo bloqueio confirmado nos botões, foco, campos, selects, confirmações, etapas, tabs e estados fechados de data mostrados. Tabelas com scroll só foram aprovadas quanto às colunas visíveis; isso não certifica as colunas escondidas. Suporte, badges, estados desktop inválidos durante HMR e campos cujo erro foi refinado depois têm recaptura explicitamente pendente, conforme orientação da raiz.

Na revisão pública, este responsável abriu as 23 pranchas 025–047 do lote `public-initial-boards-early`: 89 recortes, 43 registros completos e 41 hashes únicos. O ledger `public-early-resource-review.json` preserva a autoria e o limite de fonte antiga. Um erro real de token inválido mostrava `Validation error.` em inglês; achado encaminhado ao proprietário público, sem alteração desse produto por este revisor.

Na revisão de perfil/recursos, foram abertas todas as 41 pranchas 100–140 de `profile-initial-boards-remaining`: 161 recortes, 122 registros (121 completos), 99 hashes únicos. Somente o registro 283 cruza a fronteira com a prancha 099 do proprietário de perfil. Ledger: `profile-remaining-resource-review.json`. Foram abertos também os dois PNGs originais desktop de confirmação/erro de restauração para confirmar o baixo contraste do título e ícone de fechar do cabeçalho sobre uma prévia clara. A raiz informou correção compartilhada e testes UI; a nova renderização ainda precisa ser capturada. Fora esse cabeçalho, não foi confirmado outro bloqueio de produto na fatia. Estados antigos cujo nome é erro mas cuja imagem ainda mostra ready/skeleton, conteúdo inferior de diálogos longos e refinamentos já aplicados permanecem dependentes de recaptura. Nenhuma fonte de perfil foi editada por este agente.

## Nova ocorrência em produção e diagnóstico de repetição

O build `3npP_KNKYZIKFhEoM1irZ` voltou a registrar React 418 em `availability-suspect` desktop. O trace da terceira navegação documental mostra início em 128862,425 ms, erro em 129027,937 ms e consulta de disponibilidade em 129077,528 ms. A divergência antecede a resposta de negócio. Os três documentos SSR extraídos têm corpo estrutural idêntico (11018 caracteres após remover payload/metadados), sem erros de parsing ou nós implícitos no parse5. Extrações e resumo em `output/ondas-v24/admin-hydration-final-investigation/`. Os snapshots preservados são posteriores à recuperação e não revelam por si o nó que causou o erro. O diagnóstico dev verde anterior não estabelece correção.

A nova spec `ondas-hydration-stress-diagnostic.spec.ts` prepara cem navegações por viewport entre painel, disponibilidade, configurações e resultado 403, usando usuários/recursos UUID próprios. Os testes dev e production têm nomes separados. Produção usa o overlay `runtime.web` e intercepta apenas a resposta local do chunk React conhecido para registrar Fiber esperado, nó DOM, pai, cadeia de componentes e HTML antes do throw 418; o corpo original e lançamento permanecem intactos. O primeiro erro faz o teste falhar após anexar SSR, DOM no evento, DOM final, mutações, diferenças estruturais e imagem. Nenhum erro acumulado é removido. Lint dos dois specs e TypeScript focal passaram. O patch do chunk foi analisado offline: uma assinatura encontrada, JavaScript parseável e corpo original preservado. A execução ainda pertence à raiz.

A falha de Anexos neste lote era causada pelo mock de decisão: o regex também correspondia ao GET `/admin/moderation/media`, devolvendo 409 antes de carregar a fila. O mock agora responde somente a POST e deixa o GET cair na fixture específica. A busca textual é limpa antes da troca de aba; as buscas reais das duas filas têm estados independentes. Foi acrescentada a captura do conflito de aprovação do anexo, preservando simulação local e nomes atuais de rejeição. Nenhuma regra ou fonte de produto foi alterada neste diagnóstico.

## Revisão do lote final inicial e hosts corrigidos

Este responsável abriu as 30 pranchas de `admin-final-boards-early`, cobrindo 102 PNGs desktop, 119 recortes e 101 hashes únicos. Ledger próprio: `output/ondas-v24/admin-final-early-resource-review.json`. O proprietário público revisou o mesmo conjunto independentemente; os hashes não devem ser somados como cobertura nova. Não foram confirmados outros bloqueios além do resultado transparente da publicação, resumo de validação opaco e erro de pedidos coexistindo com vazio. Este último foi corrigido pelo proprietário de perfil. Alguns estados de validação ainda incluem tooltip nativo do navegador em inglês sobre o erro inline em português; a área encoberta não recebe aprovação de pixels.

O PNG original `submission-result-dialog-a0dc43c8a3.png` foi aberto para confirmar texto/cartão atravessando o modal. O host nativo agora compõe Lens, tinta forte e blur do popup compartilhado, em painel interno que acompanha toda a altura do conteúdo e preserva scroll. O resumo de validação mantém a indicação semântica de erro com tinta translúcida e Lens. A mesma falha de transparência foi confirmada abrindo as pranchas 009–012 do remainder em `/admin/destaques`: esse diálogo já possuía Lens, mas usava tint/frost leves. Ele recebeu a tinta de popup e painel interno com altura natural, mantendo o material também em conteúdo longo. Sem alteração de submit, foco, cancelamento, prazos, elegibilidade ou transporte.

Após os dois primeiros hosts, lint e os 19 testes existentes da publicação passaram. Depois do painel de Destaques, lint dos dois TSX e os 23 testes existentes nos dois arquivos afetados passaram. Nenhuma renderização atualizada foi aberta ainda, portanto esses três hosts permanecem `source-fixed-awaiting-runtime-review`.

Foi preparado `ondas-hydration-cdp-probe.ts` e acoplado opcionalmente aos hooks da spec administrativa original por `ONDAS_HYDRATION_CDP=1`. O breakpoint condicional no `rD` do chunk real coleta o Fiber esperado, DOM/pai, cadeia, stack e HTML antes do throw, retorna false e não pausa. Não intercepta a resposta nem modifica o chunk; um binding CDP preserva o payload mesmo após outra navegação. Os erros originais continuam sendo falhas de teste. Lint e TypeScript focais passaram; uma avaliação local com dados sintéticos confirmou retorno false e payload esperado, sem executar navegador. Execução integrada continua sob responsabilidade da raiz.

## Evidência do erro de hidratação no cenário original

A raiz executou o probe CDP na jornada administrativa original. O anexo `output/ondas-v24/418-cdp-first.json`, lido por este responsável, registra a falha já em `/painel`, durante o login: React esperava `div#main-content`, mas o cursor real apontava para o `main` de carregamento que já estava dentro desse mesmo `div`. A cadeia passa por `SiteShell`; as lentes ainda estavam no estado inicial `frosted`. Não houve erro do probe e o lançamento original de React 418 permaneceu registrado. O HTML antes do throw foi preservado em `admin-hydration-final-investigation/cdp-before-throw.html`. Essa evidência desloca a investigação para a hidratação do shell, antes da consulta de disponibilidade, sem atribuir o defeito aos dados de negócio ou à refração posterior.

O experimento da raiz trocando somente o efeito de sessão em cache por `useEffect` não resolveu: três casos passaram e um voltou a falhar. O anexo `418-cdp-effect.json`, também lido, mostra novamente `div#main-content` esperado contra seu `main` filho, agora em `/admin/disponibilidade`. A raiz reverteu essa linha. A ausência de erro nas cem navegações do stress anterior não é tomada como prova de correção: o cenário e a instrumentação podem afetar o timing.

A instrumentação opcional foi enriquecida com `stateNode`, propriedades dos pais, flags/lanes, alternates e relações de identidade entre o Fiber esperado, pai de hidratação e nós DOM. Lint, TypeScript focal e avaliação sintética da condição passaram; o breakpoint continua retornando false e não suprime a exceção. A raiz identificou correspondência com o replay de host/thenable descrito no [PR React 35494](https://github.com/react/react/pull/35494/files) e está preparando uma boundary local de Suspense com regressão específica. Essa investigação e a futura confirmação em produção pertencem à raiz; este relatório não declara a causa corrigida.

## Revisão final complementar 127–189

Foram realmente abertas e examinadas todas as 63 pranchas `admin-final-boards-remainder/board-127.png` a `board-189.png`, cobrindo 249 recortes de 160 registros e 159 hashes únicos: 42 registros desktop e 118 mobile. O ledger `output/ondas-v24/admin-final-remainder-resource-review.json` registra rota, estado, SHA, pranchas, recortes e autoria. Há 159 registros completos nesta fatia; o registro 303 tem dois de três recortes aqui e começa na prancha 126 do outro responsável. Não se afirma ter aberto esse recorte superior.

Não foi encontrado novo bloqueio material nas pranchas 171–189 além dos dois pontos de Resultado já identificados antes. Editor com/sem anexos, imagens aprovadas/pendentes, uploads, erro com tentativa, ausência, filtros, lista de situações e formulários de autenticação mantêm texto e ações legíveis nos pixels capturados. Os anexos azuis são fixtures determinísticas: permitem avaliar encapsulamento e controles, não a qualidade de fotografia real. Em tabelas horizontais, somente as colunas visíveis foram examinadas. O tooltip nativo do navegador permanece sobre pequenas áreas de validação em algumas imagens; essas áreas dependem de recaptura limpa.

Achados autorizados e corrigidos na fonte, ainda sem recaptura de produção:

- `ADMIN-FINAL-R04`: em disponibilidade mobile, “Tempo pago pausado” era a única seção sem o host de vidro dos blocos vizinhos. Agora usa o `WorkspaceSection` existente; condição, lista, saldo e cálculo de tempo permanecem iguais. ESLint focal aprovado.
- `ADMIN-FINAL-R05`: avisos de retenção, cobertura parcial e histórico não vinculado em Resultado usavam painéis âmbar opacos. A indicação semântica de warning e o texto permanecem, com tinta translúcida, superfície compartilhada e Lens.
- `ADMIN-FINAL-R06`: “Como os resultados são calculados” tinha somente borda quando fechado. O disclosure nativo agora fica em wrapper persistente com Lens e raio de 12px, preservando conteúdo, semântica e interação.

Após os dois últimos ajustes, ESLint focal passou e os sete testes existentes de `performance-report.test.tsx` passaram. Não foram criados testes que apenas espelham CSS. A fonte desta fatia está congelada. Os seis achados visuais corrigidos neste lote permanecem `source-fixed-awaiting-runtime-review`; imagens antigas não aprovam a nova renderização, e as jornadas com React 418 continuam sem aprovação de comportamento. Nenhum E2E, build, servidor ou operação global foi executado por este responsável nesta etapa.

## Índice de artefatos efetivamente examinados

`output/ondas-v24/opened-image-hashes.json` consolida as evidências dos revisores, sem promover qualquer matriz ou fonte a aprovada. Foram conferidas a assinatura PNG e a correspondência SHA256 dos 1524 arquivos originais representados pelos 12 ledgers de pranchas e pela recaptura original bem-sucedida de Galeria. O índice utilizável contém 966 hashes únicos em 994 arquivos; outras 530 ocorrências ficam em `excluded`, com os motivos preservados.

As fronteiras administrativas 180 e 303 têm união comprovada dos três recortes por dois revisores; a fronteira 283 de perfil tem os dois recortes unidos. Isso confirma cobertura do PNG, sem aprovar colunas ou trilhos fora da área capturada. A exclusão conserva defeitos conhecidos, estados nomeados incorretos, áreas encobertas por tooltip, scroll interno/colunas/rails pendentes, versões superadas e o `Fields/select-open` desktop branco durante HMR. A Galeria desktop com falha real de imagem foi excluída; seu original de sucesso, realmente aberto pelo revisor público, foi incluído com hash próprio.

O único uso autorizado deste índice é reutilizar uma inspeção de pixels quando uma captura nova tiver exatamente o mesmo SHA256. A execução nova ainda precisa verificar estado, comportamento, runtime e acessibilidade separadamente. Todos os registros mantêm `sourceApproved:false` e `behaviorApproved:false`. Esta consolidação foi inteiramente offline.

## Revisão da recaptura administrativa com CDP

Foram realmente abertas todas as 66 pranchas `admin-verified-cdp-boards-early/board-133.png` a `board-198.png`: 262 recortes de 173 registros, 172 completos nesta fatia e 170 hashes únicos, com 83 registros desktop e 90 mobile. A evidência por PNG, hash, recorte e estado está em `output/ondas-v24/admin-verified-cdp-resource-review.json`. O registro de fronteira 382, `evolution-operation-error` desktop, tem somente o último de três recortes nesta revisão; os dois superiores foram abertos pelo responsável de perfil na prancha 132. Não houve reutilização da inspeção por hash neste lote.

Não foi identificado novo defeito material nesta fatia. As capturas desktop/mobile confirmam o novo material do modal de resultado da publicação, resumo de validação, avisos de Resultado e disclosure persistente de cálculo (`ADMIN-FINAL-R01`, `R02`, `R05`, `R06`). As quatro capturas horizontais de Resultado também foram abertas: as posições da tabela diária cobrem os intervalos 0–322 e 96–418px, e as da tabela de superfícies cobrem 0–322 e 44–366px, incluindo as colunas finais. O anexo azul permanece uma fixture de apresentação, sem avaliação de fotografia real.

Dez PNGs de autenticação continuam parcialmente encobertos pelo tooltip nativo de validação: `auth-reset-validation`, `auth-register-validation`, `auth-forgot-filled`, `auth-forgot-validation` e `auth-login-validation`, em desktop/mobile. Essas áreas exigem recaptura limpa e não são aprovadas por terem arquivo gerado. Nesta fatia, os skeletons examinados de editor, listagem e integração aparecem no PNG; isso não resolve as capturas de carregamento vazias identificadas pelos outros revisores. A aprovação de comportamento e a conclusão sobre a correção de React 418 continuam sendo consolidadas pela raiz.

## Interceptação do cenário de erro de perfil

Foi lido o trace do primeiro caso de `profile-final`, `/painel/perfil` desktop. A primeira requisição foi retida para capturar carregamento. O trace registra sua liberação em 10438ms, remoção do interceptador em 10439ms, novo registro do mesmo regex concluído em 10440ms e a navegação seguinte logo depois. Entretanto, o próximo GET `/me/profile`, em 11009ms, respondeu 200 sem chamar o callback da fase de erro. Portanto, esse arquivo não comprova o estado de erro pretendido. Não foi atribuída falha ao produto; a origem interna da perda de interceptação continua sem demonstração conclusiva.

Com autorização da raiz, `readStates` passou a manter um único handler ativo nas fases de carregamento e erro, liberar e concluir a primeira carga antes da segunda navegação e exigir resposta GET 503 antes de examinar o alerta. O cleanup remove somente o handler próprio ao final, sem `unrouteAll` entre as fases. ESLint focal dessa spec passou. A nova execução integrada pertence à raiz e ainda não foi declarada aprovada por este responsável; nenhum E2E, build ou servidor foi executado aqui.

## Remainder administrativo com CDP, pranchas 001–016

Todas as 16 pranchas atribuídas de `admin-verified-cdp-boards-remainder` foram abertas e examinadas: 64 recortes, 28 PNGs completos e 22 hashes únicos, todos mobile. O ledger `output/ondas-v24/admin-verified-cdp-remainder-resource-review.json` preserva os hashes originais verificados, pranchas, recortes e notas por estado. Não há registro parcial na fronteira desta fatia.

Não foi identificado novo defeito material. Contas preenchidas, vazios, erros com tentativa, filtros de data e variantes de gráficos/tabelas financeiras mantêm texto e ações legíveis no material Ondas. Os gráficos deste conjunto contêm os dados desenhados; não há captura de main vazio nem tooltip nativo encobrindo conteúdo. As colunas das tabelas foram examinadas nas capturas complementares: Horários cobre os intervalos 0–324 e 108–432px; Pagantes cobre 0–324, 259–583 e 396–720px. Em Receita, a captura original mostra Dia/Pedidos e a deslocada mostra Pedidos/Receita. Isso cobre as colunas exibidas, sem inferir aprovação de páginas de paginação que não foram abertas nesta fatia.

Os valores financeiros são fixtures de apresentação; a revisão não certifica cálculos, downloads CSV, operações comerciais, teclado ou animação. O ledger mantém aprovação de fonte e comportamento separadas. Nenhum produto, navegador, E2E, build ou servidor foi alterado ou executado nesta revisão offline.

## Fallback autônomo de falha global

A raiz identificou que a falha global ainda tinha fundo sólido e botão plano. Após autorização, o documento de `app/global-error.tsx` passou a compor `global-error-content.tsx`, com CSS próprio: atmosfera navy/turquesa, ondas estáticas, painel e ações em vidro, fallback sólido sem suporte a backdrop, controles de pelo menos 44px, foco, transparência reduzida e cores forçadas. Essa composição não importa o shell, tokens globais, LiquidLens nem o agregador de UI, pois precisa continuar disponível quando a raiz falha. O símbolo decorativo reutiliza o desenho existente de recarregar. O título, mensagem pública segura, recarga completa e saída para o catálogo foram preservados.

O conteúdo separado permite a story `GlobalFailure` sem aninhar html/body; o documento real mantém html/head/body. O novo contrato semântico foi observado falhando antes da implementação e depois passou junto ao teste existente de mensagem segura/recarga: dois testes aprovados. ESLint dos cinco arquivos TSX/spec envolvidos e parse CSS passaram. A spec existente de primitivas inclui o novo estado, verificação de 44px e capturas de foco/cores forçadas. Esses E2E e a inspeção dos novos pixels pertencem à raiz e ainda não foram declarados aprovados aqui. O novo arquivo eleva o inventário estático a 540 arquivos, pendente de conciliação final.

## Apoio à revisão pública final, pranchas 051–100

As 50 pranchas atribuídas de `public-product-final-boards-final` foram realmente abertas, assim como o PNG original de erro ao favoritar. São 198 recortes, 87 registros (86 completos), 83 hashes únicos, 46 desktop e 41 mobile. `output/ondas-v24/public-product-final-resource-review.json` registra os hashes verificados, recortes e notas. A fronteira 124 tem apenas seu recorte final y2700 nesta revisão; os três superiores são responsabilidade do revisor de perfil. Não se afirma ter aberto esses recortes superiores.

Home, cartões com e sem fotografia, indicação de patrocinado, sugestão de busca, consentimento, idade, convites, cancelamento de resumos, páginas legais e temas dos publicadores foram examinados nos estados atribuídos. A paleta dos temas pessoais permanece preservada. A lista mascarada após erro de busca corresponde ao `blocked` atual do ProfileExplorer, que inclui `Boolean(error)` e bloqueia os links antigos; a observação não foi tratada como corrida de captura nem alterou regra de navegação.

Dois pontos inicialmente ficaram fora de aprovação: `PUBLIC-PRODUCT-R01`, erro ao favoritar desktop (registro153), permite que metadados do cartão atravessem a mensagem sobreposta; a fonte usa `p.saveError` sem lente/blur, e a raiz recebeu a evidência. `PUBLIC-PRODUCT-R02`, registros183/186 desktop/mobile, mostra o retângulo de iframe vazio no estado chamado player carregado. A fixture deveria mostrar a mensagem explícita de player local; a spec esperava somente a caixa do iframe. O responsável público adicionou espera pelo texto dentro do frame para a próxima recaptura, sem alteração do produto. Essas três imagens não viram sucesso por terem sido geradas. Nenhum produto, navegador, E2E, build ou servidor foi alterado nesta revisão pública.

Na triagem posterior de `profile-search-error`, o responsável de perfil confirmou que o erro era apresentado como busy/skeleton e mantinha paginação disponível. Após autorização da raiz, corrigiu essa projeção preservando dados internos e retry; informou dez testes aprovados com regressão RED/GREEN e lint. O ledger registra `PUBLIC-PRODUCT-R03` e exclui os hashes antigos124/138 da aprovação da fonte nova. A recaptura desktop/mobile continua pendente.

## Triagem sintática da referência Ondas em desenvolvimento

O trace de `reference-mobile-rails-final`, detalhe Ondas mobile, contém `SyntaxError: Invalid or unexpected token`, sem URL, posição ou stack. A leitura offline encontrou HTML completo de67585bytes com fechamento html; os23 scripts inline foram compilados por `vm.Script`, sem execução e sem falha sintática. As nove referências externas estão no HTML, mas os corpos desses JS não foram preservados pelo trace (`content.size=-1`, nenhum recurso JS correspondente). Os sete chunks locais disponíveis em `.next` também compilam, porém são datados de23/10 e não comprovam os bytes servidos na falha de24/10.

`output/ondas-demo/reference-ondas-detail-syntax-triage.json` registra hashes e limites sem copiar HTML, scripts ou credenciais. A evidência não demonstra SSR truncado, corrida de HMR ou defeito sintático do produto. A falha original permanece registrada, e o recheck isolado do dev pertence à raiz. Nenhum navegador, fetch, teste, build ou reinício foi executado por este responsável na triagem.

## Índice atualizado e proposta de conciliação

O índice de pixels foi atualizado com as revisões CDP administrativas, remainder, público final, primitivas finais e originais manuais da raiz. A verificação offline conferiu2547 PNGs originais, incluindo assinatura e SHA. Há1378 hashes utilizáveis em1791 arquivos;756 ocorrências ficam excluídas com seus motivos. As fronteiras219/382 administrativas e124 pública tiveram união de todos os recortes e autoria preservada. Os149 hashes das primitivas atuais estão incluídos; duas limitações históricas de width1280/tabela mobile foram superadas somente após confirmação explícita da raiz de que abriu os novos recortes completos. A liberação fica limitada aos pixels, sem reaproveitar aprovação antiga de comportamento.

CTA inválido54/55, erro de busca de perfil124/138, aviso ao favoritar153 e player vazio183/186 permanecem excluídos nas imagens anteriores. Novas capturas somente entram após abertura/revisão real. O auxiliar aceita `--review-ledger` para incorporar os próximos ledgers, mantendo as verificações de cobertura e sem promover matrizes.

A leitura da matriz confirmou95 páginas e95 fontes correspondentes, sem rota ausente. O escopo de produção contém agora540 arquivos (420TSX/120CSS), cinco acima do CSV histórico. O script ignorado `output/ondas-demo/prepare-ondas-reconciliation.py` prepara candidatos com hashes atuais, pendências e proveniência; nunca grava em docs. A execução parcial verificou854 registros e detectou92 hashes diferentes do inventário anterior, sem aprovação automática nem edição das matrizes reais. Os cinco arquivos novos foram lidos e têm suas composições/evidências localizadas registradas na proposta. `output/ondas-demo/reconciliation-final-plan.md` descreve como a raiz poderá acrescentar os lotes finais, validar snapshot e conciliar estados consumidores sem transformar existência de artefato em aprovação. Os números de hash/delta dependem do último freeze e devem ser recalculados se a fonte mudar.

## Carregamentos administrativos finais v2, pranchas 001–062

Todas as 62 pranchas atribuídas de `admin-loading-auth-final-v2-cdp-boards-dedup` foram abertas e examinadas: 248 recortes, 149 registros completos, 129 hashes únicos, 101 desktop e 48 mobile. O ledger `output/ondas-v24/admin-loading-auth-final-v2-cdp-resource-review.json` guarda recortes, autoria, SHA dos PNGs originais verificados e os limites por estado. Não há registro parcial na fronteira desta fatia.

Os skeletons agora aparecem nos pixels: Configurações desktop na prancha002 e mobile nas005–006; Moderação Links desktop na011 e mobile nas017–018; gestão/Office desktop na039, incluindo os quatro resumos e os dois painéis em carregamento. Nenhuma dessas capturas repete o main vazio observado nos lotes anteriores. Em Configurações, a consulta independente do limiar já mostra indisponibilidade enquanto a consulta de facetas fica retida; o retry e o skeleton convivem sem ocultar a tela.

Anexos e conflitos de revisão, decisões desabilitadas, modais de recusa, páginas/permanentes em revisão, relatórios, gráficos, tabelas, filtros, vazios, erros e confirmações permanecem legíveis no vidro. As capturas complementares da tabela de oportunidades mobile foram todas abertas nas055–057 e cobrem os intervalos0–324,259–583,518–842 e540–864px; todas as colunas exibidas foram vistas. Não se infere revisão de páginas adicionais da paginação ou de abas fora da posição capturada.

O único limite de captura desta fatia é `ADMIN-LOAD-V2-R01`: o tooltip nativo inglês continua sobreposto ao texto inline PT-BR na validação de recusa de anexo, desktop na009 (registro22) e mobile na014 (registro41). Esses dois hashes estão marcados `recapture-required-native-validation-tooltip`, sem aprovação de pixels limpos e sem atribuir automaticamente um defeito ao produto. Não há outro novo achado material nesta revisão.

A fatia001–062 não contém as páginas de autenticação nem o carregamento Office mobile, que pertencem à revisão da raiz nas063–124. O resultado14/14 pertence ao executor central; esta revisão offline não executou navegador, E2E, build ou servidor, não alterou produto e não promoveu fonte/comportamento/matriz.


### Revisão perfil completa — pranchas iniciais001–120 (24/10/2026)

Abri realmente as120pranchas e480recortes:369registros (368 completos,1fronteira),365SHA,260desktop/109mobile. Ledger: `output/ondas-v24/profile-complete-final-early-resource-review.json`; assinaturaPNG eSHA originais conferidos. Sem browser, E2E, build ou servidor nesta revisão.

Material Ondas e legibilidade verificados nas composições de edição, aparência, blocos, contatos, distribuição, permissões, idiomas, media kit/calendários, diagnóstico, favoritos, comparação, canais, conflitos, prévias e estados de carregamento. Temas do publicador preservados. Estado inválido do ColorPicker desktop está cortado no final da viewport (registros58/59, prancha022): captura complementar necessária, sem inferir defeito.

Defeito confirmado em Endereço próprio: erro inicial também apresentava falso estado de ausência e plano necessário (338/342, pranchas108/110). Corrigido somente o artigo dependente do DTO: renderiza durante skeleton ou com dados reais; ErrorState/retry e dados anteriores preservados. Unit RED1/6→GREEN6/6 e lint focal passaram. Fonte congelada; pixels antigos permanecem excluídos até recaptura. Fronteira368de Assistente tem1/2recortes comigo e inferior na121da raiz. Falhas conhecidas do runner não viram aprovação comportamental.


### Rechecks finais de moderação e fallback geral (24/10/2026)

Gerei pranchas estáticas offline com sharp já instalado, sem navegador/servidor, e abri todas: Moderação12pranchas/48recortes/38PNG, GlobalError2pranchas/6PNG. Ledgers `moderation-validation-clean-final-resource-review.json` e `global-failure-final-resource-review.json` em `output/ondas-v24/`. Hashes originais conferidos.

Rejeição de anexos D/M agora mostra validação inline em português sem balão nativo sobreposto; hashes antigos continuam excluídos. Moderação conserva leitura de cards, menus, skeletons e modais. Fallback geral estático Ondas e ações legíveis nos seis estados ready/keyboard-focus/forced-colors D/M; foco realmente visível nas imagens. É composição Storybook autônoma, sem alegar jornada de falha real de raiz ou execução de reset em produção. Nenhum novo defeito material confirmado nestes44PNG.


### Índice de pixels e conciliação offline — atualização24/10/2026

`output/ondas-v24/opened-image-hashes.json` foi atualizado para2274SHA elegíveis/2931arquivos,834ocorrências excluídas e3765originais com assinaturaPNG eSHA conferidos. Só reutiliza pixels idênticos; fonte e comportamento continuam falsos. Ledgers novos incluem carregamento/autenticação144da raiz, perfil369meus+89da raiz+133públicos, variantes recheck48, favoritos36, moderação38, fallback6 e recheck original1da referência Ondas mobile. Preservadas16exclusões da raiz,14exclusões completas do perfil público, meus4registros de ColorPicker/endereço, e antigas falhas de tooltip/blank/HMR/rails. Fronteira368de Assistente fechada2/2 por união explícita minha+raiz.

Proposta em `output/ondas-demo/reconciliation-closure-proposal/`:95rotas,540fontes(420TSX/120CSS),109hashes alterados e5novos.21lotes de capturas+22reports explícitos produziram2772registros;2554associados a rotas reais, todos com teste de origem identificado por project+screenshot+SHA.99capturas pertencem a casos falhos, preservados em `report-outcomes.json`;218capturas Storybook ficam fora das95rotas. Em `route-missing-evidence.json`, sete combinações mobile ainda não têm pixels elegíveis: distribuição,denunciar,métricas de equipe,equipe,métricas de campanha,prévia de campanha e alias/painel/visao. Cinco têm capturas ainda não abertas;duas têm pixels abertos excluídos. Isso não é declaração de falha de rota.

Nenhuma matriz real foi alterada e nenhuma aprovação foi gerada. A proposta confere todos os hashes da fonte e das matrizes antes/depois, mas mudanças futuras exigem nova execução. Entradas reproduzíveis em `output/ondas-demo/reconciliation-closure-inputs.json`; após congelamento e últimos ledgers, atualizar índice e reexecutar o preparador, sem promover artifact a validação.


Atualização posterior: índice com2300SHA elegíveis,2957arquivos,836ocorrências excluídas e3793originais conferidos. Incluídos `public-image-video-material-final-public-review.json` e os2originais de `public-profile-search-error-final-public-review.json`; playerfullPage24/25 permanece excluído apesar dos gates QA verdes. Proposta regenerada com índice atual: hash de111fontes diverge do inventário anterior; demais contagens95/540/2772/22e sete combinações mobile pendentes preservadas. As matrizes reais continuam intactas.


### Seleções administrativas/comerciais e checkout — rodada final (24/10/2026)

Abri todas58pranchas novas: admin-choices-material-final30(96PNG/119recortes), commercial-choices-material-final21(44PNG/84recortes), checkout-radio-material-final7(26PNG/27recortes).166PNGnovos/230recortes;25imagens idênticas reutilizadas somente porSHA e proveniência anterior. Originais e assinaturas conferidos. Ledgers `*-resource-review.json` dos três lotes em `output/ondas-v24/`. Reports originais completos registram8/8+6/6+2/2, sem executar testes adicionais aqui.

Checkboxes selecionados/habilitados/desabilitados e radios escolhidos/foco estão visíveis em vidro e turquesa. Calendários dentro do modal íntegros D/M, diálogos longos com complemento de scroll e ações legíveis. Estados de assinatura, pending/erro/reconcile, indisponibilidade e Pix mock sem novo defeito material confirmado. O novo resume-payment mobile mostra conteúdo, não a antiga captura vazia. Nenhuma aprovação comercial, de pagamento real, de fonte ou de comportamento decorre destes pixels. Sem alterações de produto/servidor/browser/E2E/build.

### Conciliação final de evidências — 24/10/2026

Índice regenerado após os últimos ledgers de menus, vídeo em viewport, equipe/calendário/feedback e confirmação de desativação: `output/ondas-v24/opened-image-hashes.json`. São 2.879 SHA elegíveis, 3.643 arquivos associados, 876 ocorrências excluídas e 4.519 PNG originais com assinatura e hash conferidos, derivados de 39 ledgers de pranchas e revisões explícitas dos originais. As oito fronteiras de recortes têm união completa e verificada. O índice permite reutilizar somente pixels novos com SHA exatamente igual; capturas antigas com defeito, página vazia, estado errado, partes não vistas ou falha conhecida continuam excluídas. Os dois fullPage com iframe vazio não substituem os novos recortes de viewport nos quais o player foi realmente visto.

Proposta final em `output/ondas-demo/reconciliation-closure-proposal/`: 95 rotas, 540 fontes (420 TSX e 120 CSS), cinco fontes novas e 112 hashes existentes alterados em relação ao inventário anterior. Foram conferidas 3.332 capturas de 30 lotes e os resultados originais de 31 reports. `route-device-evidence.csv` contém 190 linhas: 95 desktop e 95 mobile. Há 188 combinações com captura e pixels abertos; as duas restantes são o alias `/painel/visao`, cujo código redireciona para `/painel` sem UI própria, com evidência do destino atribuída explicitamente. Portanto, zero combinações de rota/dispositivo sem evidência básica; isso não afirma aprovação de todos os estados ou do comportamento do redirecionamento.

`report-outcomes.json` preserva falhas e tentativas originais; uma captura alcançada não transforma teste falho em sucesso. Todas as 190 linhas mantêm `sourceApproved=false` e `behaviorApproved=false`. Nenhuma escrita foi feita nas matrizes reais, nenhuma aprovação automática foi criada e a conferência de hashes antes/depois passou. Snapshot em `source-snapshot.json`; entradas reproduzíveis em `output/ondas-demo/reconciliation-closure-inputs.json`. Fonte ou evidência alterada depois desse snapshot exige regeneração. Este fechamento é documental/offline; os checks e execuções centrais permanecem atribuídos à raiz.

### Conciliação estrita por estado e confirmação por arquivo — 24/10/2026

O diagnóstico estrito inicial encontrou 54 combinações nominais sem reunir pixels elegíveis e teste de origem aprovado, apesar da cobertura básica de todas as rotas D/M. Atribuição deste revisor: 18 combinações de administração, referências públicas, player e resultado do destaque. `output/ondas-v24/closure-state-resource-triage.json` preserva os artefatos antigos, motivos de exclusão, metadados geométricos e provas atuais. Não foi presumida equivalência apenas pelo nome.

Em estornos havia uma lacuna real: a captura `refunds-filter-empty` vinha depois do conflito409 e mantinha o erro, impedindo o EmptyState pela condição `!error`. Ajustei somente a QA para preservar a composição como `refunds-resolution-error-filter-empty`, recarregar o GETfixture e exigir quatro cards/nenhum alerta antes de filtrar. Agora exige EmptyState real, zero cards e zero alertas antes da captura pura. A raiz executou a rodada `refund-filter-complete` (2/2); abri todas as três pranchas novas, oito PNG/11recortes, com oito duplicatas anteriores reutilizadas somente por SHA. Vazio puro e combinação com erro estão distintos e legíveis em vidro D/M. Ledger: `refund-filter-complete-resource-review.json`. Lint focal da spec passou; não executei runtime/E2E/build.

As demais equivalências foram comprovadas assim:

- Seis tabelas financeiras mobile mudaram o ordinal de região3 para região1. Os metadados atuais mantêm exatamente os mesmos aria-label, largura visível e largura total; os recortes atuais cobrem da posição0 à borda direita. São provas do lote aprovado `admin-loading-auth-final-v2-cdp`, aberto pela raiz. Os arquivos antigos somente com colunas à esquerda continuam excluídos.
- Duas referências mobile, Cartões-postais e Cinema, têm página inteira e três recortes sobrepostos do trilho no lote atual aprovado e aberto pelo revisor público. Cinema inicia em0; Cartões-postais registra4px por scroll snap. O revisor confirmou dados e selo da primeira carta legíveis, preservando a medição4 em vez de afirmar0. São referências dev, sem aprovação de produção.
- Dois players D/M usam agora a captura de viewport com texto do iframe realmente visto. Os fullPage antigos com iframe vazio permanecem excluídos como prova do player.
- Quatro capturas auxiliares mobile de tabelas atrás do Select aberto foram substituídas pelo popup em viewport e pelas mesmas tabelas da última página em posições sobrepostas, todas no cenário atual aprovado. Label, largura e extremos de scroll foram cruzados; a spec atual usa `fullPage=false` ao abrir o popup.

Bauhaus/Jardim tinham somente uma observação experimental do ícone patrocinado parcialmente interceptado pela máscara da foto. O próprio revisor confirmou os dois arquivos atuais, mantendo `excludeFromSuccessfulState=false` e `productionApproved=false`; a exceção é por arquivo/SHA, não pela remoção global da observação. O suplemento da demo também entrou no índice: seus dois mobile anteriores à decodificação seguem excluídos, sem inferir Axe a partir da inspeção estática.

O índice agora suporta `confirmedCurrentCapture` apenas com arquivo completo, SHA, revisor, justificativa e evidência de teste atual aprovado. Metadados de runtime/Axe atuais e união completa dos recortes continuam obrigatórios. A conciliação respeita exclusões por arquivo/SHA, mesmo que outro arquivo atual compartilhe pixels válidos. Autoteste e31pares reais passaram: arquivo atual elegível; arquivo antigo explicitamente excluído continua falso. Prova: `exact-file-override-self-check.json`.

Estado final desta revisão: índice com 2.928SHA elegíveis/3.696arquivos, 861ocorrências excluídas, 4.558registros abertos e 4.557originais físicos conferidos, provenientes de42ledgers de pranchas. Proposta regenerada: 540fontes, 95rotas/190linhas D/M, zero lacunas básicas, 3.348capturas/32reports. Diagnóstico estrito: 436testes únicos com último resultado aprovado; 1.989estados nominais; 14nomes históricos ainda distintos. Todos os14 estão descritos, um a um, em `closure-semantic-resource-final-dispositions.json`, com rota/estado/device e provas arquivo/SHA/ledger/report/estado para leitura e decisão da raiz. Nenhuma nova captura está pendente nesta fatia. Isso não é promoção automática desses estados, da fonte ou do comportamento; matrizes reais permanecem intactas. Nova conferência dos540hashes mostrou zero drift após o snapshot.
