# Auditoria do funil de destaque — Agent Browser e migrações

04/11/2026. O usuário solicitou revisão completa dos fluxos de destaque antes da integração e depois autorizou envio à main condicionado à ausência de erros. Nenhum gasto ou pagamento real foi realizado. Este documento distingue navegação real, estados de fixture e limites externos.

## Ambiente e método

Worktree `C:/VSCODE/divulgadorlinks/.worktrees/destaque-pos-cadastro`, branch `codex/destaque-pos-cadastro`. Site `http://tenant-a.localhost:3200`, API3533, stub4299, PostgreSQL5633/Redis6580 dedicados. Agent Browser0.41.2, sessão isolada `qa-main-ad94c5ebc770`, Chromium157, desktop1440×900 e mobile390×844; casos de320px/fonte200%. Não controla sessão pessoal. Playwright Test roda em outro contexto.

Contas e links exclusivos foram criados no banco local para separar pagamento, recuperação, +18, expiração e permissões. Cadastro desktop/mobile percorreu o formulário real; links antigos e alguns estados foram preparados por SQL de fixture, sem mockar a renderização. O Pix é gateway local simulado com webhook assinado de teste. Cartão ficou indisponível pela ausência de chaves Stripe; não foi artificialmente habilitado com chave falsa.

Capturas e verificações estão em `output/qa-main/`. Os scripts nesse diretório chamam o executável Agent Browser para login, clique, teclado, snapshots, capturas e avaliação de DOM/API; não usam Playwright para substituir essa inspeção. Há apoio de SQL e webhook local explicitado abaixo. Saídas temporárias de diagnóstico não devem ser interpretadas como capturas finais.

## Matriz percorrida

| Fluxo | Método e resultado | Evidência local |
|---|---|---|
| Cadastro desktop/mobile | Formulário real; oferta inline20%, sem modal/stepper | 01,10 |
| Home reversível | Clique no card, Remover e Space; total base/complementado coerente | 02,11 |
| Dispensa inicial | Vai para Meus links, sem modal de segunda oferta | 03 |
| Recuperação | Completo/14 dias preservado; recolher/expandir | 04,06 |
| Ocultar global | Ocultação persiste após reload fora do painel; painel mantém oferta sem remover | 05,06 |
| Falha ao iniciar compra | Bloqueio de rede deliberado; mantém seleção e permite retry | 07 |
| Clique duplo | Um único pedido,4392centavos/14dias, comprovado no banco | 08 |
| Pix e retomada | Mesmo pedido/código/valor após abrir destaque e recarregar | 12–14 |
| Confirmação | Webhook local assinado; sucesso sem timer ou título de oferta | 15 |
| Complementos | Busca→Nicho+Home; Nicho→Busca+Home; Busca+Nicho→Home; Completo sem complemento | 16-plano-* |
| Saída contextual | PacoteBusca/7dias,632centavos, sem X; Escape mantém diálogo; Tab contido | 17,18 |
| Comprar no modal | Pix gerado no próprio diálogo, sem trocar de checkout | 27,28 |
| +18 | Sem Home/Completo/complemento em desktop/mobile | 20–22 |
| +18 API | Quatro adulterações checkout/renew comHome/Completo recusadas409 | mais18-api.json |
| Pagamento atrasado | Prazo do Pix adiantado em fixture; webhook real local→PAID_LATE,zero promoções | 29,30; late-order.json |
| Expiração da oferta | Prazo avançado em fixture; sem desconto/timer; preço normal790centavos | 23–25 |
| Cooldown | API não reemite dentro do prazo;31dias simulados e novo link permitem nova campanha sem resetar a anterior | expiry-cooldown.json,rearm.json,41 |
| Sem repetição | Sair por texto e tentar sair novamente não repete o modal na mesma sessão/campanha | checks.jsonl |
| Renovação de sessão | Access invalidado com refresh válido; reload retoma o mesmo Pix,uma renovação200 | 26;refresh-network.json |
| Minha página | Criar com ajuda precede Criar do meu jeito no DOM | 31,32 |
| Suspensão/verificação | UI bloqueia;APIcheckout403; estado da conta de fixture restaurado | 33,34;security-api.json |
| Visitante/outro dono/tenant | Visitante semComprar; outro dono e tenant404,sem dados do link | 35;security-api.json |
| Consulta Pix falha | Interrupção de rede deliberada;retry mantém mesmo pedido | 36 |
| Pix expirado | EstadoEXPIRED/holdRELEASED preparado em fixture; código antigo removido; nenhum pedido duplicado | 37;pix-errors.json |
| Renovação de destaque | CheckoutPix real local; confirmação estende28dias sem duplicar promoção, sem campanha/upsell indevido | 38–40;renewal.json |
| Pendente elegível/+18 | Comthreshold0,checkout publica automaticamente e confirmação ativa somenteBusca/Nicho | 42;age-paid.json |

