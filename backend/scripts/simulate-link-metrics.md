# Histórico de métricas para desenvolvimento

O script grava `IMPRESSION` e `CLICK` em `analytics_events`, usando o tipo padrão `REAL`, sem uma série separada na interface. Não altera eventos existentes, schema, consultas, preços ou autorização. Usa `ORGANIC` para não atribuir os eventos gerados a campanhas pagas. A sessão contém o identificador técnico do lote, necessário para idempotência e reversão; `simulationId` permanece nulo, conforme a constraint existente.

## Análise da integração

- `Link.createdAt`, `tenantId` e `id` delimitam o histórico e o isolamento. Todos os links do tenant entram, inclusive rascunhos; `--link ID` restringe a seleção. Isso exercita dados de teste desde a criação, não reconstitui o histórico de publicação (que não é armazenado integralmente).
- `PrismaAnalyticsRepository.totals`, `impressionTotals` e `performanceSeries` agregam eventos, com filtro `REAL` nas alterações locais atuais. Não há contador separado a atualizar. A restrição única é sessão/link/superfície/dia/tipo de evento.
- `link-row.tsx`, `panel.tsx`, `panel-links.tsx`, painel administrativo e `performance-report.tsx` consomem essas contagens. Nenhuma alteração visual é necessária.
- O dia segue `America/Sao_Paulo`, reutilizando os helpers de analytics, inclusive mudanças históricas de fuso. Cada clique tem uma impressão com a mesma sessão, dia, instante e superfície. Os timestamps coincidentes representam conversão dentro da visita, sem modelar tempo de permanência.
- A retenção existente elimina eventos após 12 meses; o relatório de desempenho também limita sua cobertura. A simulação não muda essa política, nem alimenta `SiteTrafficDaily`, aquisição, cookies, redirecionamentos ou filas de tracking.

## Modelo matemático

Para cada link, um PRNG inicializado pelo hash SHA-256 de seed/tenant/link gera uma normal Z por Box–Muller. O volume V é sorteado por rejeição de `round(medianViews × exp(sigma × Z))`, condicionado a `[minViews, maxViews]`. Rejeição evita concentração artificial nos extremos causada por simples clamp. Configurações com probabilidade desprezível de aceitação falham após 10.000 tentativas.

O alvo de impressões é `clamp(round(V × (1 − exp(−idade/maturityDays))), minViews, maxViews)`. O piso prevalece inclusive para links muito novos; use `minViews: 0` para permitir ausência de tráfego. A mediana é a da distribuição anterior à truncagem e ao ajuste por idade, não a mediana garantida da população final.

Cada hora recebe peso pelo produto de maturação inicial e decaimento lento, seno mensal com fase por link, fator de fim de semana, ruído diário, pico diário Bernoulli e perfil horário. Madrugada tem peso 0,12 e noite 1,7. Horas parciais recebem peso proporcional à duração. Amostragem categórica pela distribuição acumulada distribui o alvo entre esses intervalos; o instante é uniforme dentro da hora. Os picos redistribuem o volume fixado, sem acrescentar tráfego acima do teto.

CTR base é uniforme entre `minCtr` e `maxCtr`, com modulação diária; cada impressão converte por Bernoulli. Os limites de CTR descrevem a probabilidade base, não uma garantia sobre a taxa observada de pequenas amostras. Não se pretende reproduzir uma população real medida.

Valores padrão: 40–2500 impressões, mediana 650, sigma 0,95, CTR 2–18%, maturação 30 dias, fim de semana 1,2, probabilidade de pico 4%, multiplicador 4. Há volumes baixos, intermediários e cauda alta; nenhuma faixa é uma quota garantida em poucos links.

O arquivo de exemplo foi ajustado a pedido para 800–4000 impressões por link, mediana 2200 e sigma 0,6. A maturação acelerada de 0,25 dia (6 horas) permite volumes maiores nos links recentes deste ambiente de teste. Os padrões internos sem arquivo continuam os descritos acima.

## Uso em PowerShell

