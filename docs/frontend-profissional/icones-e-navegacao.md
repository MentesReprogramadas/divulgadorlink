# Ícones e navegação

## Minha página — simplificação de 17/10/2026

O editor usa `preview` (janela com olho) para Ver prévia e o `RefreshButton` compartilhado (`refresh`) para Atualizar dados, fora do menu de três pontos. Ambos preservam seus significados existentes; o botão de atualização mantém nome acessível e tooltip mesmo sem texto visível. O seletor do botão principal fica em modal e usa rótulo textual, sem atribuir a ele um símbolo já reservado a outro contexto. Evidências em [Minha página: rascunho automático](evidencias/minha-pagina-autosave-2026-10-17/README.md).

## Calendário — 17/10/2026

`ActionIcon name="calendar"` representa exclusivamente abrir o seletor de data. O desenho foi comparado ao catálogo de `action-icon.tsx`: não reutiliza relógio (horário), sino (lembretes) ou destinos de navegação. Repetição nos filtros e no editor de destaque mantém o mesmo significado. Ícone decorativo com `aria-hidden`; botão recebe nome “Abrir calendário” e descrição com a data atual. Testes de navegação/ícones incluídos na suíte completa.

## Exclusividade por contexto — 17/10/2026

Regra solicitada pelo usuário: contextos diferentes nunca usam o mesmo símbolo. A repetição é permitida para o mesmo significado, como o mesmo destino no cabeçalho e na sidebar, editar registros ou salvar formulários. Mudanças de cor, tamanho, nome ou espessura não distinguem conceitos.

Correção solicitada posteriormente pelo usuário: favoritos conserva a estrela nos cards, abas, skeleton e sidebar, preenchida em amarelo quando salvo. A ação de destaque e o badge patrocinado genérico usam megafone, preservando a exclusividade do contexto. A skill e o teste dos pares semânticos refletem essa escolha. A jornada de salvar/coleções passou em desktop/mobile (mais setup); capturas em `output/icon-semantics/favorite-stars/`.

Procedimento mantido em [.agents/skills/temlink-icons/SKILL.md](../../.agents/skills/temlink-icons/SKILL.md), também referenciado pelo AGENTS da raiz.

Os desenhos compartilhados ficam em `frontend/src/components/ui/action-icon.tsx`; os destinos em `frontend/src/components/layout/navigation-icons.ts`. Cabeçalho e menus de painel/admin usam o mesmo mapa. Os subitens conservam sua apresentação textual existente; seus símbolos também têm mapeamento exclusivo, sem depender de CSS para esconder colisões.

| Contextos antes confundidos | Decisão |
| --- | --- |
| Catálogo, painel e gestão | Janela de catálogo, grade de painel e edifício administrativo. |
| Publicação, Links, Criar link, Minha página e Convites | Publicar, corrente, corrente com adição, página e envelope. |
| Pedidos, favoritos, destaque, planos e estornos | Recibo, estrela (favoritos), megafone (destaque), documento de plano e devolução. |
| Lembretes, disponibilidade e retenção | Sino, sinal de disponibilidade e ciclo de retorno. |
| Revisões, moderação, denúncias, correções e integrações | Prancheta, escudo, bandeira, ferramenta e plugue. |
| Conta, configurações, suspensão e acesso de operadores | Pessoa, ajustes, proibição e chave. |
| Copiar, abrir externamente, Pix e cartão | Folhas sobrepostas, saída, losango e cartão. |
| Métricas, tráfego, mais clicados, pagadores e contas | Gráfico, tendência, cursor, pessoa com moeda e pessoas. |
| Cancelar, limpar filtros, rejeitar e desativar | X, filtro com X, documento rejeitado e botão de energia. |
| Expandir, reordenar e carregar mais | Chevron, seta com limite e lista com seta. |
| Impressões, prévia, resultado e contestação | Olho, janela com olho, gráfico e balão de dúvida. |

As abas internas de tráfego e financeiro mantêm seus rótulos e perdem o gráfico decorativo idêntico em todas as opções. Os SVGs locais de redes e nichos foram comparados pelos caminhos e não apresentaram duplicatas exatas. Os novos pictogramas são desenhos locais, sem bibliotecas adicionais.

`navigation-icons.test.tsx` verifica exclusividade dos desenhos entre destinos, grupos renderizados e pares semânticos corrigidos. O E2E W05 verifica painel/admin em desktop/mobile; W01 e W02 cobrem navegação, filtros, teclado, foco, zoom e axe nas jornadas existentes. Essa cobertura não garante automaticamente a semântica de novos ícones fora do mapa: a skill exige revisão dos consumidores e inspeção visual.

Validação: lint, typecheck e 217 testes (68 arquivos) aprovados; 6 E2E finais aprovados (W01, W02 e W05 em 1440×900 e 390×844, incluindo a verificação existente em 320 px/200%). Axe não apontou violações nos estados cobertos. Build de produção executado pelo setup E2E com `TEMLINK_E2E_BUILD=1`, preservando o `.next` do servidor de desenvolvimento. Galeria e capturas finais inspecionadas em `output/icon-semantics/icon-gallery.png` e `output/icon-semantics/final/`. Containers e serviços desta execução foram removidos pelo teardown; os servidores locais existentes permaneceram ativos. Não foi feita validação em aparelho físico ou produção.

