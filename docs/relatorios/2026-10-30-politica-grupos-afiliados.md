# Política de grupos de afiliados — 30/10/2026

Implementação local, sem commit/push/deploy por este agente e sem contato com WhatsApp real. Conta Principal 01 continua fechada/em análise; nenhum connect/restart/send foi executado.

## Comportamento

- Política explícita por segmentação e tenant. Defaults: desativada, mensagens temporárias de sete dias, solicitação de entrada habilitada e aprovação após no mínimo 120 segundos de observação persistida. Demais tenants/segmentações não são ativados.
- GET/PUT administrativo `/api/v1/admin/affiliates/segments/:id/group-policy` reutiliza autorização no servidor. Dados completos e estritos, atraso entre 120 e 86400 segundos, durações suportadas pela Evolution.
- Worker existente executa ciclo a cada 30 segundos, com lotes, leases no PostgreSQL e rechecagem de tenant, grupo, conexão e política antes das ações. Não conecta/reinicia instâncias. Conexões fechadas ficam `WAITING_CONNECTION`; falhas recebem backoff de cinco minutos.
- Grupos existentes aguardam aplicação antes de liberar convite pelo aplicativo. Grupos futuros exigem capacidade confirmada antes de criar, recebem configurações antes do convite e preservam tratamento de criação incerta.
- Descrição não vazia da segmentação é aplicada uma vez por alteração, quando a conexão já estiver aberta; hash separado evita repetir a descrição enquanto a extensão de admissão falta.
- Pedidos cancelados são retirados. Nova solicitação observada após retirada recomeça o prazo. Aprovações precisam confirmação individual. Timeout/erro/worker interrompido ficam `UNCERTAIN`; não recebem retry automático, inclusive após a retenção. Estado operacional `ATTENTION` permanece enquanto existir incerteza.
- JIDs são criptografados com contexto tenant/grupo/hash. Respostas administrativas não expõem JIDs. Confirmação, retirada ou incerteza apagam o ciphertext. Retenção remove dados antigos após sete dias; tombstones de incerteza mantêm apenas hash até a ausência ser confirmada.
- Desativar a política pausa sincronizações/aprovações futuras; não desfaz configurações no WhatsApp.

## Capacidade do provider

Router e serviço oficiais Evolution 2.3.7 oferecem mensagens temporárias, mas não os endpoints de aprovação/listagem de solicitações. Baileys 7.0.0-rc.9, dependência dessa versão, oferece as três operações necessárias.

Artefatos separados em `integrations/evolution/`: patch para cinco arquivos da Evolution 2.3.7, README com fontes oficiais e procedimento posterior, e self-check local sem rede. Capability endpoint autenticado identifica instalação; ausência gera `UNSUPPORTED / admission_extension_required`. Nenhum endpoint upstream não comprovado é considerado disponível.

## Verificações executadas

- Banco descartável local `affiliate_group_policy_20261030`, na instância Docker PostgreSQL existente local `temlink-affiliates-preview-pg-20261028`. Criação de banco próprio, sem alterar tabelas do banco preview. Todas as 85 migrations aplicadas, incluindo as três novas desta entrega (uma para provider Shopee coordenada com outro agente).
- Sete arquivos de testes: **78 testes passaram**, incluindo oito casos PostgreSQL de política, testes HTTP administrativos/contratos, operações de grupos, convite rápido, adapter Evolution e worker.
- Após reforçar retenção de incerteza, os oito testes PostgreSQL de política passaram novamente, incluindo mais de sete dias sem nova aprovação.
- Backend: `npm run typecheck`, `npm run lint` e `npm run build` passaram. Após o último ajuste de retenção: typecheck, lint focal e build passaram novamente.
- `node integrations/evolution/verify-group-admission.cjs`: passou. Cobre sintaxe dos trechos, guards, regexes, LIDs, encaminhamento e conexão fechada com mocks.
- `git apply --check` do patch contra source oficial 2.3.7: passou. `git diff --check` dos arquivos rastreados desta entrega: passou.

## Limites e reversão