Para aplicar ou reverter no banco remoto de desenvolvimento explicitamente autorizado, acrescente `--remote-development`. Sem essa opção, gravações remotas são bloqueadas. `NODE_ENV=production` continua bloqueado em todos os modos.

Execute no diretório `backend`, com `DATABASE_URL` apontando para o banco dev local e migrations existentes aplicadas. Não é necessária nova migration para o script. `NODE_ENV` deve ser `development` ou `test`; para gravação, hosts aceitos são localhost/127.0.0.1/::1. Dry-run também aceita host remoto e suas transações usam SET TRANSACTION READ ONLY. A contagem aceita tanto o schema original sem type quanto o schema local com essa coluna. Um túnel local deve apontar exclusivamente para seu ambiente de desenvolvimento.

```powershell
$env:NODE_ENV = 'development'
# Prévia: não escreve eventos nem auditoria
npm run metrics:simulate -- --tenant SEU_TENANT_ID --run historico-01 --config scripts/simulate-link-metrics.example.json

# Persistir a mesma prévia
npm run metrics:simulate -- --tenant SEU_TENANT_ID --run historico-01 --config scripts/simulate-link-metrics.example.json --apply

# Reversão: primeiro prévia; acrescentar --apply para remover o lote
npm run metrics:simulate -- --tenant SEU_TENANT_ID --run historico-01 --config scripts/simulate-link-metrics.example.json --rollback
```

`--until ISO` e `--seed texto` podem substituir valores do arquivo; sem arquivo, `--until` é obrigatório e os outros parâmetros usam os padrões. O exemplo termina em 17/10/2026 às 00h UTC. Escolha o horizonte desejado antes da primeira gravação. `--through` deve ser <= agora e <= until, sendo inclusivo; o horizonte until é exclusivo.

Para avanço incremental use a mesma configuração e run, inicialmente `--through 2026-10-01T00:00:00.000Z`, depois outro instante maior, até `until`. O horizonte fixo torna o cronograma independente do ponto de execução; não mudar `until` a cada retomada. Mudanças de seed, parâmetros ou `--link` exigem outro run. Novos links criados antes do horizonte entram em execuções posteriores. Repetir o mesmo comando não duplica eventos. Uma nova run é aditiva e também respeita o teto existente.

## Persistência, custos e reversão

### Cron gradual — 21/10/2026

O usuário ampliou explicitamente a autorização para produção nesta data. O executável `src/scripts/simulate-scheduled-metrics.ts` aceita produção somente com `--allow-production` e atende exclusivamente o tenant `cmuvlp9th0000o7014v8mxerz`. O CLI antigo continua bloqueando produção.

O agendamento proposto é `*/15 * * * *`, com timeout de 300 segundos. Cada execução revela somente visitas planejadas até agora. Os lotes `scheduled-metrics-v1-AAAA-MM-DD` têm horizonte fixo por dia de São Paulo, evitando duplicação ao repetir a tarefa. Um lote do dia anterior já iniciado é concluído na próxima execução; dias inteiros ausentes não são recuperados. Em 21/10 o início foi fixado em 13:00 UTC (10h de São Paulo), para não preencher retroativamente a manhã na ativação.

**Ativado em produção:** aplicação `divulgador-api` (`3rzvngm8sz51yjj4i3jmtr1i`), tarefa `osq2irzgpvlbak8yc1vjr5wq`, enabled=true, frequência de 15 minutos, timeout 300. Comando: `node /app/metrics-scheduled-v1.cjs --allow-production --apply`. Primeira execução registrada pela Coolify: `yvymq9hanw8d45qpkijio3id`, 21/10/2026 às 13:09:01–13:09:03 UTC (10:09 em São Paulo), status success, 82 links processados, 127 impressões e 5 cliques inseridos, zero exclusões. A prévia da versão final tinha retornado 104/3 minutos antes; o relógio continuou avançando entre as execuções.

