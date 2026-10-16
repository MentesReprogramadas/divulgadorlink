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
