# Ondas — cards privados, autenticação e consentimento

Data: 2026-10-23. Lote adicional delegado após a revisão das primitivas. Fonte congelada para a validação integrada pela raiz.

## Entrega

- Cards de links privados, pedidos e métricas do painel montam a LiquidLens compartilhada; fundos locais que a encobriam foram removidos. Valores, estados, permissões e destinos permanecem nos mesmos contratos.
- “Mais opções” mantém `details/summary`: o acionador e o painel têm vidro, com viewport rolável interna. Atalhos e skeletons correspondentes receberam a mesma superfície.
- LoginForm usa a classe exportada `form` de `components/forms/public-account.module.css` e Lens16. O agente da revisão das telas aplicou essa composição aos demais formulários de autenticação e seus skeletons; não houve mudança de sessão neste lote.
- CodeBoxes reutiliza Input em uma grade fluida de seis campos, mantendo refs, rótulos individuais, preenchimento automático, foco, setas, exclusão, colagem e `disabled`.
- Consent tem lente fixa e conteúdo rolável separado. A indisponibilidade de ResizeObserver deixa de impedir a escolha de cookies. Consentimento, finalidades independentes e disparos após aceite permanecem nos mesmos handlers.
- Operadores e entregas da integração WhatsApp usam o mesmo material; o tipo `REVIEW_MEDIA` aparece como “Revisão de anexo”. A confirmação de reenvio incerto continua obrigatória.

Fonte do material: `components/ui/liquid-lens.tsx`, `liquid-optics.ts` e `features/feature-glass.module.css`, já compartilhados com a preview aprovada. Sem novo algoritmo, infraestrutura ou dependência.

### Último fechamento das métricas

A captura real `output/ondas-demo/parity-current/links-filters-1440.png` revelou fundo navy sólido nos três indicadores de LinkMetrics. Os estados registrado e de contagem agora montam Lens12; a classe local `linkMetric` compõe a superfície compartilhada e substitui apenas o fundo de `.metric`. RecordsSkeleton usa a mesma composição. O único outro uso global ativo, no carregamento de retenção de InsightSkeleton, recebeu esse material após extensão explícita da raiz. Sem alteração de valores, rótulos, cores do texto ou destinos.

Validação desse delta: quatro arquivos/sete testes aprovados (PanelLinks, Panel, RetentionPanel e Skeleton), ESLint dos quatro TSX e sintaxe PostCSS do módulo aprovados. O novo caso de LinkList exercita contagem pendente, indisponível, números localizados e destino de resultado com o componente real. A leitura da captura precedeu a mudança; inspeção da renderização final permanece coordenada pela raiz.

## Verificação executada

- CodeBoxes: os quatro testes passaram antes e depois da migração, incluindo os novos casos de teclado, colagem, foco e campos desativados.
- Consent sem ResizeObserver: falha observada (`ResizeObserver is not a constructor`), correção aplicada e caso aprovado.
- Vitest final focal: seis arquivos / vinte testes aprovados, um worker — CodeBoxes, Consent, Panel, PanelLinks, EvolutionIntegration e LoginForm.
- ESLint: doze arquivos TSX afetados aprovados.
- PostCSS: seis folhas CSS do lote analisadas sem erro de sintaxe.

## Inventário e limites

[ondas-domain-forms-file-audit.csv](ondas-domain-forms-file-audit.csv) registra os 26 TSX de produção de domain/forms, um a um. [ondas-ui-layout-file-audit.csv](ondas-ui-layout-file-audit.csv) foi atualizado para registrar os atalhos e skeletons deste lote. Os hashes representam a fonte local na gravação; outros agentes podem avançar depois dela.

Leitura comunicada à raiz: `facet-filters.tsx` ainda instanciava ResizeObserver sem guard; `home-page.tsx` é um helper de card simples cujo uso precisa ser confirmado antes de migrar. Home, busca, catálogo, LinkRow e bloqueio +18 pertencem à raiz e não foram editados neste lote.

Inspeção real de desktop/mobile, contraste sobre as ondas, build, typecheck global e E2E são coordenados pela raiz e não foram executados por este agente. Não declarar aprovação visual a partir dos testes de componente. Reverter somente os trechos deste lote no diff, preservando o trabalho simultâneo dos demais agentes.
