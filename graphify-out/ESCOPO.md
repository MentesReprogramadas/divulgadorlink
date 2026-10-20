# Graphify — Tem Link Aqui

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