Não houve execução no WhatsApp, instalação/build completo da Evolution modificada, autorização de deploy ou medição de tempo real de aprovação. A extensão ainda precisa dos checks completos do provider e integração HTTP de autenticação/instância antes de publicação autorizada. UI/inspeção visual e Graphify final são coordenados pelo agente principal.

Reverter operação: desativar a política na API/painel. Reverter código: retirar os arquivos/alterações deste lote preservando alterações concorrentes. Migrar banco antes de iniciar o código novo; não remover colunas/tabelas como atalho de rollback. Reverter extensão: voltar imagem anterior quando houver instalação autorizada.

## Revisão cruzada backend Shopee e integração

Revisados credenciais por tenant/provider, rotação concorrente, cache e troca de provider, identidade do produto, renovação de preço, prévia assinada e integração das políticas de grupo. Encontrada uma divergência material: adapter Shopee aceitava imagem em `shopee.com.br`, mas o contrato central da prévia/mensagem a recusava. Adapter agora limita imagens Shopee a `susercontent.com` e subdomínios; hosts incompatíveis tornam a imagem nula, preservando o produto. Teste focal cruza o resultado com o contrato central.

Após essa correção: 49 testes em cinco arquivos passaram (adapter Shopee, casos de uso Shopee, prévia, descoberta e catálogo HTTP), lint dos dois arquivos alterados e typecheck do backend passaram. Não foram identificadas outras regressões materiais nessa revisão; isso não comprova ausência de defeitos.

Conferido o material local para tentativa de build completo da Evolution: `output/evolution-admission-source` contém apenas referências baixadas e cinco fontes patchadas, sem checkout completo nem `node_modules`. O script oficial exige `tsc --noEmit && tsup`. Nenhuma dependência grande foi instalada para criar um ambiente de provider. Portanto o build completo continua não executado; self-check local e aplicação limpa do patch permanecem como as verificações efetivamente realizadas.

## Validação completa posterior da extensão Evolution

Após autorização explícita para baixar repositório/dependências, a limitação anterior foi resolvida em nova pasta isolada `output/evolution-admission-build`. Clone oficial tag 2.3.7, commit `cd800f2976e1e5b682fbf86a01ee4d85ae61f370`; patch aplicado sem conflitos. `npm ci --ignore-scripts --no-audit --no-fund --allow-git=all` instalou 1120 pacotes pelo lockfile, sem scripts de instalação. A libsignal é dependência Git pública e fixa do lockfile; autorização Git foi apenas por comando, sem configuração global. Nenhum modelo/download fora das dependências Node normais foi necessário.

Prisma Client gerado a partir do schema PostgreSQL com URL de fixture `127.0.0.1:1`, sem acessar banco ou ambiente real. **Build completo oficial `npm run build` passou**, incluindo `tsc --noEmit` e tsup CJS/ESM. Lint dos cinco arquivos alterados passou após ajustar exclusivamente formatação/imports dos trechos novos. Patch final regenerado desse checkout; aplicação limpa e self-check novamente aprovados.

Novo `integrations/evolution/verify-group-admission-http.cjs`: **16 cenários HTTP passaram** usando router/controller/guards/schemas oficiais com repositório e cliente simulados. Métodos de admissão extraídos por AST do serviço para fixture evitam inicializar o provider e suas integrações. Cobertura: chaves ausente/incorreta/de outra instância, instância ausente/fechada, validação de payload/JID, LID preservado, ações confirmadas e query que tenta trocar a instância autenticada. Essa inspeção motivou trocar `dataValidate` por `groupNoValidate` na nova rota de capacidades, evitando sobrescrever parâmetros de instância pela query depois dos guards.

Não foram lidos ambientes/sessões de produção nem conectados WhatsApp, bancos ou filas reais. Não houve envio, aprovação de participante real, publicação ou deploy. A operação em socket real continua não testada e depende de conta apta e janela autorizada. As afirmações anteriores de build/HTTP pendentes são históricas e foram superadas por esta seção; o limite de produção permanece.
