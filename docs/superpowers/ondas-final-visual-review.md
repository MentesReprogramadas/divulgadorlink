# Ondas — revisão visual independente, 23/10/2026

## Alcance real

Na primeira rodada foram capturados e **abertos de fato 150 estados de 75 rotas**, em desktop 1440×1080 e mobile 390×844. O inventário está em `output/ondas-final-visual/reviewed.json`. Depois foram **abertas e examinadas todas as 46 imagens** persistentes de `output/ondas-demo/test-results`, incluindo as 14 rotas dependentes de recursos publicados/compartilhados. O índice dessas imagens está em `output/ondas-final-visual/dynamic-current.json`. Assim, as 89 rotas de produção tiveram ao menos um estado visual aberto em desktop e mobile, em rodadas distintas; as seis `/dev` não foram abertas nesta revisão. São estados renderizados, incluindo vazios, restrições, ausência de token e redirecionamentos; **não são 89 jornadas funcionais aprovadas, nem todas as capturas pertencem ao último build**.

Mais capturas foram abertas: home a 928 px, busca com anexos, detalhe com anexo, calendário, dialog, select, marca com fonte ampliada, pausa e fallbacks. O revisor não iniciou runner, build, setup ou teardown e não alterou UI, regras ou dados compartilhados. Os builds/fixtures vieram dos runners serializados do agente principal, inicialmente em `http://tenant-a.localhost:3100`, depois no ambiente descartável persistente `http://tenant-a.localhost:3013`.

As capturas correspondem a builds sucessivos. A base de 144 imagens está em `report.json`. Três últimas rotas perderam conexão no teardown; foram repetidas com sucesso e abertas depois, nos seis arquivos `final-{1440,390}-{recuperar-senha,resumos-cancelar,termos}.png`, documentados em `final-controls.json`. A versão de vidro e anexo foi capturada depois. As correções finais de popup, ações do editor compartilhado, marca no estado de canal e ResponsiveTabs ainda dependem de recaptura/regressão pelo agente principal no build final.

## Método

Playwright MCP em contexto novo e isolado para home 928×884, fechado ao terminar. Capturas em lote e interação usaram Chromium, contextos e páginas próprios, sem sessões pessoais. Um browser por vez, exceto uma tentativa inicial interrompida para reduzir contenção durante a suíte; todas as sessões próprias foram encerradas. Visitante, administrador e proprietário de perfil da fixture, consentimento negado e movimento reduzido na revisão estática. Login foi a única submissão; POSTs de métricas foram respondidos localmente com 204 e demais mutações foram bloqueadas.

Os estados estáticos de rota capturados mediram largura sem overflow; uma transição posterior entre larguras revelou overflow transitório real, diagnosticado abaixo. Axe foi executado em **24 estados representativos de página fechada**, mais detalhe com anexo e controles; `axeChecked` distingue medições reais de capturas apenas visuais. Não houve violação nesses 24 estados fechados. Não há certificação automática de todas as rotas. Os 46 PNGs dinâmicos foram revisados visualmente; as medições e mutações que os produziram pertencem à suíte do agente principal.

## O que foi visto

- **Catálogo, busca, nicho e rede:** ondas preservadas, hero central de uma linha, busca direta, ícones de categoria/rede, filtros legíveis e estados vazios coerentes. Sentinela de XSS permanece texto. Cards sem imagem não têm elemento/slot de capa.
- **Anexos reais:** busca encontrou dois links aprovados da fixture. Capa acima, texto abaixo e ícone junto do título; imagem sem padding. No detalhe desktop, imagem grande à esquerda e resumo à direita; mobile empilha. About usa descrição real. A fixture é um raster minúsculo azul: confirma integração e composição, **não testa qualidade de fotografia nem recorte de um anexo real detalhado**.
- **Ferramentas e administração:** formulários, upload, filtros, tabelas, alertas, planos, estados de moderação e áreas de conta mantêm a linguagem escura. Estados sem perfil/plano foram identificados, sem tratar editor vazio como editor populado aprovado. Prévia de publicação mantém a paleta clara do proprietário.
- **Gráfico:** a série de `/admin/visao` agora é turquesa e tem comprimentos claramente distinguíveis nos dois tamanhos. O achado anterior navy sobre navy foi resolvido no build aberto.
- **Marca ampliada:** a 320 px com `font-size:200%`, `/painel` e `/admin/visao` mediram scrollWidth 305 px contra viewport 320, e as capturas mostram a marca contida. Isso testa ampliação de fonte, **não zoom real do browser**.
- **Calendário:** grade abriu em desktop/mobile, seta alterou o dia com foco visível, Escape fechou. Nenhuma data foi confirmada nem filtro persistido. Capturas `1440-datepicker.png` e `390-datepicker.png`.
- **Dialog:** abriu, foco visível nos campos, Escape fechou e retornou ao botão Editar nos dois tamanhos (`returned:true`). Nenhum preço foi modificado.
- **Select:** popup aberto nos dois tamanhos, opções legíveis, foco turquesa e sem overflow. O achado dos guards internos da dependência continua abaixo.

## Movimento e fallbacks conferidos

`controls.json` contém a medição. Com WebGL e movimento normal, houve 37 callbacks de requestAnimationFrame em 600 ms. Após Pausar ondas, houve zero em 600 ms e `aria-pressed=true`; com prefers-reduced-motion, zero callbacks no intervalo medido. Isso comprova interrupção do agendamento, **não é medição de FPS nem benchmark de GPU**.

