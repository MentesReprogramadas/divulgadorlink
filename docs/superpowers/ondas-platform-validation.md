# Ondas — validação da migração

**Rodada atual de 23/10/2026:** a demo foi reiniciada e isolada em `.next-ondas-demo`; home/detalhe compartilham a lente e o CSS da preview. Auditoria por arquivo:535 TSX/CSS de produção, com distinção entre fonte e runtime. Resultados, medições desktop/celular, rechecagens e limites atuais estão em `2026-10-23-ondas-final-audit.md`. O corpo abaixo preserva a evidência histórica de versões anteriores e não certifica automaticamente as alterações novas. A matriz mantém pendentes os estados ainda sem nova inspeção, e temas pessoais/experimentos preservam seu escopo.

Execução em 23/10/2026 na branch existente `codex/roadmap-f37-testes`. A árvore compartilhada foi preservada. Spec e plano estão em `specs/2026-10-23-ondas-platform-design.md` e `plans/2026-10-23-ondas-platform.md`. Não foram criados commits, branches, worktrees, push ou deploy.

## Entrega e contratos

Catálogo real, busca, nichos/redes, detalhe, aquisição/autenticação/legal, conta, ferramentas de publicação, painel e administração recebem Ondas. Navy/turquesa, Outfit e Source Sans 3 permanecem. Vidro usa superfícies, reflexos, blur, bordas e sombras; popups/diálogos têm maior opacidade. A atmosfera pública reutiliza o shader aprovado com desenho limitado a 30 fps; ferramentas usam ondas SVG. Pausa, reduced-motion, reduced-transparency e fallback sem WebGL/backdrop estão implementados. Não houve UI kit, dependência ou lockfile novo por este lote.

Ícone e capa são anexos reais opcionais, com raster seguro, descrição alternativa e revisão separada do texto. Proposta pendente conserva a mídia aprovada; remoção/rejeição/troca são transacionais e auditadas. Sobre reutiliza a descrição existente. O público só recebe mídia aprovada/elegível. Cards sem foto/falha omitem a região e conservam altura própria; detalhe usa duas colunas quando possível. Perfis/campanhas/mídia kits publicados preservam a paleta escolhida pelo publicador.

Arquivos e fontes por lote: `ondas-public-progress.md`, `ondas-workspace-progress.md`, `ondas-media-progress.md`, `ondas-final-source-review.md`, `ondas-media-review.md`, `ondas-profile-finish.md` e `ondas-design-documentation.md`. A matriz distingue implementação, estado renderizado, revisão visual e jornada; herdar tokens não equivale a aprovar uma tela.

## Checks realmente executados

- Frontend lint e tipos passaram, incluindo TypeScript de E2E. Vitest completo: 168 arquivos/582 testes; 581 passaram e um excedeu 5 s sob execução concorrente. Reexecução isolada do arquivo: dois testes passaram em 3,13 s, sem mudar timeout/assertions. Logs: `output/ondas-platform-vitest-final.log` e `ondas-platform-vitest-recheck.log`. O acabamento posterior de perfil adicionou uma regressão e passou em três arquivos/17 testes, com lint e tipos.
- Backend lint, tipos e build passaram. Suíte completa final com serviços próprios: 162 arquivos/670 testes; 669 passaram e um prazo da prova do worker excedeu sob carga. Reexecução isolada do worker real passou em 9,95 s. Logs: `output/ondas-platform-backend-tests-final.log` e `ondas-platform-pix-recheck.log`. A primeira tentativa sem os serviços locais falhou por conexão; resultados preservados, sem tratá-los como prova de regressão do produto.
- Mídia: seis testes com PostgreSQL próprio e 12 regressões de domínio/POST passaram pelo implementador; também campos, normalização, revisão, conflito e permissões no frontend. Revisão independente corrigiu filtro antes do limite, limpeza de pendências e feedback privado de rejeição. BFF recebeu 2 MiB somente nas rotas/métodos exatos de upload/criação; 12 testes focados verificaram fronteiras e vizinhos que continuam em 1 MiB.
- Builds reais de produção do frontend foram executados em runners serializados, com `.next-e2e` separado do dev. As 72 migrações foram aplicadas somente a PostgreSQL descartável. Isso não é deploy.
- Regressão visual/layout: primeira passagem 30/42; segunda 40/42. As duas falhas restantes de loading contavam o proxy `aria-hidden` de submissão do Select como campo editável; ambos os casos corrigidos passaram na integração. Seis goldens estáveis por viewport foram atualizados, abertos e depois comparados sem `--update-snapshots`, com sucesso.
- **Integração final: 12/12 passaram em 55,7 s**, desktop/mobile: envio real com ícone+capa, análise humana, bytes/BFF, catálogo/detalhe, substituição pendente, rejeição/motivo e remoção; publicações Areia/Botânico, formulário por teclado, campanhas, canais, mídia kit, equipe, coleção, distribuição e comprovação de domínio. Evidência permanente em `output/ondas-demo/results.json`, `validation.log` e `test-results/`: 46 capturas, todas abertas pelos revisores.

