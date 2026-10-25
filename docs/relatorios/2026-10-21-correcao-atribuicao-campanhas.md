# Correção da atribuição de campanhas — 21/10/2026

## Comportamento corrigido

- `utm_content` e `utm_term` fora da lista de caracteres/tamanho são descartados individualmente. O núcleo válido source/medium/campaign permanece, sem começar a armazenar rótulos livres. Campos obrigatórios e estrutura do cookie continuam validados.
- O botão público de publicação de `/divulgar` transporta os parâmetros válidos até `/cadastro`, na URL. Não é criado armazenamento de marketing antes do aceite. O marcador `tla_landing=/divulgar` identifica esse caminho; navegação direta ao cadastro sem contexto não inventa campanha.
- A captura após aceite pode recuperar esse contexto no cadastro. Referer de outro host é rejeitado.
- Antes de registrar uma conta consentida, o formulário aguarda a sincronização do cookie. Falha de medição tem espera limitada a cinco segundos e não impede a criação da conta.
- Os botões de cookies ficam desabilitados até a leitura inicial da escolha, evitando aceitar interação antes da hidratação.
- O relatório consulta cadastros para as campanhas efetivamente exibidas por entradas. Isso remove o zero artificial causado pelo cruzamento de dois top 12 independentes; tenant e janela temporal permanecem na consulta parametrizada.
- A coluna agora diz “Cadastros atribuídos”. A explicação distingue atribuição, escolhas de cookies e pessoas únicas; zero não prova ausência de aceite.
- A informação sobre os parâmetros transportados na URL foi acrescentada à descrição de privacidade existente.

## Arquivos de implementação

- `frontend/src/domain/campaign-touch.ts`: regras de captura, limpeza dos opcionais e URL de continuação.
- `frontend/src/app/divulgar/page.tsx`: composição do CTA com o contexto válido.
- `frontend/src/app/anuncio/toque/route.ts`: recuperação do contexto e validação do host.
- `frontend/src/lib/campaign-touch.ts`: sincronização compartilhada com timeout.
- `frontend/src/components/domain/consent.tsx`: hidratação e sincronização.
- `frontend/src/app/cadastro/page.tsx`: aguardar captura antes do cadastro.
- `frontend/src/app/admin/visao/traffic-panel.tsx`: nomes e explicação da métrica.
- `frontend/src/domain/legal.ts`: descrição do tratamento efetivo.
- `backend/src/domain/acquisition/touch.ts`: limpeza defensiva de opcionais na fronteira do servidor.
- `backend/src/http/controllers/@Admin/traffic.ts`: consulta vinculada às campanhas exibidas.

Regressões em `campaign-touch.test.ts`, `anuncio/toque/route.test.ts`, `cadastro/page.test.tsx`, `lib/campaign-touch.test.ts`, `consent.test.tsx`, `traffic-panel.test.tsx`, `backend/src/domain/acquisition/touch.spec.ts` e `frontend/e2e/funnel.spec.ts`.

## Validação executada

- Frontend: lint e typecheck passaram; 37 testes direcionados passaram.
- Backend: lint, typecheck e build passaram; 17 testes direcionados passaram.
- E2E: oito testes passaram, incluindo o setup de sessão, as duas regressões existentes de landing/catálogo, captura tardia em 1440×900 e 390×844, ranking com 12 campanhas superiores por conversões, ausência de captura sem aceite e preservação do primeiro anúncio.
- O setup E2E executou `next build` com sucesso na passagem aprovada, além de criar/remover PostgreSQL e Redis próprios. Não utilizou produção nem provedores reais de mensagens/pagamentos.
- Foram inspecionadas capturas desktop/mobile do cadastro: campos, foco, botão e rodapé legíveis, sem sobreposição ou overflow. O aceite por teclado foi exercitado nos dois tamanhos. Não houve redesenho de CSS.
- A primeira execução detectou interação antes da hidratação no mobile e uma chamada do runner que não resolvia `tenant-a.localhost`. O produto recebeu a proteção de hidratação; o teste passou a consultar o relatório por fetch do navegador.
- Depois da passagem aprovada, a fixture de captura foi tornada determinística: e-mails fixos por largura, em banco recriado por execução. A repetição foi bloqueada no build por uma alteração concorrente em `frontend/src/features/agency/agency-sections.tsx`: o ícone `clientPortfolio` ainda não pertencia ao tipo de ícones. Essa área não pertence à correção de campanhas e foi preservada. Logo, não se declara o working tree inteiro validado após essa alteração externa.
- A suíte unitária de tráfego continua emitindo o aviso preexistente de headers já enviados no cenário de autorização negada, embora os testes passem. Não foi tratado como causa da perda de atribuição.
- Graphify atualizado localmente em modo incremental de código, sem LLM/API. A extração também capturou alterações simultâneas de outras tarefas e advertiu sobre extração parcial de um teste de atendimento fora deste escopo. Relatório e HTML do grafo continuam históricos.

## Limites e reversão

No fechamento inicial não houve commit, push, deploy, migração nova ou modificação de dados de produção. O usuário autorizou a publicação posteriormente; o registro abaixo acompanha essa etapa.

