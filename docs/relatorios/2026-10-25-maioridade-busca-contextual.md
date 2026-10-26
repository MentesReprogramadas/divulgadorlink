# Maioridade nas listagens e busca contextual

## Comportamento

Ao abrir uma rede ou um nicho, a API verifica se existem links publicados restritos pelos marcadores de idade do nicho ou da rede, respeitando os filtros atuais. Se houver e a pessoa ainda não tiver respondido, a própria tela oferece a confirmação. Os dados dos links restritos não entram na listagem nem nas sugestões antes do aceite. Após aceitar, a listagem passa a incluí-los sem exigir selecionar o nicho Adulto. Recusar grava a escolha na sessão e mantém os resultados livres disponíveis.

O SQL compartilhado considera os dois marcadores de idade, inclusive quando um nicho livre contém links de uma rede restrita. Esses links também ficam fora dos dados estruturados indexáveis. A detecção da presença de conteúdo restrito consulta apenas existência, sem carregar imagens ou entregar seus dados. A consulta respeita tenant, publicação, suspensão e filtros de cidade, idioma e formato.

Ao responder numa URL paginada, o navegador descarta o cursor antigo e preserva os demais filtros. O servidor continua recusando cursores que pertençam a outro contexto de idade.

## Busca

Sinônimos locais normalizados encontram facetas públicas: por exemplo, `putaria`, `corno`, `pornô`, `+18` e `18+` correspondem ao contexto Adulto; `programação`, `cursos`, `games` e `ofertas` encontram os respectivos temas. A comparação usa palavras completas e normaliza acentos, incluindo caracteres Unicode decompostos.

Consultas diretas de tema/rede ou contextos explícitos usam correspondência textual de facetas sem chamar embeddings. Isso permite encontrar links que ainda não têm vetor. Tema com rede combina os dois filtros, como em `corno telegram`. O limiar e os pesos de relevância configurados continuam valendo; patrocínio continua dependendo da superfície de busca e da elegibilidade existente.

Frases livres mantêm a busca semântica existente. Os resultados agora também oferecem categorias e redes públicas relacionadas aos links elegíveis. Categorias privadas não viram destinos de navegação. A resposta mantém o campo legado `target` e acrescenta `facets`; o autocomplete mantém compatibilidade com `facet`. Busca e sugestões usam `Cache-Control: no-store`, pois a resposta depende da confirmação de idade.

O frontend reúne categorias/redes e links, indica `+18`, preserva filtros nos atalhos e mantém navegação pelo teclado. O diálogo aguarda a confirmação, permite nova tentativa após falha de conexão e trata Escape como recusa. Não há dependência, migração ou provedor novo nesta entrega.

## Validação executada

- Backend: lint, tipos, build e **695 testes unitários** aprovados na cópia isolada. O último ajuste de cabeçalho de cache foi verificado em **74 testes focais**, com lint/tipos/build repetidos.
- PostgreSQL/Redis descartáveis: **466 testes**, em **56 arquivos**, aprovados.
- Frontend: lint, tipos de aplicação/E2E e **772 testes unitários** aprovados após o ajuste de paginação.
- **20 E2E** aprovados em desktop e celular, com SQL real: rede mista, recusa persistida, nicho livre com rede restrita, filtros, troca de idade com cursor, três termos adultos, contexto comum, combinação de tema/rede e regressão de busca parcial sem vetor. A imagem neutra só responde HTTP 200 após o aceite; antes dele responde 404.
- Build Next de produção executado pelo setup E2E. As capturas desktop/mobile e com zoom de 125% foram inspecionadas; o diálogo e o aceite também foram percorridos com Playwright MCP em página isolada. O teste verifica foco inicial, uso do teclado e ausência de overflow.
- Graphify atualizado incrementalmente por extração local de código: **7907 nós / 28237 relações**, sem LLM/API ou clustering. Inclui alterações concorrentes da árvore; CSS, capturas e arquivos sem símbolos não são comprovados pelo grafo.

Evidências locais em `output/age-context-*.log` e `output/age-context-validation-20261025/`. A cópia partiu do commit `b8f7270e`, sobrepondo somente os arquivos desta entrega; esquema, migrações e código concorrente de pesquisa de produtos ficaram fora dessa validação local e do commit desta tarefa.

A primeira rodada ampla falhou em duas provas de Pix porque seus processos auxiliares usaram as configurações locais padrão; a repetição com `PIX_PROOF_DATABASE_URL`/`PIX_PROOF_REDIS_URL` apontando para os recursos descartáveis passou nos 695 casos. No E2E, a primeira preparação omitiu as configurações de busca do tenant sintético; depois, duas expectativas selecionavam tanto a categoria quanto sua legenda no link. A preparação e o seletor foram corrigidos, e a rodada final passou integralmente. Nenhum teste foi removido, timeout aumentado ou tolerância visual relaxada.

## Limites e publicação

- Os testes usam imagens neutras e embeddings controlados; não houve consulta paga ao provedor de IA nem inspeção de material adulto real. A qualidade semântica das frases livres continua dependendo do provedor e dos vetores existentes.
- Os sinônimos locais cobrem os temas cadastrados previstos; não representam compreensão perfeita de qualquer frase. O bloqueio desta jornada usa os marcadores de idade cadastrados no nicho/rede e a confirmação já existente.
- O CI deve validar o SHA integrado antes da publicação. Caso permaneça a ausência de credenciais de CD no GitHub, publicar o mesmo SHA pelo conector Coolify, na ordem API, worker e web, conferindo commit e saúde. O worker só oferece estado de processo, sem readiness de consumo de filas.
- Reversão: reimplantar o último SHA validado nas três aplicações ou reverter o commit específico desta entrega e passar pelos checks. Não há rollback de banco nesta mudança. A escolha de idade já gravada no navegador permanece até o fim da sessão ou a limpeza dos cookies.