Mantidos 180–300 views por dia completo com orçamento disponível, criação proporcional ao tempo de existência, CTR variável, patrocínio, teto comum de 3500 e tetos individuais de destaque inferiores a 4000. Ao alcançar o teto, o gerador para de acrescentar views nesse link. Não há promessa de crescimento infinito. Eventos reais continuam preservados; os novos eventos gerados entram nos agregados normais conforme solicitado anteriormente.

O build inclui `build/scripts/simulate-scheduled-metrics.js`. A instalação na Coolify usa um arquivo gerenciado `/app/metrics-scheduled-v1.cjs` e comando curto, pois a coluna de comando de tarefas da versão 4.4.6 é varchar(255). O arquivo gerenciado contém o bundle compilado comprimido; não contém credenciais e não baixa código externo. O conteúdo fica fixado na configuração da Coolify, permitindo retomada mesmo após deploy de imagens anteriores. Alterações futuras do modelo exigem revisar a versão do lote e atualizar o arquivo gerenciado.

Montagem gerenciada `rmipm2pxmivp5skjgcqjwadm`, destino `/app/metrics-scheduled-v1.cjs`. Conteúdo salvo foi relido após recarregar a UI e comparado ao artefato local. Bundle descomprimido instalado no container atual: SHA-256 `75a9f596009592ad701e9b4c1283741c84a812511b19b9c4c75451cbe325bf6c`. A imagem/API não foi reiniciada nem reimplantada; a montagem gerenciada cobre futuros containers. Não foi provocado um redeploy apenas para testar sua remontagem. Nenhum ambiente dev separado foi encontrado na Coolify; não foi criado outro serviço. O comando também funciona em dev/test com o banco configurado e sem --allow-production.

```sh
# Prévia dentro do container configurado
node /app/metrics-scheduled-v1.cjs --allow-production
# Comando recorrente, após verificar a prévia
node /app/metrics-scheduled-v1.cjs --allow-production --apply
```

Reversão: primeiro desativar a tarefa em Scheduled Tasks da API. Para remover eventos de um dia, recuperar a configuração imutável no manifesto de auditoria desse lote e usar o rollback existente com a mesma run/configuração; remover somente suas sessões. Remover a tarefa e o arquivo gerenciado não apaga eventos já gravados.

Validação local: 11 testes afetados, lint, typecheck e build passaram. A prévia local não conectou ao banco de desenvolvimento em localhost:5437; a validação de banco foi realizada no container autorizado da API, inicialmente em dry-run. O grafo foi atualizado localmente com extração de código, sem LLM/API. O relatório de comunidades/HTML permanece histórico.

### Correção dos destaques concentrados em 4000 — 19/10/2026

O piso anterior de 3800 mais o complemento diário levou os destaques ao mesmo teto acumulado. `sponsoredCeilingMinViews` permite sortear um teto individual estável entre esse valor e `maxViews`, com seed/tenant/link e maturação de sete dias ao quadrado. A faixa superior permanece reservada aos destaques; a idade influencia o teto, e a geração diária continua proporcional ao tempo de existência. O teto individual é aplicado também ao orçamento de inserção, evitando nova concentração em 4000 quando esta configuração for usada.

`simulate-link-metrics.varied-sponsored.json` mantém os parâmetros diários e define a faixa de tetos em 3501–3999. Para próximos incrementos, atualizar since/until em outro arquivo e usar outra run. Não retomar os lotes antigos após uma correção: eles mantêm suas configurações imutáveis e podem repor eventos até o teto antigo.

`rebalance-sponsored-metrics.ts` corrige exclusivamente sessões de lotes explicitados por `--sources`. Remove visitas completas por ranking de hash, distribuídas pelo histórico, preservando os cliques das visitas mantidas e todas as sessões de visitantes. Não altera comuns. O dry-run é padrão; `--apply` confirma a escrita. Uma única transação com lock por tenant registra todas as linhas removidas em auditoria, permitindo restauração com `--rollback --apply`. A repetição da mesma correção é idempotente.

