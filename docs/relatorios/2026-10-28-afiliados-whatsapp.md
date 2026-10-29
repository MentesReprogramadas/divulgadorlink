# Central de afiliados e WhatsApp — entrega e validação

28/10/2026. Branch `codex/afiliados-whatsapp`, HEAD-base `2e30da7091a6f38c72c8dad5cb655e8278c0b018` da `origin/main` atualizada. Checkout: `C:/VSCODE/temlink-afiliados`. A árvore anterior `C:/VSCODE/divulgadorlinks` não foi editada por esta implementação. Não houve commit, push, deploy, conta conectada ou mensagem real.

## Resultado

Novo destino **Admin → Afiliados e WhatsApp**, rota `/admin/afiliados`. Dashboard com totais reais; cadastro e pausa de segmentações/instâncias/grupos; conexão/QR e sincronização de grupos; catálogo OAuth Mercado Livre; ofertas manuais ou preparadas pelo catálogo; revisão, envio/agendamento/cancelamento; histórico paginado e resolução explícita de entrega incerta.

Convite público `/ofertas/entrar/[slug]` utiliza GET sem efeitos e POST explícito. Consulta o grupo mais recente da segmentação. Quando cheio, provisiona próximo número, aplica descrição/foto e devolve convite. Falha incerta bloqueia nova criação até reconciliação; a reconciliação também reaplica metadados herdados antes de habilitar o grupo. A URL pode entrar como link comum de Minha página, sem alterar seu contrato ou conceder gerenciamento ao cliente.

Backend: sete modelos/tabelas, migration aditiva, consultas e FKs de tenant; administrador ACTIVE consultado no banco; suporte/equipes não ganham acesso. Segredos cifrados com AES-GCM existente. OAuth PKCE/state único/expiração, refresh serializado. Aprovação cria snapshot e destinos em transação; idempotência e entrega por grupo. Leases distribuem o processamento entre instâncias; pausas não bloqueiam outras operações. Conteúdo/validade são rechecados no claim. Alterar oferta cancela destinos pendentes do snapshot anterior. Resposta perdida não dispara repetição automática.

Configuração e operação: [docs/afiliados-whatsapp.md](../afiliados-whatsapp.md). Decisões e contratos: [desenho](../superpowers/specs/2026-10-28-afiliados-whatsapp-design.md), [plano](../superpowers/plans/2026-10-28-afiliados-whatsapp.md). Pesquisa do catálogo: [Mercado Livre](../pesquisas/2026-10-28-afiliados-mercado-livre.md).

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `backend npm test`, com `PIX_PROOF_DATABASE_URL` e `PIX_PROOF_REDIS_URL` descartáveis | 174 arquivos / **777 testes passaram**. |
| PostgreSQL focado (`PG_SPECS=1`, `AFFILIATE_DATABASE_URL` local): operações, HTTP e catálogo | 3 arquivos / **17 testes passaram** na rodada final. Inclui concorrência, tenant, metadata, pausa, OAuth, snapshot e envio incerto. |
| `frontend npm test` | 216 arquivos / **834 testes passaram**. |
| Testes focados frontend/BFF/ícones após alterações | 4 arquivos / **36 testes passaram**. |
| Playwright Test `playwright.affiliates.config.ts` | **4 E2E passaram**, desktop/mobile, dados determinísticos de UI. |
| Playwright Test `playwright.affiliates-integration.config.ts` | **2 E2E passaram**, repetidos com assert extra dos dois JIDs persistidos. API/PostgreSQL/worker reais, provedor local. |
| Lint e typecheck dos dois pacotes | Passaram nas rodadas finais. |
| Build dos dois pacotes | Passaram. Frontend com `TEMLINK_E2E_BUILD=1`, sem disputar a pasta do servidor dev. |
| Prisma validate, migration deploy local e geração do client | Passaram; todas as 73 migrations aplicadas ao banco descartável. Nenhum banco de produção foi alterado. |
| `git diff --check` | Passou. Lockfiles e dependências de runtime não foram alterados. |
| Inspeção Playwright MCP | Contextos isolados; UI mobile/foco/Escape e ausência de overflow; raiz também conferiu dashboard e grupos vindos da API real de teste em desktop. |

Os 777 testes de backend da suíte padrão não incluem os 17 PostgreSQL. A última mudança de reconciliação de metadados foi verificada no conjunto PostgreSQL e novamente por lint/typecheck/build. O total frontend da suíte completa corresponde à rodada registrada antes do último ajuste de mensagem de conexão já aberta; esse ajuste passou pelos checks finais e pela compilação. Não somar contagens sobrepostas como testes exclusivos.

Evidências de teclado, foco, contraste automatizado/axe, zoom CSS, capturas e seus limites: [README frontend](../frontend-profissional/evidencias/afiliados-whatsapp-2026-10-28/README.md). Não há certificação de acessibilidade total.

### Integração do navegador

