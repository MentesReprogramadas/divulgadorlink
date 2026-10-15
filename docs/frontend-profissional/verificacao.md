# Evidências da etapa de preparação

Data: 15/10/2026. Esta verificação cobre configuração e instruções, não uma nova versão da UI.

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| Codex mcp get context7/shadcn/chrome_devtools/twentyfirst --json | Quatro entradas reconhecidas; três ativas e 21st desativada | Parser e resolução da configuração do projeto; não implica recarga das ferramentas na conversa atual. |
| Context7: initialize, tools/list, resolve-library-id | Sucesso; Next.js retornado; versão do servidor 4.4.1 | Conectividade e uma consulta real sem chave; não validou todos os métodos nem versão exata 15.5.26. |
| shadcn 4.21.5: initialize, tools/list, search_items_in_registries | Sucesso; busca por button retornou 33 itens | Pesquisa real no registry padrão, sem components.json e sem instalar componentes. |
| Chrome DevTools 1.11.0: initialize, tools/list, list_pages | Sucesso com Chromium local e flags da configuração final | Servidor e browser abrem; a aplicação não foi redesenhada/validada neste teste. |
| Credenciais | API_KEY_21ST e CONTEXT7_API_KEY ausentes no ambiente consultado | Somente presença/ausência verificada; nenhum segredo lido ou gravado. |
| Configuração TOML | Parse válido | Sintaxe e entradas esperadas. |
| Cinco Skills temlink-* | Validador oficial quick_validate.py passou nas cinco | Nome/frontmatter/estrutura; não equivale a avaliação comportamental de outro agente. |
| Links Markdown locais da proposta | Caminhos encontrados | Integridade dos links relativos entre documentos. |
| Diff de frontend, backend e manifests | Nenhuma alteração nesta etapa | Código de aplicação, dependências e contratos preservados. output/ preexistente preservado. |

Na etapa anterior, 103 testes do frontend, lint e checagem de tipos passaram. Esses resultados são históricos, não uma reexecução do código atual nesta etapa. Build, E2E e regressão visual do piloto ainda não foram executados; não há UI nova para aprovar visualmente agora.

Amostras de MCP foram realizadas por cliente de teste do SDK oficial, fora das dependências da aplicação. Os executáveis npx permanecem no cache de ferramentas, não no package.json do produto. As cinco Skills são descobertas no projeto quando uma sessão adequada as carregar.

## Próximo passo autorizado somente após aprovação

Executar a fase 1 descrita em piloto-e-qualidade.md: baseline real, referências visuais, direção concreta, implementação isolada de /divulgar e validação funcional/visual em desktop e mobile. A divergência de promessa de análise humana continua registrada e não será corrigida como efeito lateral do piloto.