O primeiro fixture adulto mencionava outro nicho na descrição; o bloqueio de publicação foi correto conforme a política existente. Ajustou-se o texto do fixture, preservando a proteção no produto. A condição de cooldown foi testada com **novo link**; o mesmo link com campanha vencida não ganhou reinício artificial.

## Achados corrigidos

1. **Corrida de renovação de sessão:** cada401 iniciava seu próprio refresh, e a rotação de token fazia algumas chamadas perderem a sessão. `frontend/src/lib/api.ts` compartilha uma tentativa entre requisições concorrentes e401 atrasados. Regressões200/401/503/rede e tentativa posterior independente. No navegador, uma única renovação200 e retomada do Pix sem login.
2. **Drift das FKs novas:** schema Prisma agora declara `onUpdate:NoAction`, igual ao SQL aplicado. SQLs e checksums intactos. [Revisão das migrações](destaque-migracoes-2026-11-04.md).
3. **Pagamento tardio:** modal dizia “Compra concluída” e enviava aos resultados. Agora diz “Pagamento recebido”, explica que não ativou destaque e oferece “Ver meus pedidos”. Regressão de componente e reteste real do modal/CTA.
4. **Instabilidade temporal de testes existentes:** dois testes de afiliados esperavam agendamento01/11 ainda futuro. Corrigido apenas o relógio dos cenários, sem alterar produto. Outro teste de retomada passou a aguardar a consulta assíncrona antes de conferir o bloqueio dos controles.
5. Relatórios gerados `playwright-report-*` excluídos do Git para impedir inclusão acidental de artefatos de teste.
6. O CI da main7037643c já falhava nos E2E de afiliados por `label-content-name-mismatch`: “Remover disparo” tinha nome acessível “Remover do lote”. Nome acessível ajustado para incluir o texto visível; seletores atualizados, mantendo a regra Axe e as regras de remoção. Módulo17/17, lint e tipos aprovados. A captura exploratória de publicação também foi atualizada para esperar a oferta inline, com fixtures locais e sem dialog.

## Validação e integração

Na branch de trabalho após as correções:109 testes afetados frontend; suíte completa frontend1069/1069; lint/typecheck/build frontend aprovados. Backend:37 testes afetados comPostgreSQL, schema validate/lint/typecheck/build aprovados. E2E da jornada:12/12 desktop/mobile na primeira rodada final; repetir após integração da main atual.

A primeira suíte completa backend teve1058aprovações e2falhas porque as provas reais de Pix usavam os serviços padrão5433/6380 ausentes. EmPostgreSQL/Redis descartáveis exclusivos, ambas passaram. Não corrigir produto para contornar uma porta indisponível. Repetição integral com esses serviços e validação do resultado integrado ainda fazem parte do fechamento autorizado.

Agent Browser/Axe no `main` da escolha de destaque:zero violações reportadas; contraste sobre gradientes retornou itens incompletos. Não é certificação integral de acessibilidade, nem ensaio em aparelho físico/Safari.

Main remota consultada e atualizada somente por fetch:7037643c. Prisma/schema são idênticos à base0f9f0a7a usada na prova das migrações. Integração/push ficam condicionados aos checks do resultado integrado. O relatório deve receber os resultados efetivos antes do envio; não considerar esta seção uma declaração antecipada de merge.

### Fechamento local do resultado integrado

Feature commit138ab331, integração da main7037643c na branch de trabalho pelo commit29d3828e. Workspace original preservado. Frontend integrado:246 arquivos,1072 testes aprovados; lint, tipos e build aprovados. Backend integrado:216 arquivos aprovados/1opcional ignorado,1111 testes aprovados; o teste opcional de cache de convite também passou separadamente comRedis dedicado. Lint, tipos e build backend aprovados. PostgreSQL afetado37/37 e três migrações aprovados conforme relatório próprio. E2E integrado12/12 (4,0min). Proteções de deploy/lease11/11. Nenhuma dependência ou lockfile alterado.

Uma execução backend sob concorrência com build/E2E excedeu o timeout de5s de um teste de simulação. O módulo passou isoladamente e a suíte integral repetida sozinha passou, sem mudar código ou timeout. Uma execução iniciada antes do merge da main ficou inválida pela troca de fontes durante o processo; não foi usada como prova do resultado integrado.