Aplicado no tenant dev solicitado em `destaques-variados-2026-10-19-01`: totais de 3858/692, 3690/347 e 3626/284 (visualizações/cliques). Removidos 828 impressões e 92 cliques gerados; as 20, 6 e 3 impressões de visitantes desses links permaneceram. O dry-run e a leitura posterior concordaram; repetir --apply retornou alreadyApplied. Oito testes de domínio, lint, typecheck e build passaram. A reversão foi inspecionada em dry-run, sem restaurar os dados.

```powershell
$env:NODE_ENV='development'
npx tsx scripts/rebalance-sponsored-metrics.ts --tenant SEU_TENANT --run destaques-variados-2026-10-19-01 --config scripts/simulate-link-metrics.varied-sponsored.json --sources historico-800-4000-01,historico-complemento-patrocinados-01,crescimento-diario-180-300-2026-10-19-02
# Acrescentar --apply para aplicar; --remote-development se for o banco dev remoto autorizado.
# Restauração: mesmo --tenant e --run, com --rollback (prévia), depois --rollback --apply.
```

### Crescimento gradual por idade — 19/10/2026

**Ajuste posterior do usuário:** a configuração efetivamente aplicada passou a ser `simulate-link-metrics.daily-180-300.json`, com `growth.dailyMin: 180`, `dailyMedian: 240` e `dailyMax: 300`. O lote inicial de crescimento baixo foi revertido por seu identificador e substituído pelo lote `crescimento-diario-180-300-2026-10-19-02`; o histórico anterior e eventos de visitantes foram preservados.

Quando `dailyMin` está definido, o sorteio log-normal é condicionado à faixa diária. Popularidade, idade e destaque influenciam a posição dentro da faixa, sem romper seus limites. O dia de criação tem limites proporcionais à fração do dia em que o link existe. O dia atual incompleto revela somente os eventos planejados até o corte, com variação por horário, e por isso não tem garantia de piso proporcional exato em cada hora. Uma hora recém-transcorrida não recebe 180 visitas de uma vez. O multiplicador de destaque desse perfil é 1,25 e continua limitado a 300/dia.

O intervalo de geração e o teto acumulado podem reduzir o total inserido: comuns continuam limitados a 3500 e patrocinados a 4000 no histórico completo. A faixa 180–300 vale para o plano de um dia local completo com orçamento disponível, não como garantia de tráfego humano nem de incremento depois de alcançar o teto. Sem `dailyMin`, permanece o modelo anterior de maturação lenta descrito abaixo, para compatibilidade com runs já auditadas.

O arquivo `simulate-link-metrics.growth-2026-10-19.json` substitui o piso de 800 e a maturação de 6 horas para os próximos incrementos. Não use `mode: top-up` nem `sponsoredMinViews` com `growth`.

O crescimento atende somente links atualmente PUBLISHED; não inventa novas visitas para rascunhos, rejeitados ou indisponíveis. A seleção não reconstitui mudanças históricas de publicação que não foram armazenadas.

`growth.since` inicia o intervalo inclusivo; `until` encerra o intervalo exclusivo. O primeiro lote diário continua o histórico a partir do corte anterior em 17/10/2026 às 16:44:53.029 UTC. O horizonte fica salvo no arquivo para retomada e reversão. Execuções posteriores devem começar no `until` da anterior. A auditoria impede uma nova run de crescimento com intervalo sobreposto; uma execução interrompida deve ser retomada com o mesmo identificador e configuração.

Cada dia local completo recebe um plano determinístico por seed/tenant/link/dia. Avançar o corte dentro do dia apenas revela eventos já planejados, sem redistribuir os anteriores. O volume usa popularidade log-normal fixa por link, log-normal diária, idade, fim de semana e picos ocasionais. Horários preservam o perfil já existente. No dia de criação o volume é proporcional à fração do dia restante, com apenas uma visita inicial após 5–45 minutos, limitada ao fim do dia local. Antes dessa primeira visita, zero impressões ainda é possível; zero cliques é normal em amostras pequenas.

