# CI/CD — Tem Link Aqui

## Causas observadas

Os runs [39191196885](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/39191196885) e [39469049424](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/39469049424) falharam no audit do backend: `sharp` 0.34.5 trazia vulnerabilidades high. O segundo também terminou com o E2E cancelado pelo limite de 45 minutos. `web` e `images` passaram nesses runs. O lockfile agora usa `sharp` 0.35.5/libvips 1.3.4 e o patch transitivo de `fast-jwt`; o limiar do audit foi preservado.

Na auditoria refeita em 21/10/2026, o Vite também passou a bloquear os dois pacotes por vulnerabilidades high de `launch-editor`. Atualização compatível pelo lockfile: backend 6.4.5 e frontend 7.3.7, sem `audit fix --force`. Permanecem alertas moderados: dez no OpenTelemetry do backend e um no Next 15.5.26 do frontend; não foram tratados como ausência de vulnerabilidades.

A reprodução local encontrou seletores antigos após mudanças já existentes na navegação, isolamento incompleto de fixtures e medições durante carregamento/animação. Os testes foram atualizados para o contrato atual. Um defeito de apresentação também foi corrigido: o painel de abas em encerramento permanecia visível; agora o CSS compartilhado o oculta e a regressão exige isso pelo ID real do painel anterior.

As abas do esqueleto de carregamento da equipe agora ficam desabilitadas: o clique antes da montagem da tela era perdido, causando falha intermitente no mobile. O componente compartilhado tem teste para esse estado e para a liberação das abas após o carregamento. Os testes PostgreSQL dos workers de moderação e disponibilidade passaram a respeitar `REDIS_URL`, mantendo a porta anterior como fallback.

As referências desktop de `/painel/links/novo` e `/admin/configuracoes` foram comparadas visualmente antes de atualizar: ainda mostravam a sidebar antiga. A navegação atual já estava no HEAD da sessão; os formulários e suas regras foram preservados. Não foram alteradas tolerâncias de screenshots nem desativadas regras Axe. Imagens anteriores/diffs e logs locais ficam em `output/ci-investigation/` (ignorado pelo Git).

Os testes de download leem o stream fornecido pelo Playwright, em vez de depender do caminho do arquivo no computador do navegador. Isso permite validar CSV, backup JSON e QR também com Chromium remoto, preservando as verificações de conteúdo, dados privados e decodificação real do QR.

A rodada funcional Linux encontrou um defeito real da arte de divulgação: `document.fonts.load` recebia a lista completa de famílias do Next. A fonte principal carregava, mas a face de fallback dependia de Arial e rejeitava com `NetworkError` no Linux sem essa fonte. A geração agora aguarda somente a família principal e mantém a lista completa nas medições e no desenho. O E2E força a ausência do fallback e continua exportando PNG real, conferindo dimensões e decodificando o QR.

## Validação

`.github/workflows/ci.yml` roda em push, pull request e disparo manual:

- `verify`: instalação pelo lockfile, Prisma generate/migrations, lint, tipos, testes unitários, integração PostgreSQL/pgvector e Redis, build e audit (bloqueio high/critical). `test:pg` descobre todos os arquivos `.pg.spec.ts`; a lista manual anterior omitia os testes de leitura de suporte, destaques administrativos e simulação de métricas.
- `web`: lint, tipos de aplicação/E2E, testes unitários, builds Next/Storybook e audit.
- `images`: build das imagens Docker de API, frontend e ponte de afiliados; a imagem backend também executa o worker.
- `e2e`: onze runners isolados, mantendo um worker por runner para preservar fixtures mutáveis: `features`, `features-mobile`, `catalog`; `ui-desktop`/`ui-mobile` com comparações de screenshots e acessibilidade; `search-desktop`/`search-mobile` com o stub de embeddings; `support-desktop`/`support-mobile` com a fronteira PostgreSQL de somente leitura; `desktop`/`mobile` do calendário no Storybook. As três últimas suítes estavam fora da matriz anterior. Os runners da aplicação criam seu PostgreSQL/Redis, usam portas com offset 10000 e um ID compatível com as proteções dos scripts locais; o calendário sobe seu próprio Storybook. Nenhum teste foi removido ou marcado como skip para liberar o deploy. Baselines não são atualizadas automaticamente; diferenças exigem inspeção, inclusive entre Windows local e Ubuntu do CI.
- Testes dos bloqueios de deploy e do lock E2E: `node --test .github/scripts/*.test.mjs frontend/e2e/run-lease.test.cjs`.

O Playwright mantém HTML, JSON, screenshots/traces de falhas e o log do servidor em artifacts distintos por projeto, inclusive em falha. O timeout de 45 minutos é por projeto.

