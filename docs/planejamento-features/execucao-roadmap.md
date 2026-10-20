# Execução contínua do roadmap

Estado corrente em 18/10/2026: F19, F08 e F11 S0–S6 validadas localmente; F13 S0–S6 validada localmente; F14 S0–S6 validadas localmente; F16 S0–S6 validadas localmente; F17 S0–S6 validadas localmente; F18 S0–S6 validadas localmente; execução encerrada na F18 por pedido do usuário em 18/10. O checkout atual é main com alterações locais preservadas; o AGENTS vigente exige pedido para novas operações de Git. Não foram criados branch, commit, push ou deploy nesta continuação. Os registros de branch/CI abaixo são históricos, não descrição do estado atual.

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

## 16/10/2026 — F12 concluída; parada solicitada

A instrução mais recente limita a execução à feature em andamento. F12 concluída em `1809e1d97f0b7e7681409041a2073412352d91d6` na branch codex/roadmap-features; [CI 38971032480](https://github.com/MentesReprogramadas/divulgadorlink/actions/runs/38971032480) aprovado. Destino estável com troca validada, histórico 50/180, métricas separadas, isolamento/idade e painel. Local: 431 testes backend, 201 frontend, 152 PG e 100 Playwright. [Execução F12](execucao-f12.md) registra reutilização, limites, falhas/correções, migração e reversão. S0–S7 e cinco ACs atualizados. Parada após F12; F19 não iniciada. Sem main/deploy.


## 17/10/2026 — personalização da Minha página

Autorização específica para evoluir F09 após os ajustes do painel. Página pessoal sem chrome do catálogo, temas/cores/botões/fontes, prévia compartilhada, marca obrigatória e fotos WebP com validação servidor. Não retoma F19 ou próxima feature. Ver [registro do lote](../frontend-profissional/minha-pagina-personalizacao.md) para testes, arquivos, limites e reversão. Migração aplicada ao desenvolvimento local e ao banco descartável dos testes; sem main/commit/push/deploy.


## 17/10/2026 — marca discreta e revisão de páginas/convites

Autorização específica posterior: assinatura pequena e ciclo IA → aprovação automática ou humano → recusa/contestação para F09/F12. Implementação local versionada por envio, sem consumir quotas de Link. [Registro e critérios](../frontend-profissional/revisao-paginas-convites.md) descrevem reuso, testes, migração e reversão. Sem avanço de ordem, nova feature, commit, push ou deploy; fases históricas e seus CI permanecem históricos.

## Extensão de 17/10/2026 — páginas e convites no WhatsApp

Por novo pedido expresso, revisões humanas de F09/F12 e suas contestações também usam o grupo Evolution configurado, a mesma autorização por operador ADMIN e a mesma operação de decisão do painel. O aviso citado identifica a versão exata; expiração, substituição e contestação invalidam mensagens anteriores. Decisão e registro do aviso de confirmação são atômicos, sem alterar aprovação automática, regras de segurança ou cobrança. Avisos ganham símbolos distintos por evento e mantêm seções curtas.

Contrato, critérios, limites, evidências e resultados no [complemento da implementação](../frontend-profissional/revisao-paginas-convites.md#complemento-autorizado--aprovação-pelo-whatsapp).

## 17/10/2026 — F19 e continuação sem parada por feature

Usuário autorizou F19 e sequência, depois delegou decisões fundamentadas com alternativas documentadas. F19 implementada/validada localmente, com S0–S6 e ACs em execucao-f19.md; S7 remoto em revisão. Fotos antigas não são guardadas, conforme escolha expressa. F08 D09 aprovada: consentimento obrigatório, dez buscas e 180 dias. Sem branch, commit, push ou deploy novos.

## 17/10/2026 — F08 validada e avanço da sequência

F08 S0–S6 concluídas localmente: observações consentidas, pseudônimo diário por tenant, limiar dez, retenção 180 dias, consulta/saída correlacionadas e relatório administrativo. As escolhas técnicas e alternativas foram registradas sem nova pergunta, conforme instrução do usuário. Regra de categorias conciliada com a busca efetiva, sem inventar filtros de entrada. 32 E2E finais sem retry/skip, 19 PG, tipos/lint/build; correção adjacente de hidratação do menu comprovada por RED e teste de rede lenta. [Registro completo](execucao-f08.md). F11 é a próxima; S7 remoto de F19/F08 continua em revisão, sem impedir trabalho independente. Nenhum commit/push/deploy nesta execução.

## 17/10/2026 — F11 validada; F13 S0–S6 validada localmente; F14 S0–S6 validadas localmente; F16 S0–S6 validadas localmente; F17 S0–S6 validadas localmente; F18 S0–S6 validadas localmente; execução encerrada na F18 por pedido do usuário em 18/10

F11 entregue localmente com catálogo/capacidades, versões de preço, intenções duráveis e SDK Billing separado dos destaques; confirmação canônica, troca no próximo ciclo, cancelamento/suspensão/exclusão e recuperação. 490 unitários backend, 212 PG, dez E2E específicos e 69 de regressão em relatórios com sobreposição; dezesseis capturas revisadas. Migração de desenvolvimento preservou integralmente pedidos/destaques/página. Venda continua desligada por padrão, marca e gratuito preservados; recursos futuros não são vendidos. [Decisões, alternativas e limites](execucao-f11.md). S7 remoto/comercial permanece em revisão. F13 reutiliza qrcode e as APIs atuais, com decoder somente de QA; implementação/testes em [execução F13](execucao-f13.md).

## 18/10/2026 — F18 encerrada; parada solicitada cumprida

Busca contextual pública/prévia com filtro por grupo, URL/cursor, teclado e projeção temporal segura. [Execução F18](execucao-f18.md): S0–S6 verificadas, 511 U backend/305 U frontend/239 PG, 129 E2E mais seis finais sobrepostos, 20 capturas. Planos/spec/matriz reconciliados; S7 remoto pendente. Próxima F27 permanece NÃO INICIADA. Checkout main com alterações locais preservadas, sem operações Git/deploy nesta continuação.

## 18/10/2026 — retomada F27 até antes da F25

Usuário autorizou F27, F31, F34, F37, F38, F05, F15, F20, F21, F22 e F23 na ordem do roadmap; parar ao chegar na F25, que fica não iniciada. F27 em implementação, com decisões D29 e evidências parciais em [execucao-f27.md](execucao-f27.md). Sem branches/commits/push/deploy novos. Preservar mudanças simultâneas do modo de suporte de outra atividade.

## 18/10/2026 — F27 validada localmente; preparação F31

F27 S0–S6 e cinco ACs verificados: 520 U backend, 311 U frontend, 246 PG e seis E2E finais próprios; 18 capturas. Regressões amplas, falhas e limites separados em [execucao-f27.md](execucao-f27.md); S7 global/CI/liberação pendentes. F31 iniciou somente preparação D33, sem coleta habilitada, em [execucao-f31.md](execucao-f31.md). Seguir sequência autorizada até F23; F25 permanece não iniciada.

## 18/10/2026 — F31 em validação local

API, persistência, consentimento específico, observação de blocos e relatório implementados; regressões unitárias e oito PG próprios aprovados. E2E desktop/mobile, inspeção visual e regressão final ainda em andamento. [Decisões e alternativas](execucao-f31.md). F34 e seguintes não iniciadas neste checkpoint; F25 continua fora da execução.

## 18/10/2026 — F31 encerrada localmente; avanço para F34

F31 S0–S6 verificadas: nove PG próprios, 527 U backend/321 U frontend, oito E2E próprios finais, 152 E2E de regressão com sobreposição e 12 capturas revisadas. PG global 254/255: REG-F03-001 reproduzida no código inalterado, mantida visível em S7. [Registro completo](execucao-f31.md), [pendência](pendencias-validacao.md). Sem Git/deploy novos. Sequência continua F34/F37/F38/F05/F15/F20/F21/F22/F23; F25 não iniciada.

## 18/10/2026 — F34 encerrada localmente

S0–S6 verificadas: 532 U backend/324 frontend; 60 PG afetados (nove próprios); seis E2E próprios finais; 73 de regressão com sobreposição; 14 capturas revisadas; reader F31 compatível. [Registro](execucao-f34.md). S7 global/remoto em revisão, sem Git/deploy novos. Próxima F37; parada antes da F25 mantida.

## 18/10/2026 — F37 encerrada localmente e parada

F27, F31, F34 e F37 concluídas no ambiente local declarado nesta retomada. F37: 539 backend/330 frontend, 129 PG afetados, oito E2E próprios dentro dos 81 de regressão e 26 capturas revisadas. [Execução F37](execucao-f37.md). S7 global/CI/liberação pendentes; REG-F03-001 não ocultada. Pedido mais recente revoga a continuação até F25: parar agora. F38 é a próxima; nenhuma feature posterior iniciada. Sem Git/deploy novos.

## 18/10/2026 — branch de teste autorizada após F37

Após encerrar as features, o usuário autorizou commit e branch para testar na própria pasta principal. Branch codex/roadmap-f37-testes criada a partir de a7aad9c em C:/VSCODE/divulgadorlinks; frontend/backend compartilham esse checkout. O commit reúne o código acumulado, migrations, testes, docs e evidências até F37, incluindo os módulos anteriores necessários. Envs reais, saídas de harness e imagens avulsas de output permanecem locais; exclusões antigas em output não foram incorporadas. Typecheck dos dois pacotes repetido e aprovado antes do commit; validação funcional permanece a registrada por feature, incluindo os 81 E2E locais finais. Push direcionado exclusivamente à nova branch, sem merge ou deploy da main. CI remoto é um gate separado e ainda não declarado aprovado. Nenhuma feature posterior à F37 iniciada.

## 19/10/2026 — Continuidade até F21

Pedido vigente substitui a parada histórica após F37. F38 e F05 validadas localmente, conforme seus registros; seguir F15 → F20 → F21 e parar. Sem autorização nova de commit/push/deploy. S7/CI/liberação não presumidos.


## 19/10/2026 — Encerramento na F21

Sequência F38 → F05 → F15 → F20 → F21 concluída localmente, com specs/planos/matriz/evidências atualizados. Parada atendida após F21, sem iniciar F22. Próxima implementação planejada é F22, dependente de nova continuação do usuário. S7/CI/liberação remotas não executadas. Sem novos commits, push ou deploy. [F20](execucao-f20.md) · [F21](execucao-f21.md).


## Refinamento solicitado após F21 — 19/10/2026

Implementação e decisões: [refinamento F05/F15/F20/F21/F38](refinamento-f05-f15-f20-f21-f38.md). Inclui importação JSON confirmada para rascunho, resumos com frequência no modal e desligamento direto, sidebar por contexto, prévia de campanha preservando o formulário, equipe global com leitura/escrita por recurso e apresentação para parceiros com métricas objetivas.

Não inicia uma nova feature da sequência: mantém 26/42 implementações e F22 não iniciada. Gates locais e evidências da ampliação estão no registro vinculado; S7/CI/liberação remotas continuam EM REVISÃO. Sem nova branch, commit, push ou deploy; alterações existentes preservadas.

## 19/10/2026 — sequência F22 → F23 → F25 encerrada

29/42 implementações nos ambientes declarados; 13 restantes. F22 (contatos), F23 (distribuição) e F25 (assistente) verificadas localmente até S6. Parada após F25 conforme pedido, sem iniciar F28. [F22](execucao-f22.md) · [F23](execucao-f23.md) · [F25](execucao-f25.md). S7/CI/liberação remota em revisão; não apagar pendências históricas. Sem branch, commit, push ou deploy novos; banco pessoal e ambiente externo preservados. Migrations prontas e verificadas em bancos descartáveis, ainda dependem de aplicação no ambiente alvo autorizado.


## Refinamento de entrada e edição — 19/10/2026

[Fluxos guiados F22/F23/F25, decisões, alternativas e provas](refinamento-f22-f23-f25.md). Distribuição orientada na lista de Convites; contato na criação/edição e na visão geral; escolha manual/assistida antes da primeira página. Checkbox corrigido, busca movida para Página e prévia do rascunho nas quatro abas de edição. Mantém 29/42; F28 não iniciada e S7 remoto pendente. Sem commit/push/deploy novos. O registro vinculado complementa as provas históricas, sem reescrever os resultados anteriores.


## 20/10/2026 — F28 concluída localmente

[Execução, decisões e provas](execucao-f28.md). Checkpoint inicial 0d0a32b preservou todas as alterações locais. F39 corrigida para não iniciada. 30/42 implementações locais; próximo F29 → F32 → F33 → F10 por autorização vigente, sem parar na primeira feature. S7 remoto em revisão; sem push/deploy.


## 20/10/2026 — F29 validada localmente

[Evento na página: contrato, ACs, decisões e provas](execucao-f29.md). 31/42 implementações registradas. Próxima sequência F32 → F33 → F10; parar após F10; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


## 20/10/2026 — F32 validada localmente

[Kit de divulgação: contrato, ACs, decisões e provas](execucao-f32.md). 32/42 implementações registradas. Próxima sequência F33 → F10; parar após F10; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


## 20/10/2026 — F33 validada localmente

[Coleções públicas compartilháveis: contrato, ACs, decisões e provas](execucao-f33.md). 33/42 implementações registradas. Próxima sequência F10; parar após F10; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


## 20/10/2026 — F10 validada localmente

[Página premium com subdomínio: contrato, ACs, decisões e provas](execucao-f10.md). 34/42 implementações registradas. Próxima sequência parada solicitada após F10; próximas futuras F24 → F30 → F35 → F39 → F26 → F36 → F40 → F41; autorização de parar após F10 preservada. S7 remoto em revisão; commits na mesma branch, sem push/deploy.


### Fechamento F10 — limite da validação

Implementação/automação locais concluídas, AC03 parcial e F10-M01 (TLS/DNS real em staging) pendente. CI/deploy não executados. Parada solicitada após F10: não iniciar F24. [Operação e reversão](operacao-f10.md).


## Entrega solicitada em 20/10/2026 — parada após F10

- 0d0a32b: snapshot de todas as alterações locais não ignoradas existentes, preservando ajustes do usuário.
- df41371: F28, comprovação de controle de domínio de destino.
- b100747: F29, eventos e calendário na página.
- dc859a9: F32, kit de divulgação com prévia e QR real.
- e2d5b8a: F33, coleções públicas com elegibilidade viva.
- F10: endereço próprio, gate TLS e isolamento; hash vinculado após commit em evidencias-f10.json.

F39 tinha somente indicação indevida no índice; foi reconciliada para não iniciada, sem implementação fictícia. O roteiro posterior permanece F24, F30, F35, F39, F26, F36, F40 e F41; nenhum foi iniciado nesta autorização. F10-M01 real e S7 continuam pendentes. Nenhum push/deploy realizado.