A maturação diária é `0,12 + 0,88 × (1 − exp(−idadeEmDias/14))`. A mediana madura de referência é 40 visitas/dia antes de popularidade e sazonalidade, não uma quota. O teto diário também escala com a idade: no primeiro dia completo, um comum tem teto de aproximadamente 20 visitas, sem piso de centenas. Patrocinados recebem multiplicador 1,6, respeitando os tetos; a vantagem é estatística e não exige que um destaque recém-criado supere o histórico de um link antigo.

O lote usa CTR base de 2,5–12%, fim de semana 1,15 e picos com probabilidade 2,5% e fator 2,2. O teto diário é 160 e os tetos totais permanecem 3500 para comuns e 4000 para patrocinados. Eventos reais já existentes consomem esse orçamento; nada é removido ou reduzido. Totais altos dos lotes antigos continuam presentes. As visitas geradas continuam em ORGANIC, sem alterar campanhas, atribuição comercial ou eventos de visitantes.

```powershell
npm run metrics:simulate -- --tenant SEU_TENANT_ID --run crescimento-diario-2026-10-19-01 --config scripts/simulate-link-metrics.growth-2026-10-19.json --batch-size 1000
# Acrescente --apply e, para o dev remoto autorizado, --remote-development.
# A mesma run e configuração com --rollback --apply revertem apenas esse crescimento.
```

Os testes cobrem continuidade de cortes no meio do dia, limites temporais, diferença entre links novos e maduros, vantagem estatística de destaque, idempotência no PostgreSQL, bloqueio de sobreposição e rollback sem afetar eventos anteriores.

### Complementar totais e priorizar patrocinados

O arquivo `simulate-link-metrics.top-up.json` configura `mode: "top-up"`: o volume sorteado é o alvo total do link, descontando impressões já existentes, em vez de somar um novo volume completo. `commonMaxViews: 3500` e `sponsoredMinViews: 3800`, com `maxViews: 4000`, separam as faixas de teste. O piso também evita links zerados quando há intervalo válido entre criação e horizonte. Cliques continuam probabilísticos por visita; a prioridade configura visualizações, sem prometer ordenação absoluta de cliques.

Patrocinados são identificados pelo backend em `promotions`: status ACTIVE, ativação anterior ao horizonte e expiração posterior ou nula; pausas são respeitadas quando a tabela existe. A lista é congelada na auditoria da execução para permitir retomada mesmo após mudança do destaque. Isso não modifica campanhas nem atribui artificialmente eventos a superfícies pagas: os eventos gerados continuam ORGANIC.

Use um horizonte que inclua os links atuais. O corte fixo do exemplo original em 17/10 às 00h UTC excluía links criados depois dele. Para incluir novos cadastros após o complemento, crie outra configuração com horizonte atualizado e outra run em modo top-up. Links criados no futuro não recebem eventos anteriores à criação. O complemento não reduz totais preexistentes acima da faixa; se isso ocorrer, relata-se a limitação em vez de apagar histórico.

```powershell
npm run metrics:simulate -- --tenant SEU_TENANT_ID --run historico-complemento-patrocinados-01 --config scripts/simulate-link-metrics.top-up.json --batch-size 1000
# Acrescente --apply para gravar; em dev remoto autorizado, também --remote-development.
# Para reverter só o complemento, use a mesma configuração e run com --rollback --apply.
```

`--batch-size` aceita 1–1000 (padrão 250), controlando paginação de links, lotes de inserção e exclusão. O plano é calculado para um link por vez: memória O(horas de existência + maxViews); seleção temporal O(maxViews × log(horas)). Inserções do link e auditoria ficam na mesma transação. Cada execução do script serializa mutações por tenant usando advisory lock; o tracking normal continua ativo e não adquire esse lock.

Antes de inserir, o script conta todas as impressões `REAL` do link. A diferença para `maxViews` é o orçamento disponível. Se o histórico já excede o teto, não adiciona impressões nem apaga o excesso; o piso de novas impressões pode deixar de ser atingido. Tráfego real concorrente ou posterior pode elevar o agregado além do teto; o teto limita a contribuição do gerador no instante da leitura. A regra cliques <= impressões é garantida para as visitas geradas, não corrige inconsistências preexistentes.

