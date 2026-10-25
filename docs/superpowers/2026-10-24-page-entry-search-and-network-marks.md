# Entrada nas páginas, busca e marcas das redes

## Escopo e implementação

- Restaurar Kwai e Privacy nos cards sem colorir os ícones: substituir imagens opacas embutidas nos SVGs por contornos vetoriais adequados à máscara existente. Procedência e limites de marca registrados em `frontend/public/networks/sources.json`.
- Usar skeletons acessíveis no suspense das rotas, incluindo composição específica de detalhe. Remover a mensagem visual genérica; manter a fronteira Suspense necessária à hidratação do Next instalado.
- Resolver o fundo publicado no servidor pelo mesmo carregador com restrições de idade e tenant. Ocultar o fallback genérico dentro da estrutura pessoal. A prévia autenticada obtém somente aparência pelo endpoint protegido, mantendo autorização e seleção de workspace no backend. Sem sessão utilizável, usar o fundo pessoal neutro enquanto o fluxo existente recupera a sessão; não revelar rascunhos restritos.
- Reutilizar material e composição da busca da home em `/paginas`, com sugestões vindas da resposta real do diretório. Preservar categoria e termo em “Ver todas”, cancelar respostas antigas, suportar teclado, composição de texto e navegação nativa para o tema pessoal chegar no primeiro HTML.

## Verificação

- Vitest: 203 arquivos, 752 testes aprovados, incluindo marcas, busca, concorrência, SSR, hidratação, skeletons e acesso ao tema da prévia.
- Índice Graphify atualizado incrementalmente, apenas extração local de código: 7757 nós, 27792 relações. CSS e imagens dependem das inspeções próprias; o índice inclui alterações preexistentes da árvore compartilhada.
- Capturas dos ícones renderizados no servidor de demonstração confirmam máscaras legíveis de Kwai e Privacy.

- Lint, tipos da aplicação/E2E e build de produção aprovados. O build mantém avisos já existentes sobre alinhamento CSS e configuração ESLint; não impedem a compilação.
- Playwright Test isolado: seis casos aprovados, desktop 1440×900 e mobile 390×844. Busca por teclado, navegação nativa, termo preservado em todos os resultados e skeleton antes de uma resposta lenta. Amostragem dos primeiros quadros da página publicada: fundo correto, sem cabeçalho ou fallback da plataforma.
- Seis capturas finais abertas e inspecionadas: sugestões, página pessoal e skeleton do detalhe nos dois tamanhos. Evidências em `output/refinements-visual/`; execução isolada em 3020/4550, com encerramento dos próprios processos. Servidor de demonstração 3000 preservado.

## Limites e reversão

Sem dependências novas, mudanças comerciais, mutações de dados ou envio de código externo. A validação visual com páginas preenchidas usa API local determinística, pois o diretório da demonstração não contém páginas públicas disponíveis. Isso não certifica contas reais ou todas as configurações de temas. Quando uma sessão expira, o tema privado só pode ser conhecido após recuperação autorizada; o intervalo usa fundo pessoal neutro.

Reverter apenas os trechos e novos arquivos deste escopo, preservando o restante da árvore já alterada. Não usar restauração ampla do repositório.
