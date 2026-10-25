# Ondas — revisão visual dos recursos e experimentos

Data: 23/10/2026. Revisor: `/root/ondas_resource_visual_finish`. Revisão somente leitura do produto, sem alteração de dados, regras, código da aplicação ou testes.

## Evidência examinada

- Os 12 casos Playwright de anexos e cobertura de recursos terminaram verdes em 55,7 s: `output/ondas-demo/validation.log`. A execução e suas ações pertencem ao agente raiz; esta revisão abriu as imagens produzidas.
- **46 PNG originais abertos individualmente**: 42 de recursos dinâmicos e 4 de anexos, desktop e mobile. O manifesto exato está em `output/ondas-resources-visual/opened-resource-captures.json`.
- **6 rotas experimentais × 2 larguras** navegadas em contexto Chromium isolado próprio, uma página, 1440×900 e 390×844. As capturas completas e de primeiro viewport estão em `output/ondas-resources-visual/`; relatório `review.json`.
- **Home e detalhe reais da demonstração × 2 larguras** examinados em `ondas.localhost:3013`. A home foi novamente capturada depois de rolagem para carregar imagens lazy: `demo-home-loaded-{1440,390}.png`. Todas as quatro capas ficaram carregadas; `demo-loaded.json` registra as dimensões reais.
- Nas 16 navegações próprias: HTTP 200, um H1, nenhum erro de página, nenhum overflow horizontal e nenhuma violação Axe nos tags WCAG 2 A/AA, 2.1 AA e 2.2 AA. Os experimentos registram `robots=noindex,nofollow`.
- Cookies de consentimento negado nos hosts utilizados; requisições de analytics interceptadas com 204. Não houve formulários enviados, pagamentos, clique de saída nem alteração de conteúdo por este revisor. Navegadores próprios encerrados ao fim das capturas.

## Recursos: resultado por estado

| Rota | Estados efetivamente abertos | Resultado visual |
| --- | --- | --- |
| `/p/[slug]` | Areia e Botânico; formulário vazio e contato recebido | Paletas do autor preservadas; campos, rótulos e confirmação legíveis em ambas as larguras. |
| `/p/[slug]/c/[campaignSlug]` | Campanha publicada Areia | Conteúdo e botão preservados; layout legível. |
| `/p/[slug]/midia-kit` | Apresentação publicada Areia | Métrica declarada pelo proprietário e aviso de não verificação visíveis. |
| `/p/[slug]/canais/estado` | Canal indisponível, captura anterior à correção | **Fonte corrigida; revisão em runtime pendente:** logo do rodapé tinha marinho sobre marinho. |
| `/painel/perfil/canais/[groupId]` | Primeira etapa de grupo salvo | Campos, progresso e ações legíveis; sem aprovação das etapas seguintes por esta captura. |
| `/painel/perfil/campanhas/[id]/previa` | Rascunho de campanha Areia | Banner de prévia e conteúdo preservados. |
| `/painel/perfil/campanhas/[id]/metricas` | Medição pausada/sem dados | Valores indisponíveis claros; não equivale a validar gráficos populados. |
| `/painel/perfil/midia-kit/previa` | Prévia Areia com métrica manual | Banner, dados e aviso legíveis. Esta linha já existia na matriz; a nova evidência amplia o estado anterior sem perfil. |
| `/painel/equipe/[id]/editar` | Página compartilhada com perfil publicado, captura anterior à correção | Mobile estava legível. **Fonte corrigida; revisão em runtime pendente:** card desktop fragmentava “Personalizar aparência”. |
| `/painel/equipe/[id]/previa` | Prévia do perfil compartilhado | Banner e retorno claros, paleta Areia preservada. |
| `/painel/equipe/[id]/metricas` | Consulta da página sem dados | Contexto de leitura e filtros legíveis; sem controles de medição do proprietário. |
| `/equipe/convite` | Convite válido antes de aceitar | Explicação e ação principal legíveis; o aceite foi verificado pelo teste, e a captura registra o estado anterior. |
| `/painel/convites/[id]/distribuicao` | Distribuição vazia e ativa | Estados, avisos e ações distinguíveis em ambas as larguras. |
| `/colecoes/[slug]` | Seleção pública com um link | Autor da curadoria e atribuição do publicador visíveis; card sem imagem compacto. |
| `/r/[handle]/estado` | Link permanente indisponível | Mensagem e alternativas legíveis. |
| `/verificacao/[id]` | Controle de domínio válido e revogado | Status e limites da comprovação legíveis; nenhum selo promete segurança do destino. |

