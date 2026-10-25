# Ondas — inspeção pública inicial, 23/10/2026

Primeira inspeção do código real em `http://127.0.0.1:3008`, iniciada às 20:02 UTC. Não valida a migração completa, o catálogo populado ou as áreas autenticadas.

## Ambiente e procedimento executado

- Chromium 153.0.8010.12 instalado pelo Playwright, headless no Windows, contexto isolado sem conta. Não foi controlada nenhuma sessão pessoal ou a página MCP usada pelo agente principal.
- Viewports 1440×1080, 390×844 e 928×884; `prefers-reduced-motion: reduce`, consentimento `tla_consent=denied`, locale pt-BR. Redes de marketing conhecidas bloqueadas no lote principal.
- 30 navegações: `/`, `/login`, `/cadastro`, `/esqueci-senha`, `/recuperar-senha`, recuperação com token fictício, `/divulgar`, `/termos`, `/privacidade` e `/nao-encontrado`, nas três dimensões. Nenhum formulário enviado.
- Axe com tags WCAG 2 A/AA, 2.1 A/AA e 2.2 AA; medição do overflow da página, estilos computados de controles, erros de página, foco inicial e animações CSS em execução.
- Segunda passagem: campos preenchidos com dados fictícios; Tab pelo atalho de conteúdo, marca, pausa, menu e campos; abertura e fechamento do menu e abertura das preferências de cookies sem salvar escolhas.
- `/login`, `/cadastro`, `/divulgar` e `/termos` medidos também a 320, 720 e 928 px, com 884 px de altura. São verificações de layout responsivo, não evidência de zoom real de navegador.
- Emulação adicional de `prefers-reduced-transparency: reduce` confirmou `display: none` no canvas da atmosfera na recuperação de senha.

Scripts locais: `C:/VSCODE/divulgadorlinks/output/ondas-visual-initial/capture.cjs` e `interactions.cjs`. Resultados brutos: `report.json` e `interactions.json` na mesma pasta. Ambos executaram com código de saída 0. Os scripts contêm verificações de consistência; a segunda passagem exige ausência de overflow nas 12 medições responsivas.

## Resultado

| Superfície/estado | Alcance comprovado | Resultado |
| --- | --- | --- |
| Login, cadastro, esqueci, recuperação sem token/com token | 3 viewports, 15 estados | Sem violações Axe ou overflow; controles com nomes; sem erros de página registrados. |
| Aquisição `/divulgar` | 3 viewports | Sem violações Axe ou overflow; CTA, gratuidade e identificação do exemplo preservados visualmente. |
| Termos, privacidade e página não encontrada | 3 viewports, 9 estados | Sem violações Axe ou overflow. |
| Home `/` | 3 viewports | **Bloqueada:** backend 3333 indisponível, overlay do Next com `ECONNREFUSED`. Não houve catálogo renderizado. |
| Login preenchido e foco | 390×844 | Texto claro em campo escuro; senha mascarada; foco turquesa de 3 px; Axe sem violações. |
| Menu móvel aberto | 390×844 | Painel legível e destaque ativo legível; Axe sem violações. Escape permitiu prosseguir para ação fora do diálogo. |
| Preferências de cookies abertas | 390×844 | Ações, texto e opções legíveis; Axe sem violações. Não houve aceite, recusa ou salvamento. |
| 4 páginas a 320/720/928 px | 12 medições | Sem overflow horizontal da página. |

27 estados públicos efetivamente renderizados passaram no Axe. Os três estados da home apresentam `document-title` e `html-has-lang` no documento de erro `#__next_error__`; esses resultados pertencem ao bloqueio de infraestrutura e não aprovam nem reprovam a semântica do catálogo real. Nenhuma animação CSS em execução foi registrada nos 27 estados válidos com movimento reduzido; esse dado não mede cadência de frames do canvas.

## Revisão das imagens

As capturas abaixo foram abertas e examinadas após o lote, além da inspeção dos resultados brutos. A linguagem navy/turquesa, os campos escuros, as ações primárias e o foco estão legíveis. Autenticação mantém largura curta para leitura; aquisição mantém a proposta e o próximo passo; o texto legal segue fluxo contínuo sem cortes ou sobreposição. Não foi confirmado defeito visual P1 nessas imagens.

Pasta absoluta das evidências: `C:/VSCODE/divulgadorlinks/output/ondas-visual-initial/`.

| Evidência aberta | Arquivo nessa pasta |
| --- | --- |
| Login desktop | `1440-login.png` |
| Login móvel vazio e preenchido com foco | `390-login.png`, `390-login-filled-focus.png` |
| Cadastro móvel | `390-cadastro.png` |
| Esqueci a senha móvel | `390-esqueci-senha.png` |
| Recuperação sem token | `390-recuperar-senha.png` |
| Recuperação com token e rodapé confirmado | `390-recover-footer-confirm.png` |
| Aquisição desktop e móvel | `1440-divulgar.png`, `390-divulgar.png` |
| Termos móvel | `390-termos.png` |
| Navegação móvel e preferências | `390-navigation-open.png`, `390-cookie-preferences.png` |
| Bloqueio da home, não catálogo | `1440-home.png`, `390-home.png`, `928-home.png` |

Uma captura de recuperação com token omitiu a pintura do rodapé apesar de o DOM indicar caixa visível em y=718,625 e `elementFromPoint` identificar o rodapé. Uma nova captura após `scrollIntoViewIfNeeded()` o mostrou normalmente, em `390-recover-footer-confirm.png`. A captura confirmada é a evidência válida dessa tela; não foi feita alteração de produto para contornar comportamento de captura/composição do Chromium. O corte da atmosfera fixa após a altura inicial em capturas longas também não prova uma emenda durante a rolagem real.

## Pendências e limites

- Reexecutar home com backend e fixtures reais. Busca, catálogo populado, selects de filtros abertos, cards, patrocinados, mídia real e detalhes permanecem sem validação neste lote.
- As rotas legais e a landing ainda contêm a promessa já documentada de análise humana. A divergência com aprovação automática condicional exige reconciliação de produto; nenhuma promessa foi alterada nesta inspeção.
- Não foram executados lint, typecheck, Vitest, build ou o runner E2E por este agente. O agente principal coordena esses checks em série. Esta inspeção não substitui regressão de autenticação ou publicação.
- Sem submissão de formulário, estados de sucesso/erro retornados pela API, sessões autenticadas, cobrança, tenant, 95 rotas, aparelhos físicos, leitores de tela, zoom real de 200%, benchmark de desempenho, fallback sem GPU/backdrop ou certificação de acessibilidade total.
- Nenhum arquivo de implementação foi modificado. Reversão desta entrega: remover apenas este relatório e os novos arquivos de `output/ondas-visual-initial`, preservando o trabalho preexistente.
