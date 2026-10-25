# Extensão da auditoria — composição de rotas

23/10/2026. Fonte atual, sem nova inspeção de navegador. A preview Ondas continua sendo a autoridade visual; as alterações abaixo não equivalem a paridade aprovada em runtime.

O [CSV app por arquivo](ondas-component-audit-app.csv) lista todos os 152 TSX de apresentação em `app`, excluindo testes. Destes, 115 estão no escopo desta revisão estática, 23 pertencem ao agente de administração/publicação, 7 à raiz para catálogo/busca/gates, 6 são referências experimentais e 1 é o layout compartilhado. Cada linha registra renderer, material fornecido, recipiente local, teste observado e limite. Os caminhos delegados estão identificados, não marcados como inspecionados por este agente.

O grafo de 7.508 nós foi consultado antes da extensão e a composição confirmada na fonte. Não foi reconstruído nem usado como evidência de que as novas alterações já estejam indexadas.

## Ajustes de composição

| Caminho | Causa encontrada | Alteração |
| --- | --- | --- |
| Cadastro, esqueci senha e recuperação | `auth-form` sem Lens, apesar dos controles compartilhados novos | `public-account.form` e Lens16 no recipiente; campos, mensagens, consentimento e requisições preservados |
| Verificação de e-mail | Formulários de código e troca de e-mail sem lente | Mesmo host de autenticação nos dois estados; fluxo, cooldown e redirecionamento preservados |
| Conta | Dois formulários sem superfície e exclusão com `auth-form` sólido | Três recipientes com host e Lens16; nenhuma mudança em sessão ou ações |
| Contestação | Formulário local ainda sem camada óptica | Host compartilhado e Lens; envio e recuperação de erro preservados |
| Comprovação de domínio | `ownership.card` já transparente, mas rota não montava Lens | Lente no card; SSR, dados e ressalva sobre a comprovação preservados |
| Loading de coleção | Header usava o host migrado sem montar lente | Mesmo material do header real da coleção |
| Destaque | Escolhas e etapas nativas não passavam por card de feature | CSS Module local da funcionalidade e Lens em duração/plano/método/etapa; preservados preços, elegibilidade, idempotência, polling, expiração, confirmação e Stripe |

O módulo `features/promotions/components/checkout-surfaces.module.css` atende o checkout e seus skeletons sem modificar CSS global. A placa do QR e o conteúdo de pagamento externo continuam próprios para leitura. `PlanCardsSkeleton`, `AccountSkeleton` e `VerificationSkeleton` acompanham os recipientes reais. O skeleton de código usa a mesma grade de seis colunas, sem montar inputs com foco automático.

O CSS `components/forms/public-account.module.css` foi ajustado pelo agente das primitivas; esta extensão só consome sua classe `form`. `LoginForm` também permanece sob responsabilidade desse agente. Busca/home/detalhe, age gates e administração não foram editados aqui.

Páginas públicas de perfis, campanhas e mídia kit preservam a paleta configurada pelo publicador. Termos/privacidade são artigos tipográficos sem recipiente opaco próprio, portanto não receberam uma lente por parágrafo. Layouts de metadata, reexports, redirecionamentos e imagem Open Graph foram classificados separadamente no CSV, sem mudanças comerciais ou de crawler.

## Evidência

- 9 arquivos app alterados, mais 3 skeletons de features e 1 CSS Module local.
- ESLint dos 12 TSX alterados: saída 0.
- 6 arquivos de unidade: 13 testes passaram, incluindo cadastro consentido, verificação, código, indisponibilidade das contagens do painel, erro e carregamento. Isso não certifica os fluxos sem teste direto, como recuperação de senha e checkout.
- Parse de todos os 152 TSX app: nenhum erro sintático. Parse do CSS Module novo: nenhum erro sintático. Esses parses não substituem typecheck/build.
- Resultados e índices: `output/ondas-final-visual/app-glass-unit-results.json`, `app-glass-changes.json`, `app-inventory-summary.json`.

Nenhum servidor, browser, build ou E2E foi executado nesta extensão. Inspeção de foco, contraste, mobile, reduced-motion/fallback, pagamento e consumo de renderização ficam pendentes na consolidação da raiz. Capturas antigas não validam a fonte alterada agora.

Para reverter só esta extensão, remover as montagens/imports e classes registradas em `app-glass-changes.json`, mais as três alterações decorativas de skeleton e o módulo de checkout. Não reverter arquivos completos que contenham trabalho anterior ou de outros agentes.