Os runners E2E usam Ubuntu 24.04. As 12 referências Linux ficam em `frontend/e2e/visual-baselines/linux/`; as referências Windows anteriores continuam no caminho original. As imagens Linux foram geradas como candidatas fora desse diretório, inspecionadas individualmente e depois verificadas sem atualização automática. O navegador local de validação Linux usa a imagem oficial Playwright 1.63.0 Noble, correspondente ao pacote instalado; os servidores desse ensaio continuam locais no Windows. Isso não substitui uma execução completa no GitHub.

Evidências locais da correção do CI, anteriores ao fechamento das tarefas concorrentes de funcionalidades e métricas:

| Verificação | Resultado |
| --- | --- |
| Backend unitário com Redis descartável | 623 testes passaram |
| Integração PostgreSQL/Redis, banco recém-migrado e todos os arquivos descobertos | 395 testes passaram |
| Frontend unitário | 473 testes passaram |
| Proteções de deploy e lease E2E | 9 testes passaram em Node 22 Linux e Node local |
| Suíte visual Windows | 50 testes passaram |
| Suíte visual com Chromium Linux | 50 testes passaram |
| Abas da equipe, desktop/mobile | 7 testes passaram, incluindo setup |
| Filtro de descoberta mobile, Chromium Linux | 3 repetições passaram, mais setup |
| Calendário no Storybook, Chromium Linux desktop/mobile | 6 testes passaram |
| Modo de suporte, Chromium Linux desktop/mobile | 4 testes passaram |
| Regressão da busca com embeddings, Chromium Linux desktop/mobile | 2 testes passaram |
| Arte de divulgação no Chromium Linux, PNG/QR reais | 15 testes passaram, incluindo setup |
| Regressão de fallback de fonte no Chromium Windows, desktop/mobile | 3 testes passaram, incluindo setup |
| Build Next após correção da fonte | Passou |
| Build das imagens API/web e Storybook após patch Vite | Passaram |
| Audit backend/frontend no limiar high/critical | Passaram; alertas moderados permanecem |
| actionlint | Passou |

A rodada funcional Linux executou 378 casos: 357 passaram e 21 falharam (12 da arte antes da correção da fonte e nove de catálogo/Google Ads em dois arquivos ainda antigos na cópia isolada). Com os arquivos atuais da branch e um build novo, a repetição passou nos 22 casos selecionados, incluindo setup. A comparação dos relatórios confirmou que todos os 21 casos antes falhos passaram. Relatórios locais: `functional-linux-first-results.json` e `functional-linux-retry-results.json`, dentro de `output/ci-investigation/`. Isso comprova os 378 casos por execuções combinadas; não é uma única execução integral verde.

A validação integrada das mudanças concorrentes ainda depende de elas terminarem; os números acima descrevem o recorte do CI preservado nas cópias locais de validação. A outra tarefa concluiu F24/F30/F35 e iniciou F39; seu código ainda muda. A rodada final precisa partir de uma nova cópia do checkout, incluir as novas suítes e conferir novamente screenshots, builds, imagens e índice Graphify. Não usar a cópia anterior como se representasse o checkout final.

Em 21/10/2026 foi ativado o acompanhamento `Validar CI após funcionalidades`, a cada 30 minutos, para retomar essa validação local quando a outra tarefa encerrar. Estado e instruções de continuação em `output/ci-investigation/HANDOFF.md`; desativar o acompanhamento ao concluir a rodada integrada.

## Ativação do CD

O usuário proibiu integrar `codex/roadmap-f37-testes` à main. Não houve commit, push, merge nem deploy nesta sessão. Os passos abaixo documentam uma ativação futura com acesso e autorização próprios; não serão executados automaticamente nesta branch.

Estado observado em 20/10/2026: API/site saudáveis no Coolify; worker em `running:unknown`, sem readiness. Os deploys da main eram acionados pelo webhook GitHub antes de o CI terminar. O token `gh` desta sessão permite leitura do repositório e Actions, mas informa `push:false`, `admin:false`; secrets e variables retornam HTTP 403. O MCP Coolify permite inspeção e deploy, mas não expõe atualização de aplicações nem criação de tokens. Portanto, a configuração abaixo precisa de acesso administrativo; os arquivos locais não ativam sozinhos o CD.

1. Criar/configurar o environment `production` no GitHub, limitado à branch `main`.
2. Salvar `COOLIFY_URL` como variable do environment ou repositório: origem HTTPS do painel, sem `/api/v1`, path ou credencial.
3. Salvar `COOLIFY_TOKEN` como secret do environment ou repositório. Token da equipe com permissões de leitura, atualização das aplicações e deploy. Não colocar o valor em arquivos, logs ou nesta documentação.
4. Nas três aplicações Coolify, desativar deploy automático no push (Advanced > Deployment > Auto deploy: Manual deployments only; em versões anteriores, desmarcar Auto Deploy). Manter a conexão GitHub, branch main, Dockerfiles e variáveis existentes. Pela API, o campo é `is_auto_deploy_enabled:false`.
5. Publicar a alteração revisada. Antes do próximo push para main, concluir o passo 4: um webhook ativo ainda pode publicar código antes dos testes.
6. Executar e acompanhar um push aprovado na main. O job `deploy` não roda em PR, branches de desenvolvimento ou disparo manual. Se o acesso às secrets estiver ausente, ele falha com mensagem explícita.