O envio à main foi autorizado pelo usuário depois da solicitação inicial de não realizar merge. A branch de trabalho recebe primeiro os checks remotos de CI; a main só deve avançar após esse conjunto aprovar. O CI da main publica automaticamente após seus próprios gates, sem deploy manual nesta tarefa. Resultados e SHA efetivos do envio constam no histórico/checks remotos e no fechamento da conversa. A galeria local contém43 capturas finais em `output/qa-main/galeria.html`.

### Correções da primeira rodada remota

Run41888984506/commita4859a2 exercitou a matriz completa. Identificou contratos E2E antigos (modal, redirecionamento, Continuar/PagarPix e Mais opções), dois waits genéricos de SEO e o mesmo wait na auditoria visual. Os contratos foram adaptados preservando todas as verificações financeiras, privacidade, moderação, Axe e goldens. A captura exploratória foi alinhada ao resultado inline. A viewport do teste novo passou a ser explicitamente1440×900/390×844 também nas shards padrão, igual ao aceite e ao runner dedicado; não se alterou a asserção do CTA visível.

Foi corrigido um erro real de classificação: chave idempotente com payload incompatível já era recusada, mas caía em503. Agora usa `CheckoutIdempotencyConflictError` e409. PG16+37afetados=53/53, lint/tipos/build backend aprovados. No Agent Browser após reiniciar o harness: replay exato201mesmo pedido; alteração409sem ID/segredo/novo pedido, comprovado no banco.

Outro feedback loop foi reproduzido deterministicamente:403 da consulta de sessão emitia `workspace-access-changed`, que repetia a mesma consulta. Essa consulta agora não dispara o evento;403 de operações de billing/perfil continuam notificando. API+GlobalReminder27/27; Agent Browser com token de outro tenant registrou uma consulta403, sem oferta nem loop. Não se atribuiu a falha SEO a esse loop: as traces SEO mostravam401finito, sem403. O teste passou a aguardar o gate hidratado/conteúdo e fontes, com todos os checks de HTML/privacidade/hidratação preservados;4/4 desktop/mobile aprovaram.

W01 atualizado aprovou2/2 desktop/mobile, incluindo foco/Axe/320px/zoom. A auditoria pública local deixou de travar, mas encontrou baselines **Windows** antigos de /divulgar; não foram atualizados nem ignorados. A validação oficial de goldens permanece no runner **Linux** do CI. Doze cenários compatíveis adicionais passaram localmente; quatro de catálogo exigem a base limpa do CI, pois o harness reutilizado já continha edição/pedidos dos mesmos links. A restauração do limiar de moderação no teste de pendência usa finally. Nenhum banco do usuário foi apagado para forçar aprovação.

Harness reiniciado somente pela árvore própria, PID57240/logsv3, mesmos dados e portas. Galeria ampliada para45 capturas finais. A rodada remota seguinte deve aprovar antes do avanço da main.

## Limites antes de produção

### Acompanhamento da publicação na main

O CI da branch41893881906 aprovou26jobs no SHA56cfe89f (675E2E,1076frontend,1111backend,657PostgreSQL). A main recebeu esse mesmo SHA. O run41896391064 repetiu a matriz:25jobs aprovados e uma falha emF06-E03 mobile; deploy bloqueado. A trace mostrou que o seletor de próximo estado já exibia "Resolvida", liberando a asserção antes do PATCH e da auditoria. O PATCH completou200 e o histórico apareceu depois. A transação backend grava decisão e auditoria juntas; não foi alterada.

Correção restrita ao E2E: aguardar200 da decisão e atualização persistida da interface (histórico da triagem/formulário removido na resolução), mantendo contagem exata da auditoria, estado do link, teclado e recuperação offline. F06-E03 repetido3vezes desktop+3mobile:6/6; F06-E01 completo desktop/mobile:2/2. ESLint e tipos E2E aprovados. Nenhum timeout/retry/asserção de segurança foi relaxado. Nova rodada integral na main deve aprovar antes do deploy; SHA/run efetivos e resultado ficam no Actions e no relatório local de fechamento.

- Stripe: falta teste com credenciais sandbox reais para sucesso, recusa,3DS e retomada. Interface/contratos têm cobertura local; provider real não validado.
- Pix: falta homologação com credenciais/webhook reais do provedor. QR/webhooks usados aqui são de fixture; não enviar dinheiro real.
- Migrações: upgrade e preservação de dados aprovados em bases descartáveis, inclusive pedidos legados/campanha v1; locks e duração em volume de produção não medidos. Há drift global histórico alheio às três migrações; não aplicar automaticamente o SQL desse diff.
- Não executar deploy, migração de produção, force-push ou apagar worktrees/dados como parte deste fechamento. Preservar localhost para o usuário.
