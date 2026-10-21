# Graphify — Tem Link Aqui

Atualização de campanhas em 21/10/2026: extração incremental local de código após a correção de atribuição. Última passagem concluída: 6.989 nós e 24.122 relações; 14 arquivos reprocessados e 1.329 reutilizados. Inclui mudanças simultâneas de outras tarefas. Sem LLM/API ou novo clustering; relatório e HTML permanecem históricos. A extração anterior advertiu sobre parse parcial de `frontend/src/features/contact-forms/contact-handling.test.tsx`, fora da correção; conclusões devem continuar confirmadas no código. Arquivos sem símbolos, incluindo o E2E de funil, não possuem cobertura estrutural completa.

Extração local em 20/10/2026. Escopo escolhido pelo usuário: código e testes de frontend e backend, sem cópias de validação, documentação, capturas ou serviços externos.

- 1.261 arquivos classificados como código, incluindo migrações SQL.
- 6.629 nós e 22.651 relações no JSON bruto.
- 231 comunidades automáticas; nomes mantidos como `Community N`, sem rotulagem semântica por LLM.
- A análise em grafo simples usa 21.894 pares de conexão: 757 relações se sobrepõem entre os mesmos nós. O JSON bruto preserva as relações.
- Diagnóstico: zero relações com endpoints ausentes ou pendentes; 19 autorrelações. Conexões inferidas exigem confirmação no código.
- 158 arquivos não produziram símbolos. CSS Modules, Prisma schema, Dockerfiles e outras extensões não suportadas não têm cobertura estrutural completa.
- O filtro de sensibilidade ignorou `frontend/e2e/fixtures/external-test-cert.pem`, `frontend/e2e/fixtures/external-test-key.pem` e `frontend/src/styles/tokens.css`. O último é um falso positivo de nome; não foi necessário contornar o filtro para o índice de código.
- Custo de extração por LLM/API: zero tokens de entrada e zero de saída. Isso não contabiliza os tokens desta conversa.
- O código tinha alterações locais de outras tarefas. O índice é um retrato do working tree durante a execução, não uma validação de commit ou produção.

## Saídas

`graph.json`: dados consultáveis; `GRAPH_REPORT.md`: análise automática; `graph.html`: visualização agregada de comunidades. O HTML usa agregação porque o grafo ultrapassa 5.000 nós.

## Atualizar sem envio externo

```powershell
graphify extract . --code-only --max-workers 4 --no-cluster
graphify cluster-only . --no-label --no-viz
graphify export html
```

## Consultar

```powershell
graphify query 'ActionIcon' --budget 1500
graphify god-nodes --top 10
```

A consulta de teste `ActionIcon` encontrou 1.344 nós na travessia; a saída foi truncada deliberadamente pelo orçamento de 500 tokens. Refinar perguntas por símbolo ou contexto para evitar leituras amplas.

O benchmark interno estimou redução de 275,3 vezes contra leitura ingênua do corpus; é uma estimativa da ferramenta, não economia real medida desta sessão.

## Persistência e reversão

As preferências globais estão em `C:/Users/ferna/.codex/AGENTS.md`. Caveman usa `defaultMode=caveman`; Ponytail usa `defaultMode=full` nos arquivos próprios em `%APPDATA%`. Nenhum hook Git ou processo permanente foi instalado.

`.graphifyignore` define o recorte e `AGENTS.md` aponta para o índice. `graphify-out/` foi criado no working tree e pode aparecer no Git; não foi incluído em commit nem alterado o `.gitignore`. Para reverter, remover somente as saídas criadas e o bloco “Grafo do projeto”, preservando alterações de outras tarefas. As preferências globais podem ser desativadas ou removidas independentemente do projeto.

## Manutenção — prévia automática F32

Índice de código atualizado localmente após alteração de ShareKitScreen, ColorPicker e testes. JSON bruto preserva relações sobrepostas: 6641 nós e 22669 relações. Comunidades antigas reaplicadas somente aos IDs já analisados; não houve nova análise de comunidades/HTML nem envio externo. O comando legado update reextraiu o corpus de código; próximas atualizações devem seguir o fluxo incremental de extract descrito acima. Custo de LLM/API: zero. O relatório analítico inicial continua histórico.

## Manutenção — CI/CD

Atualização incremental local em 20/10/2026, com `graphify extract . --code-only --max-workers 4 --no-cluster`: na última passagem, 17 arquivos reprocessados e 1.252 reutilizados; 6.636 nós e 22.665 relações. Inclui os testes consultados/corrigidos durante a investigação do CI. Sem extração semântica, LLM ou envio externo. Comunidades existentes preservadas pela ferramenta; relatório/HTML continuam históricos. `.github/` e documentação permanecem fora do índice estrutural conforme `.graphifyignore`.

## Manutenção — métricas agendadas, 21/10/2026

Extração incremental local de código após adicionar scheduledTrafficInput, runScheduledTraffic e o CLI agendado. Última passagem: 29 arquivos alterados reprocessados e 1262 reutilizados; 6721 nós e 22962 relações. A árvore incluía alterações simultâneas de outras tarefas, também capturadas pelo índice. Sem LLM/API ou rotulagem de comunidades; relatório e HTML continuam históricos. Uma extração iniciada por engano no diretório backend foi movida para output/scheduled-metrics/graph-backend-extra, sem substituir o grafo principal.

## Manutenção — lote F24/F30/F35/F39/F26/F36, 21/10/2026

Extração incremental `graphify extract . --code-only --max-workers 4 --no-cluster`: 41 arquivos de código reprocessados e 1320 reutilizados; 7049 nós e 24443 relações. Inclui alterações simultâneas da árvore, sem atribuir sua autoria ao lote. Sem LLM/API/extração semântica; relatórios e HTML antigos continuam históricos. O índice confirmou relações; autorização, constraints e transferência foram verificadas no código e PostgreSQL real. Mudança posterior de assertiva em agency.pg.spec não altera o escopo estrutural; atualizar incrementalmente na próxima retomada.

Passagem final incremental de fechamento: nove arquivos reprocessados, 1352 reutilizados; 7049 nós/24443 relações. Sem análise semântica externa.