Na proteção da branch main, exigir `verify`, `web`, `images` e os onze checks `e2e` após a primeira execução registrar os nomes da matriz. Substituir o antigo check obrigatório `e2e`, se existir. A sessão atual não tem permissão para inspecionar ou configurar essas regras.

Não criar um segundo webhook de deploy. Não usar o token do MCP como se fosse uma secret já disponível no GitHub.

Em 26/10/2026 o workflow passou a usar `https://coolify.temlinkaqui.com` como origem padrão quando `vars.COOLIFY_URL` não está definida. A origem respondeu HTTP 200 na conferência. Uma variável explícita ainda pode sobrescrever esse valor. O token `gh` disponível continua com `admin:false` e `push:false` e retorna 403 para variables/secrets; a secret `COOLIFY_TOKEN` permanece uma configuração administrativa independente. O fallback da URL não cria ou transfere tokens.

## Publicação e falhas

Em 26/10/2026, os jobs de 14b4893e e 025614b0 confirmaram que COOLIFY_TOKEN já estava configurada. O bloqueio era `api: application ID missing`: a API retornou o UUID, mas omitiu o ID interno. O script aceita o UUID verificado e conserva a compatibilidade com IDs antigos. Entradas de fila sem identidade suficiente continuam bloqueando mutações; não há liberação de deploy concorrente por falta de ID.

O job depende de todos os checks, usa environment `production` e serializa deploys sem cancelar uma publicação em andamento. A concorrência da main também não cancela um workflow durante o deploy. Um commit superado pela main é ignorado antes das mutações.

O script verifica repositório/branch, auto-deploy desativado e ausência de deploys concorrentes. Fixa `git_commit_sha` no SHA testado, confirma a gravação e publica nesta ordem:

1. Ponte de afiliados (`jqxvail1shmqtyjoyzeyktxq`): processo em execução, volume VHG montado somente para leitura. Catálogo e geração exigem smoke autenticado após publicação.
2. API (`3rzvngm8sz51yjj4i3jmtr1i`): migrations/bootstrap existentes no Dockerfile, deploy finalizado no SHA esperado, estado healthy e HTTP 200 em `/api/v1/actuator/ready`.
3. Worker (`w7uioamyuv4tsjmelv6fqqkh`): deploy finalizado no SHA esperado e processo running. Isso não comprova consumo de filas; a aplicação ainda não oferece readiness do worker.
4. Web (`mfehvi9lulpppun6laezsu0w`): deploy finalizado no SHA esperado, estado healthy e HTTP 200 em `/health`.

O script espera até dez minutos por deploy e um minuto adicional de saúde por aplicação, além dos timeouts HTTP. Falha na primeira etapa problemática, sem iniciar as seguintes. Não imprime corpos da API, envs ou logs de produção, que podem conter segredos.

Timeout/cancelamento do Actions não cancela automaticamente o deploy já aceito pelo Coolify. Inspecionar a fila e o deployment UUID no Coolify antes de repetir. Token/API indisponível falha fechado. Se API foi publicada e worker/web falharam, o ambiente pode ficar temporariamente com versões diferentes.

A concorrência do GitHub não bloqueia comandos manuais no Coolify; a consulta da fila é uma verificação daquele instante. Evitar deploys manuais enquanto o pipeline publica.

## Reversão

Para desfazer a mudança local, reverter somente os trechos desta tarefa após revisar `git diff`. Arquivos compartilhados, como `backend/package.json` e as configurações Playwright, também contêm mudanças de outras tarefas; reverter o arquivo inteiro pode apagá-las. Não houve commit, push ou deploy nesta tarefa.

Para incidente após ativação, pausar os próximos pushes e inspecionar o deploy no Coolify. Reimplantar o último SHA validado nas três aplicações; o pin `git_commit_sha` precisa apontar para esse SHA. O deploy seguinte do pipeline volta a fixar o SHA aprovado. Não executar rollback automático do banco: as migrations já aplicadas exigem avaliar compatibilidade e backup antes de reverter código. Voltar ao webhook direto remove a proteção do CI e exige decisão explícita.

## Referências de contrato

- [Deploys automáticos](https://coolify.io/docs/applications/deployments/automatic-deployments)
- [Atualizar aplicação: pin do SHA e auto-deploy](https://coolify.io/docs/api/endpoints/applications/update-application-by-uuid)
- [Iniciar deploy](https://coolify.io/docs/api/endpoints/deployments/deploy-by-tag-or-uuid)
- [Consultar status do deploy](https://coolify.io/docs/api/endpoints/deployments/get-deployment-by-uuid)
- [Playwright: navegador Linux em Docker e conexão remota](https://playwright.dev/docs/docker)
