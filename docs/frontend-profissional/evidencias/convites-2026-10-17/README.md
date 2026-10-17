# Convites permanentes — 17/10/2026

Pedido: reduzir informações empilhadas em `/painel/convites`, seguir Favoritos/Coleções e destacar alertas.

## Diagnóstico e direção

O código anterior compunha seleção de convites, compartilhamento, edição, filtros, versões e desativação na mesma sequência vertical. A lista era um conjunto de botões alinhados à direita, com título e estado concatenados. Erros e avisos não tinham tratamento visual próprio.

As referências são as telas reais do próprio produto solicitadas pelo usuário: `CollectionGrid` fundamenta cards e abertura de um recurso; `CollectionHeader` fundamenta Voltar, título e recuperação de foco; `FavoritesScreen` e `Tabs` fundamentam navegação segmentada. Foram reutilizadas as primitivas existentes, sem incorporar biblioteca ou identidade externa. A auditoria do estado anterior foi feita pelo código e por captura existente do estado vazio; não há captura anterior equivalente com um convite selecionado.

## Implementação

- Lista em cards com título, estado e ação de abrir, sem expor os detalhes de todos os convites.
- Ao abrir, a lista dá lugar ao recurso selecionado. Voltar recupera o foco no card.
- Aba Endereço: compartilhar, copiar, testar e editar o destino. Aba Histórico e acessos: período, versões e contagens.
- Regras de retenção/contagem e detalhamento diário ficam em elementos expansíveis.
- Sucesso em verde, erro em vermelho e atenção em âmbar, com texto e borda. A desativação fica em Gerenciar endereço, com confirmação explícita e ação de cancelar.
- Skeleton acompanha o grid. CSS local, tipografia, espaçamento, Badge e ícones seguem os componentes existentes.

Requisições, idempotência, validação automática, destino anterior, autorização, tenant, restrição etária e semântica das métricas foram preservados. Não houve alteração de backend, dependências ou contratos comerciais nesta etapa.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run lint` no frontend | Passou |
| `npm run typecheck` no frontend | Passou, incluindo E2E |
| `npm test -- src/features/redirects src/components/layout/navigation-icons.test.tsx` | 7 testes passaram |
| Build de produção Next 15.5.26, executado pelo setup E2E (`next build`, `TEMLINK_E2E_BUILD=1`) | Passou; artefatos isolados em `.next-e2e` |
| `npx playwright test e2e/redirects.spec.ts --project=features --project=features-mobile --output=../output/invites-layout` | 11 testes passaram na execução final |
| axe nas abas Endereço e Histórico, desktop e mobile | Nenhuma violação detectada nesses estados |
| Teclado | Abrir por Enter, mudar abas pelas setas, foco no título, retorno ao card e foco nos retornos de sucesso passaram |
| Reflow | 320 px com fonte raiz em 200%, sem overflow horizontal da página nos estados exercitados |
| Contratos | Cópia, troca A/B, validação pendente, falhas do provedor/conteúdo, offline, conflito entre abas, isolamento e idade passaram |
| Desativação | Expandir, solicitar, cancelar, confirmar e estado desativado passaram |

Ambiente Windows/Chromium local, dados sintéticos e containers exclusivos `divulgador-e2e-*-invites-layout-20261017`. Offset final 3100: web 6100, API 6433, stub 7199, fixture HTTPS 7543, PostgreSQL 8533 e Redis 9480. Serviços existentes preservados. A tentativa inicial com offset 3000 foi interrompida porque Next bloqueia a porta 6000; corrigida pela configuração do ambiente, sem alterar o produto. O teardown da execução final encerrou os recursos próprios.

As capturas finais foram inspecionadas visualmente. A revisão identificou e corrigiu alinhamento de campo/botão, quebra desnecessária do botão de atualizar no celular e capturas durante animações. Capturas principais: desktop 1440×900 e mobile 390×844, fontes carregadas e movimento reduzido.

## Capturas

| Estado | Desktop | Mobile |
| --- | --- | --- |
| Lista | [Cards](invites-grid-desktop.png) | [Cards](invites-grid-mobile.png) |
| Endereço | [Endereço](invite-address-desktop.png) | [Endereço](invite-address-mobile.png) |
| Histórico | [Histórico](invite-history-desktop.png) | [Histórico](invite-history-mobile.png) |
| Desativado | [Aviso](invite-disabled-desktop.png) | [Aviso](invite-disabled-mobile.png) |

Limites: emulação mobile não é aparelho físico; axe não certifica acessibilidade completa. Capturas são evidência de inspeção, sem atualização de baselines: UUIDs e horários gerados pelo backend variam entre execuções. Não houve medição comparativa de desempenho nem validação em produção. O build mantém avisos de configuração já existentes no projeto.

## Arquivos e reversão

Código desta etapa: `frontend/src/features/redirects/redirect-screen.tsx`, `components/redirect-grid.tsx`, `components/redirect-history.tsx`, `components/redirect-skeleton.tsx` e `components/redirects.module.css`. Testes: `redirect-screen.test.tsx` e `frontend/e2e/redirects.spec.ts`.

O workspace já continha alterações locais nesses arquivos, incluindo a edição em modal e o skeleton. Para reverter esta etapa, remover somente o novo grid e os trechos desta reorganização, restaurando a composição anterior, os estilos e as adaptações dos testes. Não restaurar arquivos inteiros a partir de HEAD: isso descartaria trabalho anterior do usuário. As evidências desta pasta podem ser removidas independentemente da aplicação.