O validador Python da skill não executou por ausência de PyYAML nos runtimes disponíveis. Frontmatter, nome, descrição, propriedades permitidas e ausência de placeholders foram validados com o `js-yaml` já instalado no frontend; não foram adicionadas dependências.

Arquivos da fatia: skill e referência no AGENTS; mapa/testes de navegação; `action-icon.tsx`, `site-navigation.tsx`, `workspace-navigation.tsx`; consumidores de conta, favoritos, perfil, convites, links, novo envio, destaque, moderação, denúncias, estornos, gestão e integração Evolution; W05 em `workspace-layout.spec.ts`.

Reversão: retirar somente esta skill/referência e os mapas/testes novos, restaurar o mapa anterior dos dois menus e reverter os nomes de ícones nos consumidores alterados nesta fatia. Há alterações locais anteriores nesses mesmos arquivos; não usar restauração integral ou reset do Git. Nenhum commit ou deploy foi feito.

Atualização de 15/10/2026. Escopo: substituir desenhos aproximados de redes por símbolos de marca, uniformizar o peso visual dos nichos e tornar a navegação do cabeçalho perceptível.

## Assets locais

- 19 redes recebem logos de origem registrada em `frontend/public/networks/sources.json`. As marcas disponíveis no Simple Icons usam revisão fixada `4d29a35c954699b389a834aacc97dd6e7e74143c`, com referência ao kit de marca de origem. Kwai, LinkedIn, Privacy, Fansly e Fatal Model usam assets publicados pelas próprias plataformas; alguns são bitmaps originais encapsulados em SVG, sem redesenho.
- Logos são decorativos junto do nome, com proporções preservadas e sem requisições a terceiros durante o uso. Site/Outro continuam com símbolos genéricos; um slug desconhecido não recebe um logo inventado.
- Os 26 nichos usam pictogramas preenchidos e coloridos no mesmo tamanho-base de 18 px dos logos de redes. São conceitos do produto, não marcas. Fontes e licenças estão em `frontend/public/niches/sources.json`; Heroicons solid (MIT), exceto futebol, que usa Material Icons (Apache-2.0). Cópias das licenças estão em `frontend/public/icon-licenses/`.
- Ícones de marca não significam parceria, aprovação ou patrocínio das plataformas. Respeitar diretrizes de marca ao usar esses assets em outros contextos.

## Cabeçalho

Referência de navegação: [Atlassian Navigation System](https://atlassian.design/components/navigation-system/layout), adaptada à identidade existente, sem copiar marca nem instalar UI externa. Links têm rótulo e ícone decorativo de 20 px, texto de 16 px e área mínima de 48 px. Busca e destinos de conta são preservados; a rota atual é indicada por aria-current.

No celular, o botão Menu abre links em uma lista vertical. Escape recolhe e devolve foco ao botão; os itens ocultos não entram na navegação por teclado. Os papéis USER/ADMIN apenas definem apresentação conforme contrato anterior; autorização permanece no backend.

## Ajustes da home

O título fica em uma linha no celular com escala tipográfica responsiva. O botão Mostrar mais fica a 16 px do grid, em vez de 32 px. Explorar continua centralizado, com nomes sem quebra de linha, duas linhas por grupo e expansão dos demais itens.

Fontes adicionais: [Simple Icons](https://github.com/simple-icons/simple-icons), [Kwai Brand Resource](https://www.kwai.com/id/brand-resource), [LinkedIn Downloads](https://brand.linkedin.com/downloads), [Privacy Brand](https://privacy.com.br/brand), [Fansly](https://fansly.com/), [Fatal Model](https://fatalmodel.com/), [Heroicons](https://github.com/tailwindlabs/heroicons) e [Material Design Icons](https://github.com/google/material-design-icons).

## Verificação desta etapa

- 18 testes afetados aprovados; typecheck e lint dos arquivos desta alteração aprovados.
- Chromium em 320, 390, 768 e 1440 px, com variantes visuais público/USER/ADMIN: navegação, alvos de clique, ícones, menu mobile, Escape/foco e axe A/AA aprovados. Cookies de papel foram usados apenas para verificar apresentação, não para conceder acesso a rotas protegidas.
- Título em uma linha nos tamanhos mobile e distância de 16 px entre grid e Mostrar mais verificadas no navegador. Os 45 arquivos de ícones carregaram localmente; a galeria foi inspecionada visualmente.
- Regressão de Mostrar mais em desktop e mobile: 15 → 39 → 63 orgânicos, 9 patrocinados preservados, sem recarga e sem alteração da rolagem; inclui erro HTTP e nova tentativa.
- Compilação de produção e verificação de tipos passaram em cópia isolada, com `--no-lint`, sem interromper o servidor aberto pelo usuário. O lint global continua bloqueado por `notice` não utilizado no catálogo, após o aviso correspondente ter sido comentado em alteração local preservada.
- Suíte completa: 130 aprovados e 4 falhas fora desta fatia — 1 teste espera o aviso de status comentado no catálogo; 3 testes do formulário de envio procuram Nome, mas o rótulo local foi alterado para Titulo. Essas alterações locais não foram revertidas nem seus testes mascarados.
