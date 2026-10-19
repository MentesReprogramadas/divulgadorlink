# Local e idioma opcionais e filtros compactos — 18/10/2026

Solicitação: trazer os campos para assunto/descrição, retirá-los do modal, identificar a opcionalidade sem texto explicativo, mostrar os valores nos cards e simplificar a filtragem na home.

## Resultado

- Criar link: cidade, idioma e participação ficam na etapa **Assunto e descrição**. Cada rótulo tem `(Opcional)`, sem dicas explicativas. Os campos continuam vazios por padrão, e o rascunho persiste no armazenamento local.
- Editar: o atalho abre a rota existente `/painel/links/[id]/editar`. Descrição e campos opcionais estão juntos, sem aba separada e sem modal. Uma ação **Salvar alterações** coordena os contratos existentes; texto continua sujeito à análise vigente. Texto inalterado não cria outra proposta. Falha na leitura dos dados opcionais não impede editar o texto; falha ao gravar dados alterados preserva o preenchimento e impede o envio subsequente do texto até a tentativa seguinte.
- Os contratos de texto e metadados continuam independentes: a UI informa os resultados de cada gravação. Não foi introduzida promessa de transação atômica entre os dois endpoints.
- Cards do painel, home, páginas de rede/assunto e busca mostram cidade/UF, idioma por extenso e participação somente quando informados. O painel já tinha um DTO de discovery, mas o adaptador Prisma descartava esses campos: a projeção foi corrigida e coberta por teste PostgreSQL.
- Home: removido **Aplicar filtros** e o painel com borda/preenchimento de filtros. Desktop: três campos na mesma linha. Mobile de 390 px: cidade acima, idioma e participação lado a lado. Em largura estreita ou texto ampliado, os campos podem refluír para uma coluna para preservar a leitura.
- Selects aplicam na escolha. A consulta de cidades espera 350 ms de pausa; um nome completo e inequívoco aplica automaticamente. Nome parcial, desconhecido ou ambíguo mantém a lista de escolha. Não há inferência por IP, idioma do navegador ou localização do aparelho. No editor, a cidade continua exigindo escolha explícita.
- Limpar filtros cancela consultas pendentes, limpa o texto de cidade e devolve foco ao campo. Atualizações preservam o termo de busca e os outros parâmetros da rota, removendo o cursor. A home mantém a instância dos controles durante a atualização, para preservar o foco.

## Decisões de apresentação

A direção usa os campos, ícones, navy, tipografia e tokens existentes, conforme [Design System](../../design-system.md). A referência principal desta fatia foi a interface real do produto, inspecionada nos testes e capturas: reduzir o contêiner e os botões de confirmação deixa os links mais próximos dos filtros. A composição proposta pelo usuário foi confirmada em 390 px. Não foram importados componentes, bibliotecas, estilos de outra marca ou novos desenhos de ícone.

## Validação

Ambiente isolado em `output/link-local-inline/validation`, dependências locais existentes, dados sintéticos e Chromium. Portas 7400/7733/8499/8843 e PostgreSQL/Redis 9833/10780. PostgreSQL adicional descartável na porta 9834 para testes HTTP. Nenhum serviço do usuário foi encerrado.

- Frontend: `npm run lint`, `npm run typecheck` e 24 testes afetados em 7 arquivos.
- Backend: lint, typecheck, build e 60 testes de catálogo, busca, ordenação e metadados em 4 arquivos.
- HTTP/PostgreSQL: 7 testes de descoberta, isolamento, versões, auditoria, criação e DTO de proprietário.
- E2E: `playwright.discovery.config.ts`, desktop 1280×720 e mobile 390×844. F27-E02 passou em ambos para criação/edição, rascunho, erro, retry, conflito e cards do proprietário. Na rodada final, F27-E01 e F27-E03 passaram em ambos: aplicação automática, paginação, recarga, rede/assunto, vazio/limpar, isolamento, erro de cidade, teclado, foco, axe e reflow em 320 px com texto a 200%.
- Confirmação adicional: F27-E01 desktop passou novamente após incluir a projeção de discovery nos cards de rede/assunto, com asserções de cidade e idioma nessas páginas.
- Build de produção Next executado pelo setup E2E; build adicional final em cópia isolada para incluir a recuperação da edição de texto quando os dados opcionais não carregam.

Durante a validação foram corrigidos o descarte de discovery no adaptador do painel, o desalinhamento de 8 px entre input e selects e a remontagem da home por query que perdia o foco. Os seletores E2E passaram a usar papéis de combobox para distinguir controles de esqueletos durante streaming; nenhuma exclusão de axe ou tolerância de imagem foi acrescentada. Uma cópia inicial de validação capturou uma edição paralela incompleta de promoções; o arquivo complementar foi incluído na cópia, sem modificar esse trabalho.

Limites: emulação mobile, sem aparelho físico; axe e revisão visual não certificam acessibilidade integral. Não houve deploy nem alteração de cobrança, autorização, quotas, moderação, analytics ou regras de visibilidade. Os metadados públicos são adicionados apenas aos resultados já autorizados pelos filtros existentes. Não há alteração de schema, dependências ou lockfiles. Capturas de outras jornadas não foram atualizadas.

## Capturas

[Galeria](preview.html). Capturas reais com dados sintéticos; sem atualização automática de baseline.

- [Home mobile](home-mobile.png) e [desktop](home-desktop.png).
- [Criar mobile](criar-mobile.png) e [desktop](criar-desktop.png).
- [Editar mobile](editar-mobile.png) e [desktop](editar-desktop.png).
- [Card mobile](card-mobile.png) e [desktop](card-desktop.png).
- [Reflow em 320 px/200%](zoom-mobile.png).

## Arquivos e reversão

Principais áreas: `app/painel/links/novo`, `components/domain/panel-links`, `features/catalog/discovery`, `components/domain/link-meta`/`link-row`, `app/busca` e o boundary Suspense de `app/page`. Backend: descoberta, projeção de catálogo/busca e adaptador `toLinkRecord`. Testes estão no patch incremental.

O patch [changes.patch](../../../../output/link-local-inline/changes.patch) foi gerado contra cópias dos arquivos **anteriores a esta tarefa**, preservando as alterações locais de Minha página e das demais tarefas. Os arquivos anteriores estão em `output/link-local-inline/before`. `git apply -R --check output/link-local-inline/changes.patch` verifica a reversão, sem aplicá-la. Para reverter, revisar e aplicar o patch ao contrário; não usar reset global. A galeria é documentação local e pode ser mantida separadamente.
