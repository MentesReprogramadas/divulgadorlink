# Execução contínua do roadmap

## Autorização e isolamento

Em 15/10/2026 o usuário autorizou continuar a sequência completa, com testes, commits e pushes em branch diferente da main, sem encerrar após a primeira feature. Esta instrução substitui o limite anterior de executar apenas P0. Branch: codex/roadmap-features; base: 55b115b. A main e produção não serão publicadas por este trabalho. Alterações locais pré-existentes ficam no checkout original.

Etapas só serão concluídas após evidência. S7 nesta branch significa candidato validado, com CI e reversão preparados; liberação em produção continua separada.

## Baseline G00

- Node 24.21.0, npm 12.1.0, dependências dos lockfiles instaladas em checkout próprio.
- Backend: lint/typecheck e 361 testes aprovados. Frontend: lint/typecheck, 152 testes e build aprovados.
- PostgreSQL: 51 testes aprovados; E2E de baseline: 48 testes aprovados, incluindo catálogo, sessão, pagamentos, moderação, e-mail, consentimento e Evolution desktop/mobile. Bancos descartáveis; sem Evolution, e-mail ou cobrança reais.
- As portas 3000/3333 estão ocupadas por processos de outra atividade. O harness foi parametrizado e validado com offset 100 e namespace roadmap, mantendo os defaults existentes, para não encerrar processos alheios.

## F01 decisões de implementação

### D01 investimento e atribuição

O evento atual identifica link, dia e superfície e deduplica sessão/link/superfície/dia/tipo. Ele não identifica qual promoção causou o clique. O relatório exibirá cliques registrados no intervalo com destaque, sem alegar causalidade ou entrada em grupo.

Pedidos e promoções existentes não possuem relação direta entre si. Será acrescentada uma alocação de investimento por pedido/superfície/promoção na ativação e na renovação, na mesma transação da promoção. Não fazer backfill por coincidência de data ou valor. Histórico sem vínculo terá custo/CPC indisponíveis, com cobertura financeira explicitamente parcial.

O total efetivamente pago em centavos será dividido igualmente entre superfícies selecionadas, com resto distribuído em ordem estável. Essa convenção analítica não muda preços. Para recortes temporais, alocar proporcionalmente à duração contratada, com arredondamento em centavos e nota explicativa. Não somar eventos por JOIN com pedidos nem duplicar cliques em sobreposição: usar existência de uma janela elegível. Promoção administrativa não cria investimento pago.

### D02 cobertura e datas

Reutilizar a retenção existente de 12 meses, sem ampliar coleta ou inventar eventos. Datas de relatório e comparação usam America/Sao_Paulo; armazenamento mantém UTC. Período máximo de 366 dias, inclusivo por dia, comparação imediatamente anterior com a mesma duração. Zero cliques com impressões existentes difere de ausência de eventos e período fora da retenção; CPC é nulo sem cliques ou com cobertura insuficiente.

### Reuso e direção visual

Estender analytics-repository e as rotas atuais, reaproveitando autorização, CTR, componentes de painel, controles e formatadores. Uma composição em features/promotions reúne filtros, totais, comparação e tabela diária acessível. Não instalar biblioteca de gráficos para uma série que pode ser representada com HTML/SVG e tabela.

Direção dominante: padrões atuais do painel Tem Link Aqui. Referência secundária inspecionada no navegador: [Plausible dashboard overview](https://plausible.io/docs/guided-tour), para separar filtros, resumo e série, e [comparação de períodos](https://plausible.io/docs/compare-stats), para explicitar datas comparadas. Não copiar marca, cores ou coletar dados da referência. Refero não está disponível nesta sessão. Captura de referência foi inspecionada; o MCP não permitiu salvá-la nos caminhos do projeto.

## Ordem de execução

F01 → F06 → F07 → sequência do README, respeitando dependências. Decisões técnicas fundamentadas serão registradas; bloqueios comerciais ou de segurança não serão resolvidos inventando consentimento, preço ou permissão.

Logs da baseline preservados no checkout de execução: baseline-backend.log, baseline-postgres.log e baseline-playwright.log. Relatório HTML/JSON do Playwright gerado pelo runner existente. Nenhum teste pulado.

## Encerramento solicitado após F07 — 15/10/2026

F01 e F06 concluídas na branch; F07 implementada com pausa do tempo pago e recuperação moderada, conforme D08. Ver [execução F06](execucao-f06.md) e [execução F07](execucao-f07.md) para resultados e CI. A instrução posterior do usuário substitui a continuidade automática: encerrar após validar e documentar F07. F02 e demais features não foram iniciadas. Nenhum deploy ou push na main realizado nesta etapa.

## Continuação limitada à F02 — 16/10/2026

Nova solicitação: fazer a próxima e parar ao acabar. F02 implementada na mesma branch; validação e fechamento em [execução F02](execucao-f02.md). Esta autorização supera a parada anterior somente para F02; não iniciar a seguinte.

## Continuação limitada à F03 — 16/10/2026

Solicitação posterior: fazer a próxima e parar. F03 concluída em `2672f834a3f2e34c6e7c794e0f9c31cfb57a885c`, com CI 38917846538 aprovado e evidências em [execução F03](execucao-f03.md). Esta autorização supera a parada após F02 somente para esta feature. Encerramento após F03; F04 não iniciada. Nenhum deploy, main ou envio real.

## Continuação limitada ao ajuste F03 e à F04 — 16/10/2026

Pedido posterior do usuário: sugestões aleatórias, depois próxima feature e parar. F03 ajustada em bbcd415; F04 implementada em 71e5a23, com correção de fronteira/privacidade em `1f283a46cfe0a71cea2afb2abde223cb6dd9eb43`. [CI 38923117928](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38923117928) aprovado. Ver [execução F04](execucao-f04.md). Encerramento após F04; F09 não iniciada. Sem deploy, main ou envio real.


## 16/10/2026 — início da F09 e decisão pendente

O usuário autorizou somente a próxima feature, F09. [Execução F09](execucao-f09.md) registra inventário, reuso e preparo isolado de normalização de slug/ordenação (21 casos; regressão backend 424 testes, lint/typecheck/build aprovados). S0 aguarda a resposta D10: liberação automática com bloqueio para correção ou revisão humana de URLs que ficam exclusivamente no perfil. Não usar Link/ModerationCase do catálogo como atalho que consuma quota ou publique itens. Nenhuma API, migration ou UI implementada; nenhum AC ou etapa completa aceito; PG/E2E F09 ainda não executados. F12 e seguintes não iniciadas. Sem main, deploy, cobrança ou notificações reais.


## 16/10/2026 — F09 concluída e parada

O usuário resolveu D10: validação automática, bloqueio de suspeitos e rascunho para correção. F09 concluída na branch: editor, perfil SSR, mídia validada, prévia/publicação/retirada versionadas e isolamento. [Execução F09](execucao-f09.md) registra contratos, reuso, limites, reversão, 424 testes backend, 196 frontend, 137 PG e 92 E2E. Código aba5b14907ec5d4bb794266b768cd282470a3d20; CI 38940575906 aprovado nos quatro jobs. S0–S7 e seis ACs encerrados com evidências. Parada após F09; F12 não iniciada. Sem main, deploy, mensagens ou cobrança reais.

## Retomada contínua em 16/10/2026

O usuário autorizou continuar as features sem a parada anterior por feature. F12 entrou em preparação; contrato de entrada e quatro testes preparatórios RED/GREEN registrados. Liberação de novo destino e retenção de histórico aguardam decisão do usuário. Nenhum AC foi fechado nesta preparação. Ver [execução F12](execucao-f12.md).