Fixture `backend/scripts/e2e-affiliates-server.ts`: banco `affiliate_ops` local em5638, Redis local5640, API3351 e provedor HTTP loopback4451. O script recusa banco remoto, nome diferente e modo de produção. Dados e JWT são descartáveis, sem credencial real.

Os E2E integrados autenticaram administrador confirmado, criaram segmento pela UI, recarregaram e confirmaram persistência; a entrada pública criou `Natal integrado #2`; o banco manteve exatamente `123@g.us` e `456@g.us` para a segmentação fixture; uma oferta revisada e aprovada pela UI gerou duas entregas SENT via worker e provedor local. O histórico continuou acessível após reload.

A revisão automática bloqueou duas inicializações locais do Next em modo de produção, inclusive com bind127.0.0.1; retornou apenas “blocked by policy”. Não foi iniciado um servidor equivalente por outro caminho. A validação usou o servidor dev isolado3016 já existente e `route.fetch` para encaminhar respostas HTTP reais da API3351, sem JSON simulado. Por isso, o transporte do BFF completo em runtime de produção não foi validado nessa jornada; seu encaminhamento/Location foi coberto pelos testes próprios. Não houve visita final ao WhatsApp externo: a navegação do teste foi interceptada e abortada.

### Falhas encontradas e corrigidas

- Defaults internos do Zod4 reapareciam em `.partial()`: pausar limpava descrição/capacidade/expansão; arquivar podia limpar nota. Defaults ficaram no banco, e regressões verificam PATCH sem alterações colaterais.
- Fila inicialmente podia ficar presa em destinos pausados ou monopolizada por uma instância. Seleção por instância elegível e lease com horário fresco/CAS corrigiram isso.
- Alteração durante preflight poderia enviar snapshot antigo. Claim exige a versão, preço recente e validade atuais.
- Entregas incertas antigas podiam desaparecer do recorte recente. Histórico recebeu paginação e filtro; E2E alcança e resolve uma entrega antiga.
- Retorno OAuth perdia `Location` no BFF. Agora encaminha somente caminhos relativos seguros.
- QR Evolution com `pairingCode:null`, respostas de erro HTTP200 e mutações sem confirmação eram aceitas/rejeitadas incorretamente. Conector confere contratos oficiais e limita o corpo por streaming. HTTP400 pós-envio permanece incerto.
- Reconciliação de grupo com imagem herdada precisava reaplicar foto/descrição antes de liberar o destino; teste PostgreSQL cobre esse caminho.

A primeira suíte geral encontrou duas provas Pix apontando para o banco antigo5433, sem coluna `emailDigest`; nenhuma migration foi aplicada nele. Ambas passaram ao receber o banco/Redis descartáveis nos envs próprios. Uma execução durante a escrita dos novos testes do conector capturou o estágio RED; o arquivo Evolution passou com13 testes e a suíte geral repetida terminou com777 testes aprovados. Os logs locais preservam essas execuções. Houve também falhas de seletor/navegação nos harnesses frontend, corrigidas e descritas nas evidências.

## Grafo e revisão

Graphify foi consultado antes de confirmar os consumidores. Expansão de vocabulário usada: `evolution`, `group`, `invite`. A busca ampla também encontrou convites de equipes, que não comprovam convites de WhatsApp; decisões foram confirmadas no código. Atualizações incrementais code-only, sem LLM/API, clustering ou envio de código. Custo externo de indexação e tokens de LLM: zero. O grafo não substitui CSS, Prisma, capturas ou testes; arquivos sem símbolos e os três arquivos sensíveis excluídos mantiveram seus limites. Escopo final em `graphify-out/ESCOPO.md`.

Revisão independente de código encontrou os problemas de fila, snapshot, defaults, histórico, cache de ocupação e lease. A raiz corrigiu e verificou os caminhos. O conector foi conferido também com a fonte oficial Evolution2.3.7. Não presumimos que essa seja a versão instalada no servidor do usuário.

## Pendências externas e limites

Contas e permissões Evolution/Mercado Livre, sessão do gerador afiliado e conteúdo real permanecem sem teste live. O gerador confirma atribuição/tag/profile; link social opaco ainda exige conferência humana do produto/vendedor. Não foram trazidos banco, sessões, credenciais, radar de cupons ou automações vivas do VHG. O novo módulo permite operação administrativa manual/revisada com distribuição agendada; não promete vendas, alcance ou comissão.

Os limites do dashboard, intervalo do worker, reserva de vaga e impossibilidade de desfazer requisição já iniciada estão explícitos no manual. A validação local não autoriza publicação. A criação da worktree gerenciada falhou por um caminho longo de build já versionado; foi usada worktree Git em caminho curto, com `core.longpaths` somente naquele comando. O app recusou anexá-la como gerenciada; usar o caminho explícito desta entrega para continuar.

Serviços/containers temporários desta execução são encerrados ao fechar a verificação. A worktree com a implementação permanece. Reversão documentada no manual, sem exclusão automática de dados reais.