## Achados materiais encaminhados

1. **P2 — quebra de palavras no card de ação do editor compartilhado (desktop).** `output/ondas-demo/test-results/ondas-platform-coverage-On-87cca-via-de-página-compartilhada-ui-desktop/team-editor.png`: “Personalizar aparência” quebra em fragmentos dentro de um card de cerca de 188 px apesar da área central disponível. O estado mobile não apresenta o defeito. Encaminhado ao agente raiz para correção compartilhada e recaptura do estado desktop.
2. **P2 — marca quase invisível no estado de canal indisponível.** `output/ondas-demo/test-results/ondas-platform-coverage-On-c2d00-kit-com-recursos-publicados-ui-{desktop,mobile}/channel-unavailable.png`: logo original marinho sobre fundo marinho deixa apenas o pequeno detalhe turquesa reconhecível. Encaminhado para selecionar variante clara nesse estado sem alterar a identidade das publicações claras.

**Fechamento da revisão:** o agente raiz informou que as correções do grid de atalhos e da variante clara da marca no estado de canal foram implementadas e que o build normal final passou, incluindo também o ajuste separado de ResponsiveTabs. Os checks de backend, lint, tipos e build foram reportados verdes pelo agente raiz; este revisor não os executou novamente. As duas linhas afetadas da matriz estão em `source-fixed-awaiting-runtime-review`.

A revisão automática de permissões rejeitou reiniciar o frontend em 3013 e iniciar uma instância local separada em 3008, inclusive usando `127.0.0.1`, com `blocked by policy` e sem razão detalhada. Não foi tentado outro mecanismo para contornar o bloqueio. O runtime anterior em 3013 continuou ativo, portanto suas capturas e os 12 casos verdes permanecem evidência da versão anterior às últimas correções. Não há nova aprovação visual dessas correções: faltam recapturar e abrir o editor compartilhado e o estado de canal indisponível no build final.

### Rechecagem adicional do build anterior — 23/10/2026

O usuário autorizou explicitamente o reinício posteriormente. Segundo o agente raiz, a tentativa normal de confirmar e encerrar somente o PID próprio 70140 para iniciar Next em 3013 voltou a ser rejeitada em `CreateProcess`, com `blocked by policy`, sem motivo detalhado. Não há falta de autorização do usuário registrada, mas a ferramenta recusou executar a ação. Este revisor não iniciou navegador, servidor, build nem testes nesta rechecagem e não tentou outra porta ou mecanismo.

Os artefatos em disco distinguem as versões: `frontend/.next-e2e/BUILD_ID` contém `07ZphW8m87ZLuiAiQ1WZE` (23/10, 17:54); `frontend/.next/BUILD_ID` contém `c4zRzXVUaNKvc2JzdDgup` (23/10, 18:13). O agente raiz confirmou o primeiro ID no HTML do runtime ativo. A comparação estática dos CSS/JS compilados confirma que o build final contém ajustes ausentes no antigo: limites de largura de ResponsiveTabs; remoção do recorte experimental do gráfico; atalhos do perfil em `auto-fit`; variante `platform` da assinatura de canal; bordas de alertas de autenticação e filetes de hover/foco mais finos; remoção do acento espesso nas métricas do painel. A superfície popup do diálogo de plano já está presente nos dois artefatos, portanto sua recaptura pendente não deve ser descrita como código ausente do runtime antigo.

**Rechecagem executada pelo agente raiz no runtime antigo: 4/4 passaram em 1,2 min**, cobrindo `admin: telas sem overflow` e `W07 métricas do admin` em desktop/mobile. Evidências: `output/ondas-demo/finish-validation.log` e `finish-results.json`. Abri individualmente os **oito PNG** de `finish-test-results/`: configurações, moderação, gráficos financeiros e gráficos de tráfego, cada um nas duas larguras. Campos, status e séries turquesa estão legíveis nos estados capturados; não identifiquei novo defeito visual material nessas oito imagens. Isso não aprova W09 nem testa tooltips/foco após a remoção do recorte no build final.