A continuação sem consentimento cobre o botão de publicação da landing para o cadastro. Outros caminhos, como sair para o catálogo, fechar a aba ou navegar por links sem contexto, não ganham armazenamento pré-consentimento. Campanhas com campos obrigatórios inválidos continuam sem atribuição. A falta de Referer ou uma indisponibilidade persistente da captura também pode impedir atribuição.

O contrato do primeiro toque e a duração de 30 dias são preservados. Não há reatribuição automática de contas antigas. Os cadastros históricos sem campanha não podem ser reconstruídos a partir dos agregados disponíveis.

Não foram feitos teste em aparelho físico, nova auditoria completa de contraste/zoom ou a suíte E2E inteira. A evidência funcional cobre a jornada alterada.

Para reverter, retirar somente os hunks desta correção e seus testes novos, preservando as alterações concorrentes, e remover este relatório. Não executar reset global. O índice do Graphify pode ser reextraído localmente depois da reversão.

## Publicação autorizada posteriormente

- Hotfix isolado em `C:/VSCODE/divulgador-campaign-deploy`, baseado no SHA de produção `a7aad9c77b7817909319c23fcbb938808e631870`. Não foi integrada a branch `codex/roadmap-f37-testes`.
- Commit `0188c253254629271059dc8cc7759869f446f0a7`, publicado na main por push fast-forward. São 18 arquivos, somente captura, validação, rótulos e testes de campanhas. Sem dependências, lockfiles, CI ou migrações novas.
- A UI de produção foi preservada: somente os textos do painel e a proteção do banner foram portados; o redesenho e a medição de páginas presentes na branch de desenvolvimento ficaram fora.
- Revalidação nessa base: lint/typecheck frontend e backend aprovados; 32 testes frontend e 17 backend aprovados; build backend e `next build` aprovados; oito E2E aprovados. O E2E usou portas com offset 10000 e containers próprios com sufixo `campaign-deploy`. Capturas determinísticas foram copiadas para `docs/frontend-profissional/evidencias/campanhas-2026-10-21/`.
- Tentativa inicial de worktree gerenciada falhou por caminhos longos de artefatos já versionados na base. A cópia isolada foi criada por Git com `core.longpaths=true` somente naquele comando, sem alterar configuração global.
- Auditoria adicional do histórico, somente leitura: 58 registros de cadastro sem toque na consulta mais recente; zero toques órfãos; um link com campanha sem toque, porém sem dono associado. Não existe candidato vinculado a uma conta que permita reconstrução exata. As tabelas de escolhas de consentimento são agregadas, sem campanha ou usuário. Nenhuma reatribuição histórica foi executada.
- Deploys concluídos no Coolify, todos no SHA `0188c253254629271059dc8cc7759869f446f0a7`:
  - API `rqki9ki0ilseunrsfzilvn8x`: terminou em 21/10/2026 às 12:34:41 de Brasília, `running:healthy`.
  - Worker `btf1mnhsuozvcdvfygcmijw9`: terminou às 12:36:51, processo em execução, sem reinícios; logs mostraram jobs da fila Evolution concluídos. O status `running:unknown` é esperado pela ausência de healthcheck próprio e não comprova todas as filas.
  - Web `bflmb1o0lb1hsbpqip38svnb`: terminou às 12:39:52, `running:healthy`.
- As imagens dos três containers em execução foram conferidas por SSH e identificam exatamente o SHA publicado. Site `/health` e API `/api/v1/actuator/ready` responderam HTTP 200.
- Seis smoke tests HTTP passaram em produção: captura com opcionais inválidos; captura tardia em `/cadastro`; ausência de captura sem escolha e com recusa; preservação de cookie anterior; rejeição de Referer externo. As chamadas só exercitaram cookies de resposta, sem cadastro ou escrita de métricas.
- Smoke Chromium real em produção, 390×844, também passou: visita à landing sem cookie de campanha, CTA com contexto até cadastro, aceite, cookie HTTP-only/secure com campanha correta e opcionais descartados. As três tentativas de enviar métricas de entrada/aceite foram interceptadas e abortadas; provedores publicitários também foram bloqueados. Não foi criada conta. Captura: `docs/frontend-profissional/evidencias/campanhas-2026-10-21/producao-cadastro-mobile.png`.
- O CI remoto `39626615732` aprovou imagens, mas não ficou integralmente verde: o job web falhou na auditoria de dependências já existentes (`launch-editor` com severidade alta e Next com severidade moderada); o job verify teve uma asserção em `related-links.pg.spec.ts`, com 176 testes PostgreSQL aprovados e um reprovado. Esses manifests e arquivos de links relacionados não foram alterados pelo hotfix. O job E2E geral ainda estava em andamento no fechamento; não se declara sucesso desse job. A publicação foi validada pelos checks locais do patch, builds, E2E da jornada e smoke em produção. Não foram feitas atualizações de dependências ou mudanças alheias para silenciar o CI.
- As contagens históricas registradas passam a usar a consulta corrigida; não foi inventada atribuição para os 58 cadastros sem toque. Não houve atualização de dados históricos, inferência por proximidade de horário ou associação com pessoas a partir de agregados.
- Reversão de produção: criar um commit que reverta somente `0188c25`, publicar esse commit na main e reimplantar API/worker/web, verificando saúde. Como o hotfix não cria migrações nem altera dados, não é necessário rollback de banco. Não usar force push, reset da branch de desenvolvimento ou reversão global das alterações concorrentes.
