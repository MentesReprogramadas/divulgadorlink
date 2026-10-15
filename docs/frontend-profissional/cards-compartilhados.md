# Cards do catálogo e navegação de retorno

## Alvo adotado

Consolidar o padrão da home solicitado pelo usuário, não criar outra direção visual. Home, busca, nichos e redes usam `LinkRow` e `CatalogGrid`. O card tem uma única implementação de marcação, espaçamento, borda, superfície, tipografia e estados de interação; páginas compõem seções e dados, sem sobrescrever sua aparência.

Patrocinados mantêm superfície levemente turquesa, borda destacada e identificação pequena com diamante. Orgânicos usam superfície branca. A diferenciação comunica publicidade sem transformar a marcação em um CTA. Grid responsivo usa largura mínima de 300px quando disponível, evitando as quatro colunas estreitas das antigas facetas.

Títulos permanecem em uma linha com reticências. Descrições ficam em até duas linhas com Ver mais inline, que expande somente o texto. Badges são informativos: o clique na sua área segue o link do card; no detalhe não navegam. URLs com surfaceToken, identificação do placement, impressões, proteção de idade, metadados e JSON-LD continuam preservados.

Breadcrumbs visíveis de facetas e detalhes foram substituídos por `BackButton`, também presente na busca. O botão usa o histórico quando há uma página anterior do mesmo site; no acesso direto ou de origem externa abre a home. A remoção visual não elimina dados estruturados enviados pelo backend para SEO.

## Validação em 15/10/2026

- Testes de LinkRow, FacetCatalog, CardDescription e BackButton: 16 aprovados; BackButton cobre histórico interno e fallback direto/externo/sem histórico. Mais quatro testes focados da home aprovados, incluindo a regressão que exige o mesmo componente para ambos os placements; somente o teste de status preexistente foi excluído dessa execução focada.
- Typecheck e lint dos arquivos novos/migrados, exceto a limitação local da home descrita abaixo, aprovados.
- Build de produção aprovado em cópia isolada com `--no-lint`, sem interferir no servidor de desenvolvimento.
- Chromium real, desktop 1440px e mobile emulado 390px: comparação dos estilos computados entre as quatro superfícies; truncamento, badges, URLs rastreadas, retorno pelo histórico, fallback direto e ausência de overflow. Axe A/AA nas oito combinações sem violações detectadas.
- Paginação da home com falha simulada e repetição: links anteriores, anúncios e rolagem preservados; expansão/recolhimento da descrição e foco verificados separadamente em 1440px, 768px e 390px.

A API local respondeu 500 temporariamente enquanto o processo do backend mudou durante a execução. Nesse intervalo, a matriz completa foi executada contra o build real com API de dados determinísticos isolada nas portas 3042/4342, sem banco nem serviços externos. Após a recuperação da API, a matriz completa foi repetida com sucesso contra localhost:3000/3333 em desktop e mobile: home, nichos, redes e busca por planilha; navegação do card para o detalhe e retorno; fallback de acesso direto; paginação com erro/retry. A regressão de paginação adicional confirmou 15 → 39 → 63 orgânicos, nove anúncios preservados, sem recarga nem mudança da rolagem. Expansão de descrição foi repetida no ambiente integrado em 1440px, 768px e 390px. Os servidores temporários foram encerrados, preservando os processos locais do usuário. Não foram alterados backend, banco ou ambiente para contornar a falha.

Limitações observadas na etapa original: lint global acusava `notice` sem uso porque o anúncio de status da home foi comentado localmente. A suíte geral anterior ao último teste adicionado teve 134 testes aprovados e quatro falhas: três esperavam o rótulo Nome alterado localmente para Titulo, e uma esperava o status comentado.

Na correção do CI solicitada em 15/10, o status foi recuperado apenas para leitores de tela, sem retornar a mensagem ao layout visual; testes unitários e E2E de envio foram alinhados ao rótulo Titulo, mantendo Nome no cadastro de conta. Lint, typecheck, os 152 testes do frontend e build completo com lint habilitado passaram. A paginação passou no build isolado conectado ao backend local em desktop e mobile. A suíte E2E completa depende da nova execução remota, pois os servidores locais do usuário ocupam as portas do setup.

O workflow passou a usar executores hospedados pelo GitHub em todos os jobs, sem depender do runner próprio. Concurrency cancela execuções antigas da mesma referência, e cada job tem limite de duração. Lint, testes, auditoria e build permanecem obrigatórios; não foi adicionado deploy pelo CI nem alterado o servidor Coolify. O audit do frontend passou no limiar high, com um alerta moderate do Next.js registrado e sem atualização de dependências nesta correção.

## Manutenção

### Indicação de clique aprovada

O rodapé de `LinkRow` agora mostra “Ver link” com seta à direita em todas as superfícies e nos dois placements. A indicação permanece visível no mobile; hover e foco reforçam a borda e sublinham o texto. O rodapé fica alinhado à base dos cards com flexbox, sem posicionamento absoluto sobre a descrição.

O indicador é visual (`aria-hidden` e sem eventos próprios): há somente um link navegável por card, mantendo o nome acessível do título, a área inteira clicável e a URL rastreada. “Ver mais” continua sendo a ação independente de expandir a descrição, sem navegar.

Validação desta adição: 14 testes de componentes aprovados, lint dos arquivos alterados e typecheck aprovados. Chromium integrado ao localhost, em 1440px e 390px, verificou as quatro telas, indicador visível, ausência de links duplicados, hover/foco, clique na área de “Ver link” e axe A/AA sem violações detectadas. Expansão/recolhimento em duas linhas também foi verificado em 1440px, 768px e 390px. O build usa a cópia isolada e mantém a exceção de lint preexistente documentada acima.

Alterar a aparência do card em `components/domain/link-row.module.css`, o grid em `components/domain/catalog-grid.module.css`, e o retorno em `components/ui/back-button`. Não recriar markup de patrocinados na home nem regras de card em estilos de rotas. A reversão desta fatia não deve reverter outras mudanças locais.