O fechamento honesto continua sendo implementação compilada com verificação ampla da versão anterior e últimas correções aguardando validação em runtime. Não marcar a etapa inteira ou a nova exigência de paridade exata com a preview como concluída a partir desta evidência histórica.

## Anexos e catálogo com fotografia

As quatro capturas do teste de anexos mostram corretamente o layout com capa e sua remoção: desktop divide imagem e resumo, mobile empilha; o resumo centraliza quando não há capa. O azul uniforme é um raster funcional minúsculo do teste, portanto **não valida crop fotográfico**. Na captura mobile sem capa, a seção de relacionados ainda está em skeleton; a conclusão dessa imagem se limita ao herói sem capa.

A demo `ondas.localhost:3013` complementa a prova com fotografias reais: montanhas, show, câmera e notebook. Abri os dois detalhes capturados (paisagem em desktop, show em mobile) e a home completa após rolagem nas duas larguras. O assunto principal continua reconhecível, a capa termina antes da área de texto e os cantos superiores encapsulam a imagem junto do card. Os dois cards sem capa não reservam altura de fotografia. Nos destaques, a área maior, a borda de destaque e a indicação “Patrocinado” os diferenciam dos orgânicos. A demo usa conteúdo fictício e destaques administrativos fictícios; estas imagens não comprovam pagamento ou elegibilidade de destaque.

As capturas completas iniciais tinham áreas de fotos ainda não carregadas abaixo da dobra. A recaptura após rolagem carregou todas as quatro capas, sem alterar o código. Não foi registrado esse efeito de captura como falha do produto.

## Experimentos preservados

| Padrão | Caminho concreto examinado |
| --- | --- |
| Home anterior | `/dev/home-preview` |
| Detalhe anterior | `/dev/home-preview/link/frequencia-indie` |
| Índice da galeria | `/dev/homes` |
| Direção genérica | `/dev/homes/galeria` |
| Ondas | `/dev/homes/ondas` |
| Detalhe Ondas | `/dev/homes/ondas/link/frequencia-indie` |

O índice, os primeiros cards, navegação de alternativas e ambas as páginas Ondas ficaram legíveis nas larguras examinadas. Ondas mantém título desktop em uma linha, busca centralizada, categorias com ícones e material vítreo. Os exemplos anteriores ainda apresentam decisões de suas versões históricas (texto sobre imagem, botões de busca e rodapé próprio além do compartilhado); são experimentos preservados, não a implementação do catálogo real.

As 32 variantes não foram percorridas individualmente nesta revisão: o padrão dinâmico foi amostrado com `galeria`, além da rota explícita `ondas`. Não se promove a amostra a aprovação das 32 direções nem a prova de features de produção. Não houve alteração para ocultar achados Axe; os 12 estados dev retornaram zero na execução real.

## Matriz e limites

A matriz foi conciliada em 25 linhas: 14 antes sem recurso, 6 dev, 2 com novos estados válidos/populados (`/equipe/convite` e `/painel/perfil/midia-kit/previa`) e 3 públicas cuja evidência foi aberta por `/root/ondas_final_visual_audit` (não por este revisor): `/recuperar-senha`, `/resumos/cancelar`, `/termos`, arquivos `final-{1440,390}-*.png` e `output/ondas-final-visual/final-controls.json`. Recuperação e cancelamento permanecem prova do estado sem token; não de sua jornada completa.

Cada marcação visual vale apenas para o estado capturado. Os testes de recursos verificam as jornadas especificadas no arquivo de teste, não todas as combinações de permissões, erro, conteúdo e pagamento. Esta revisão não repetiu a suíte, build, análise de fonte, benchmark, leitor de tela ou validação de gráficos populados. Reduced-motion foi usado para consistência; desempenho da animação em GPU real é responsabilidade da verificação separada.

Questions skipped: tarefa delegada de revisão de evidência; direção aprovada e nenhuma decisão do usuário necessária.