Logs JSON mostram volumes novos por link e totais; dry-run mostra a previsão naquele momento. `audit_logs` registra configuração imutável, lotes de link e exclusões. Falha permite retomar o mesmo comando; se uma transação de link falhar, ela não deixa eventos parciais. Não trocar versões do algoritmo para retomar runs antigas.

Rollback exclui somente sessões com o prefixo derivado de tenant/run e preserva auditoria e eventos anteriores. Exclusões são transacionais por lote; ao começar a reversão a run é encerrada para novas inserções. Repita rollback após interrupção para terminar. Para gerar de novo, escolha outro run. O prefixo `dev-metrics:` é reservado ao script; não o use como sessão de visitantes.

## Validação

### Cron: desaceleração e retomada (23/10/2026)

A cron do tenant `cmuvlp9th0000o7014v8mxerz` passa a usar `growth.softLimit: true` a partir de 23/10/2026 às 00h de São Paulo (03h UTC). Até esse corte, preserva o lote v1 do dia; depois usa runs diárias v2. A frequência continua em 15 minutos. Esta política substitui os tetos totais da cron: 3500 nos comuns e a faixa individual dos patrocinados tornam-se marcos de desaceleração, permitindo ultrapassá-los.

Ao atingir o marco, o volume fica em 8%–18% do habitual por 2–4 dias e recupera gradualmente durante mais 2–4 dias, usando smoothstep. Seed, tenant e link determinam duração e intensidade diferentes. Depois retorna ao ritmo diário normal, ainda sujeito à idade, horários, sazonalidade e plano diário de 180–300 visitas antes da redução. Esse intervalo não é um piso durante a desaceleração. Há uma desaceleração inicial por link, sem reiniciar o ciclo a cada consulta.

O instante do marco fica registrado em `audit_logs` como `METRICS_RECOVERY_STARTED`, sob chave estável por seed/tenant/link. Para links já acima dele, consulta-se o evento da impressão que cruzou o marco. O checkpoint evita que repetições mudem a curva; dry-run não o grava. O sorteio determinístico mantém ou descarta a visita inteira, preservando clique/impressão. Rollback remove somente os eventos da run e mantém a auditoria, incluindo o marco de recuperação. Configurações sem `softLimit` preservam os limites anteriores.

Validação desta alteração: 13 testes unitários, integração PostgreSQL descartável com 71 migrations (dry-run sem escrita, ultrapassagem do antigo teto, repetição sem novos eventos e rollback), lint, typecheck e build do backend passaram. O ciclo completo de vários dias é verificado pelos testes determinísticos; sua passagem em produção depende do tempo real.

Atualização na Coolify em 22/10: arquivo persistente salvo e bundle montado no container conferido por SHA256 `0d867b7fcad0a779e38559cf651bd693e6d95ba13f7b7e02c88ac4ec76d913c9`, sem reiniciar a API. Dry-run remoto terminou com código 0, 110 links, previsão de 252 impressões e 19 cliques para o intervalo pendente do dia 22 (ainda v1), sem gravar eventos. A nova política v2 entra no corte acima. Para suspender futuras inserções, desativar a tarefa `osq2irzgpvlbak8yc1vjr5wq`; reversões de eventos continuam exigindo a configuração e run originais.

Testes unitários verificam limites, datas, seeds, diversidade de população e bloqueio de ambiente. O teste PostgreSQL `src/use-cases/@Analytics/simulate-traffic.pg.spec.ts` verifica dry-run sem escrita, agregação por repositório real, teto com evento preexistente, repetição, concorrência, incremento, vínculo clique/impressão, rejeição de configuração diferente e rollback repetível. Execute com `PG_SPECS=1` e `ANALYTICS_DATABASE_URL` de um banco descartável com migrations aplicadas.
