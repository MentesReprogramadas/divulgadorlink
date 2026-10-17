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

Testes unitários verificam limites, datas, seeds, diversidade de população e bloqueio de ambiente. O teste PostgreSQL `src/use-cases/@Analytics/simulate-traffic.pg.spec.ts` verifica dry-run sem escrita, agregação por repositório real, teto com evento preexistente, repetição, concorrência, incremento, vínculo clique/impressão, rejeição de configuração diferente e rollback repetível. Execute com `PG_SPECS=1` e `ANALYTICS_DATABASE_URL` de um banco descartável com migrations aplicadas.