## Correções orientadas pela evidência

Marca limitada em 320 px/fonte ampliada; séries turquesa nos gráficos; status/etapas/hovers/logo de drawer legíveis; tokens inválidos removidos. Favorito sobre foto recebeu fundo controlado. Cards reais e detalhe receberam vidro que faltava na primeira implementação; cards sem foto pararam de esticar até a altura do vizinho com foto. Métricas usam colunas pela largura disponível. Diálogos nativos usam `--surface-popup` para impedir texto de trás atravessando labels/campos.

Os testes de anexos passaram a esperar campo habilitado e preview preparado, refletindo a interação disponível ao usuário. Atualizar uma proposta rejeitada espera seu estado real. O assert da descrição foi limitado à região Sobre, porque relacionados também podem conter o texto. Nenhuma garantia de permissão, status público, tenant, moderação ou eventos foi retirada.

O teste de tamanho do corpo foi reconciliado com 2 MiB na criação de Link e conserva a prova de 1 MiB nas demais rotas. Uma expectativa antiga de símbolo de notificação foi atualizada para a nomenclatura de Link permanente já existente na árvore; o comportamento da mensagem não foi alterado por essa correção de teste.

O overflow de 1753 px foi reproduzido em cinco ciclos exatos de 1920→320/fonte 200%. A causa era a largura anterior das abas enquanto ResizeObserver atualizava o modo Select. Duas restrições locais de largura eliminaram o excesso em cinco ciclos sem espera/poll. A hipótese inicial de clipping no gráfico foi revertida após o diagnóstico. Evidências: `output/ondas-final-visual/w09-exact-diagnostic.json` e `w09-css-probe.json`. O componente comum recebeu a correção sem esconder conteúdo nem remover assertions.

## Cobertura e limites

95 rotas inventariadas: 75 estados de rotas inicialmente disponíveis foram capturados e abertos em desktop/mobile; 14 rotas dependentes de recursos foram exercitadas com usuários exclusivos e moderação simulada do harness, conservando thresholds; seis `/dev` foram inspecionadas separadamente em desenvolvimento e ficam indisponíveis em produção. Conferir a granularidade em `ondas-route-matrix.csv`, `ondas-final-visual-review.md` e `ondas-resources-visual-review.md`. Isso não significa percorrer toda combinação possível de cada ferramenta.

Teclado, Escape, retorno de foco, calendário, pausa e fallbacks têm inspeção real. Fonte de 200% não equivale a zoom real do navegador. Continua registrado `aria-hidden-focus` em quatro guards internos do Base UI com Select aberto; Tab não parou neles na inspeção. Nenhuma regra Axe foi suprimida. Não há certificação de acessibilidade total, leitor de tela, aparelho físico, carga de produção ou conversão.

## Ambiente de revisão e reversão

`http://ondas.localhost:3013`, banco próprio `127.0.0.1:5446/divulgador`: seis comunidades fictícias, quatro capas, três ícones e dois cards sem mídia. As fotografias foram conferidas após rolagem para carregar imagens lazy. Dois destaques são administrativos de fixture, sem compra ou audiência prometida. Saídas usam `example.invalid`; não são comunidades reais. Contas e ciclo local em `ondas-local-demo.md`. O banco habitual do projeto não foi migrado.

A migração aditiva `20261023170000_link_media` precisa ser aplicada antes do novo servidor em outro ambiente. Reverter somente os arquivos deste lote conforme relatórios/baselines, preservando mudanças anteriores; não executar reset/clean destrutivo. Tabela/coluna podem permanecer sem consumidores num rollback, sem apagar anexos. Apenas processos/contêineres próprios foram encerrados; o runtime de revisão permanece disponível.

## Conferência final bloqueada no runtime

Lint, tipos e build normal final passaram em `.next`, incluindo ResponsiveTabs e os dois acabamentos de perfil. O detector estático final dos estilos/primitivas/shell/catálogo/mídia retornou `[]` após remover quatro acentos espessos antigos; isso não substitui inspeção visual. O índice incremental local foi atualizado: 7475 nós/26125 relações, sem LLM/API/clustering ou envio externo. CSS/imagens não são modelados pelo grafo.

A revisão automática de permissões rejeitou substituir o servidor de revisão na porta 3013 e também iniciar outro frontend na porta 3008, inclusive a alternativa restrita a `127.0.0.1`. O retorno foi somente `blocked by policy`, sem motivo detalhado. Não foi tentado outro mecanismo para contornar essa recusa. O servidor existente continua em `http://ondas.localhost:3013`, com dados/fotos da demo e o build anterior às últimas correções.

Continuam pendentes a repetição W09/W07/admin no build final, a recaptura dos atalhos/assinatura e zoom real de navegador. As duas linhas afetadas na matriz estão `source-fixed-awaiting-runtime-review`; as imagens antigas foram preservadas. A direção e a implementação não são apresentadas como aprovação final dessas correções no runtime. Os checkboxes de fechamento visual permanecem abertos por esse limite concreto.
