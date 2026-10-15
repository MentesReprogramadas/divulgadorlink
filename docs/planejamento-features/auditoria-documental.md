# Auditoria documental do planejamento

Auditoria inicial em 14 de outubro de 2026; revisão de prioridade em 15 de outubro de 2026. Escopo: verificar a estrutura e a rastreabilidade dos documentos produzidos, sem implementar features e sem executar testes da aplicação.

## Resultado atual em 15 de outubro de 2026

F42, moderação e alertas operacionais no grupo pela Evolution API, foi incluída como primeira feature, após G00 mínimo. As 41 features anteriores conservam seus IDs e sua ordem relativa; receberam gate de prioridade explícito nas specs, planos, índice, inventário e etapas do ledger. Esse gate é de sequência, não dependência funcional do produto em WhatsApp.

| Verificação | Resultado atual |
| --- | --- |
| Features, specs e planos | 42 de cada |
| Primeira feature | F42, ordem 1, prioridade P0 |
| Critérios rastreados | 226: 200 preservados e 26 de F42 |
| Etapas no ledger | 336, oito por feature |
| Cenários unitários específicos descritos | 161: 153 anteriores e oito de F42; não executados |
| Fonte integral nas specs | 42 de 42 |
| Dependências e gate de prioridade | Consistentes, sem ciclo e sem dependência de F42 em F30 |
| Links e âncoras locais | 1092 conferidos, sem falhas |
| Estados de implementação | Todos NÃO INICIADOS |
| Testes da aplicação | NÃO EXECUTADOS |
| API Evolution, configuração de webhook e envio ao grupo | NÃO EXECUTADOS |
| Possíveis credenciais fornecidas | Não utilizadas nem copiadas para documentação ou arquivos de configuração |

SHA256 atual de `docs/features-propostas.md`: `6CBD63F2210EC98635C3D3643D9826B656EDB091DBED70DAE07783FE12E79B22`. O hash anterior continua abaixo como registro histórico e em previousSourceSHA256 no inventário.

A fonte foi ampliada por solicitação explícita para incluir F42 e atualizar a ordem sugerida; os corpos das 41 features anteriores permanecem reproduzidos integralmente em suas specs. D44–D47 registram decisões de versão, instância, autenticação, operadores, retenção, retry e serviço compartilhado antes da implementação. Botões não foram assumidos como compatíveis com a instalação; comandos explícitos e painel são alternativas planejadas.

## Histórico verificado em 14 de outubro de 2026

| Verificação | Resultado |
| --- | --- |
| Features distintas na fonte | 41 |
| Specs individuais | 41 |
| Planos individuais | 41 |
| Etapas no ledger | 328, oito por feature |
| Critérios na matriz | 200, sem ID duplicado ou ausente |
| Origem dos critérios | 196 trechos explícitos da fonte e quatro critérios derivados da tabela comercial de F11 |
| Cenários unitários específicos descritos | 153; planejados, não executados |
| Fonte integral incluída em cada spec | 41 de 41 |
| Dependências | IDs existentes e ordem topológica válida, sem ciclos |
| Links locais e âncoras | 991 conferidos na revisão final anterior a este relatório, sem falhas |
| Caminhos de reutilização citados nas features | Todos existem na árvore consultada |
| Estado das etapas | Todas NÃO INICIADAS |
| Resultado de testes na matriz | Todos NÃO EXECUTADOS |
| Documentação original | Preservada, SHA256 abaixo |

SHA256 da fonte `docs/features-propostas.md`: `D682998DB91E320F5B703C05C501D9490781E0B67EA22C3FD436524A9B0ED724`.

## Procedimento realizado

Leitura da fonte e dos contratos locais de autenticação, tenant, analytics, filas, URL, componentes e harness de testes. Comparação do inventário com as seções da fonte. Conferência de existência de specs, planos e caminhos de reutilização. Validação de cada ID de critério e etapa, da ordem das dependências e dos links locais, incluindo âncoras do roadmap. Comparação textual da fonte integral normalizada nas 41 specs e confirmação do hash da fonte ao final.

Na revisão de conteúdo, o formulário de contatos F22 passou a depender também de F20 para tratar colaboradores autorizados antes de liberar acesso aos contatos. Essa dependência foi atualizada na spec, plano, índice, roadmap, ledger e inventário. Geração pura de QR e kit de divulgação não exige criação automática de repository, controller ou migration.

## Limites e trabalho futuro

Esta auditoria não prova correção de código futuro, baseline verde, execução dos casos, TLS real, leitura de QR em câmera, instalação PWA em dispositivo ou aparência das telas futuras. Esses pontos têm gates de implementação, testes e revisão manual nas specs e na estratégia de qualidade.

Não foram escritos testes de aplicação, criadas migrações, instaladas bibliotecas, iniciados servidores ou executados planos. Na elaboração inicial foram criados ou ajustados somente arquivos em `docs/planejamento-features`; na revisão de 15 de outubro também foi ampliada a fonte `docs/features-propostas.md`, conforme solicitado. Alterações preexistentes de backend/frontend foram preservadas.

Decisões de produto permanecem pendentes onde indicadas. Os contratos novos são propostos; nomes de arquivos novos não obrigam a criar abstrações sem necessidade. Antes da execução futura, confirmar a revisão atual do código, atualizar o inventário se a fonte mudar e seguir G00 e os gates de cada feature.