Uma página nova teve getContext WebGL indisponível de propósito: catálogo e fundo alternativo continuaram renderizados e legíveis (`fallback-no-webgl.png`). A emulação Chromium de prefers-reduced-transparency retornou matches=true, vidro opaco `#123448` e ausência de renderer WebGL (`fallback-reduced-transparency.png`). Não foi testado um navegador físico sem suporte a backdrop-filter; não se confundiu injeção de CSS com suporte real.

## Achados e correções

| Achado | Evidência | Situação |
| --- | --- | --- |
| Texto dos cards atrás atravessa o dialog de editar plano | `1440-plan-dialog.png`, `390-plan-dialog.png`; `.plan-dialog` em promotions.css | Agente principal informou superfície popup 95%, blur/sombra; **recaptura ainda pendente**. Axe não detectou esse ruído. |
| “Impressões” quebra dentro da palavra nos cards de `/painel/links` a 390 px | `390-painel-links.png`; grid de três colunas e padding | Fonte alterada para auto-fit pelo principal. A tentativa de recaptura estava com conta admin sem links; **não validou o estado populado corrigido**. |
| Card sem foto esticava até a altura do vizinho com foto | `final-1440-home.png` | **Resolvido visualmente:** `compact-1440-home.png` mostra cards sem foto compactos, ao lado do card com foto. |
| Select aberto: `aria-hidden-focus` em quatro spans internos data-base-ui-focus-guard | `controls.json`, nos dois tamanhos | Persistiu; é achado automático da dependência. Foco e opções estavam visíveis, sem prova de armadilha. Nenhuma regra Axe foi suprimida. |
| Ação “Personalizar aparência” quebra palavras no editor compartilhado desktop | `output/ondas-demo/test-results/ondas-platform-coverage-On-87cca-via-de-página-compartilhada-ui-desktop/team-editor.png` | Reportado ao principal. Correção de grid informada por outro agente; **recaptura final pendente**. Mobile da mesma fixture estava legível. |
| Marca do rodapé aparece como ponto turquesa no estado de canal indisponível | `channel-unavailable.png` desktop/mobile da suíte persistente | Reportado ao principal. Outro agente confirmou e corrigiu fonte; **recaptura final pendente**. As assinaturas dos temas pessoais Areia/Botânico estavam legíveis. |
| Overflow transitório de 1753 px em contexto mobile após 1920→320 px + fonte 200% | `w09-exact-diagnostic.json`, `w09-css-probe.json` | Causa reproduzida e isolada: ResponsiveTabs conserva largura antiga até ResizeObserver, com override `max-width:none` no tablist. Correção mínima validada por injeção no contexto, 5/5 ciclos com largura imediata de 320 px; principal aplicou fonte. **Regressão do build final pendente**. |

A promessa existente de análise humana continua visível em `/divulgar` e `/termos`, enquanto o projeto documenta aprovação automática condicional. É a divergência de produto já registrada no AGENTS, não uma conclusão nova nem uma regra alterada por este revisor.

## Diagnóstico de resize mobile

Foi repetido cinco vezes o mesmo fluxo do W09 em contexto `isMobile:true,hasTouch:true`: visitar painel/admin nas larguras 320, 768, 1280, 1440 e 1920; voltar a 320 e aplicar `font-size:200%`, sem espera/layout intermediário. Em **5/5 ciclos**, o primeiro estado teve `documentElement.scrollWidth=1753`, apesar de `clientWidth=320`. A caixa responsável era o tablist de 1736,9 px começando em x=16. Após um RAF a largura voltava a 320. Medir layout antes de ampliar a fonte mascarava a condição, por isso o primeiro diagnóstico foi corrigido para reproduzir o fluxo exato.

Em teste separado, só no contexto do navegador, foi aplicado `max-width:100%` ao filho ResponsiveTabs do toolbar e ao tablist. O fluxo exato passou **5/5 ciclos com largura imediata de 320 px**, sem aguardar observer nem ocultar toolbar/foco. O principal aplicou a alteração no CSS e removeu o recorte experimental do gráfico, pois o gráfico não causava esse overflow. Isso demonstra a causa e a eficácia da intervenção local; não substitui executar o teste na fonte final.

## Recursos dinâmicos e limites

Todas as 46 capturas persistentes do índice `dynamic-current.json` foram abertas: perfis publicados Areia e Botânico, formulários e confirmação de contato; convite autorizado, editor/métricas/preview de equipe; coleção pública; distribuição vazia/ativa; domínio válido/revogado; campanha pública/preview/métricas; editor de grupo de canais e canal indisponível; media kit público/preview; detalhe com capa aprovada e sem capa. Os temas pessoais permanecem distintos da plataforma por escolha do proprietário. Não foram submetidos formulários nem alterados dados por este revisor. A captura mobile `link-no-cover.png` ainda mostra skeletons em relacionados: prova o detalhe sem capa, não a estabilização daquela seção. A inspeção fotográfica da home populada e as recapturas dos últimos ajustes ficaram atribuídas a outro agente.

Pendente no fechamento desta revisão: conferir popup final e foco/tooltip após reversão do recorte experimental; métricas populadas mobile; ações do editor e assinatura do canal após as últimas correções; regressão W09 no build final. As seis rotas `/dev` continuam excluídas do build de produção e não foram abertas neste lote. Sem teste em aparelho físico, leitor de tela, zoom real do navegador, touch drag, browser sem backdrop-filter ou benchmark. Lint, tipos, Vitest, build e Playwright Test são coordenados pelo agente principal. Todas as páginas/contextos próprios deste revisor foram encerrados.
