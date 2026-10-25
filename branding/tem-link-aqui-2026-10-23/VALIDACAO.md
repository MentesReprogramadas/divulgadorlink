# Validação — branding Tem Link Aqui, 23/10/2026

Escopo: showroom local e arquivos de marca. Nenhum código de produto foi alterado.

Executado: geração SVG/PNG, verificação das dimensões PNG, parse e títulos dos SVGs, ausência de texto vivo/raster nos logos, cabeçalho ICO 16/32/48, auditoria da skill e inspeção dos quatro mockups. Símbolos: Ponte 99; Farol, Liga e Rota 100. Essas notas são heurísticas e não certificam qualidade, originalidade ou registro.

Brandbook: 11 páginas, PDF com texto extraível em todas as páginas; imagens carregadas e ausência de overflow nos quadros verificada. Renderização via PDFium para inspeção visual. A fonte Outfit e sua OFL estão incluídas. Imagens por IA e seus derivados têm origem e hashes em proveniencia.json.

A bateria específica do showroom está em showroom.spec.cjs, com configuração própria sem setup de backend ou containers. O relatório final do Playwright Test fica em validation/tests.json. Não rodamos lint/typecheck/build/E2E do produto, pois esta entrega não altera o frontend/backend da aplicação.

## Resultado do navegador

Playwright Test: **5 testes passaram**. Cobertura: 320, 390, 768 e 1440 px; troca das quatro identidades por Enter; `aria-pressed`, links de download e atualização de todas as artes; imagens decodificadas e links locais existentes; ausência de erros JavaScript e transbordamento. Axe WCAG 2 A/AA e 2.1 AA em 390 e 1440 px: nenhuma violação detectada. Isso não certifica acessibilidade total.

Verificados também reduced-motion, skip link, foco visível, ampliação **via CSS zoom de 200%** e favicon em modo claro/escuro. CSS zoom não equivale a um teste manual de zoom nativo em todos os navegadores. A ampliação revelou transbordamento; a responsividade passou a acompanhar o container real e o problema foi corrigido.

Playwright MCP em contexto próprio: navegação HTTP local, seleção de Farol em desktop e Liga em 390 px, captura e inspeção. A navegação `file:` é bloqueada pelo MCP, por isso foi usado servidor local somente de leitura, isolado da aplicação. O Playwright Test usa seus próprios contextos. Capturas desktop/mobile, zoom e páginas PDF foram abertas para inspeção, além da inspeção dos quatro mockups originais.

## Crítica e ferramentas

O inspector Taste encontrou um título de três linhas em tablet: encurtado para “Mesmas cores. Novas formas.”. A inspeção final usa três exceções documentadas: `still-page`, porque a comparação de forma/tamanho permanece estática e não há vídeo real de fabricação; `eyebrow`, falso positivo no aviso de simulação por IA abaixo da fotografia, que precisa permanecer; `icon-cards`, porque os quatro itens são controles de seleção com as próprias marcas, não cards decorativos de ícones.

Avisos de diversidade de tamanhos tipográficos e falta de vídeo são limites conhecidos do diagnóstico. Não adicionamos uma filmagem de estoque que sugerisse fabricação real. Essas exceções são decisões desta galeria, não novos contratos da home pública. Relatórios completos em research/taste/.

Artes físicas também exportadas em PNG **300 ppi**, com largura/altura e metadata verificadas. Arquivos permanecem RGB, sujeitos ao gabarito e à prova de cada fornecedor. ZIPs conferidos por integridade e existência dos membros.

Limites: não houve leitor de tela real, dispositivo físico, prova têxtil, arquivo de pontos de bordado, validação de impressão, pesquisa de registro de marca ou teste com público. Mockups são simulações e não substituem gabaritos dos fabricantes. A marca não foi aplicada ao site.

Reversão: remover somente a pasta branding/tem-link-aqui-2026-10-23 e seu registro de direção em .impeccable/surfaces/branding-showroom.md. As propostas anteriores e os assets em uso permanecem preservados.

## Inclusão dos 20 conceitos no HTML

Adicionada seção `#novos-logos` ao index existente: vinte opções individuais numeradas como no chat, com nome, ampliação e download da prancha original. Os cinco PNGs são preservados; cada miniatura mostra seu quadrante por CSS. Nenhuma imagem foi apresentada como SVG ou kit completo. As quatro direções anteriores e seus mockups permanecem disponíveis.

Regressão específica executada novamente: **5 testes passaram** em 320, 390, 768 e 1440 px. Verificados os vinte números em sequência, abertura dos conceitos 01/10/20 por teclado, quadrante e arquivo corretos, Escape e botão Fechar, retorno do foco, links locais, arquivos carregados e ausência de erros/overflow. Axe sem violações detectadas na galeria e no dialog em 390/1440 px. Zoom CSS 200%, reduced-motion e favicon continuam passando.

Playwright MCP: vinte itens encontrados; abertura do conceito 20 em 390 px, fechamento por Escape e retorno de foco ao mesmo item, sem overflow. Capturas de desktop e ampliações de celular abertas para inspeção. O brandbook PDF continua documentando as quatro direções completas; os vinte novos são estudos adicionais em imagem.

Arquivos desta extensão: index.html, showroom.js, conceitos.css, showroom.spec.cjs e pasta conceitos-20/. Para reverter apenas a extensão, remover sua seção e dialog do HTML, o link para conceitos.css, os eventos correspondentes em showroom.js e a pasta de cópias, preservando os estudos originais na pasta irmã.


## Vetorização das opções 01, 09 e 19

Nexo, TLA e Confluência reconstruídos como SVGs de contornos, com símbolos em curvas Bézier e lettering geométrico refinado para eliminar irregularidades das imagens de conceito. As proporções e os destaques de cor foram preservados; os gradientes foram convertidos em #0A192F e #4AF9EB. Os originais raster permanecem preservados.

18 SVGs: logo colorida, preta, branca, símbolo, assinatura e versão de galeria por conceito. Sem texto vivo, imagens embutidas, filtros ou máscaras. Contadores das letras são recortes transparentes. Renderizações dos símbolos em 16, 32, 64 e 512 px verificadas; versão branca inspecionada sobre azul. A leitura do monograma TLA em 16 px é limitada; usar tamanhos maiores quando a leitura das letras for necessária. A auditoria heurística indica ângulos não canônicos no monograma reconstruído, preservados para manter a forma escolhida.

Galeria atualizada: três miniaturas e ampliações vetoriais, indicação SVG, download individual e pacote dos três. Os outros 17 conceitos continuam em imagem; os quatro kits completos e o PDF mantêm seu escopo anterior.

Regressão após a atualização: 5 testes passaram em 320/390/768/1440 px, incluindo ampliação dos conceitos 01/09/19 e 10/20, download correto, Escape/Fechar, retorno de foco, ausência de overflow, links locais existentes, reduced-motion e zoom CSS 200%. Axe sem violações detectadas nos escopos testados. Playwright MCP usado em contexto próprio: ampliação de Confluência em 390 px e TLA em 1440 px, com capturas abertas para inspeção.

Pacotes ZIP conferidos por integridade. Não houve alteração em frontend/backend do produto, dependências ou marca publicada. Por isso não foi executado build/lint da aplicação; a validação desta entrega foi específica dos artefatos. Não houve prova física, teste em dispositivo real, leitor de tela ou pesquisa de registro de marca.

Para reverter esta etapa: restaurar os três cartões para seus PNGs/quadrantes originais, remover os atributos data-vector/data-vector-download, a variante CSS e o ramo vetorial no diálogo. Os originais estão em conceitos-20 e na pasta irmã tem-link-aqui-20-conceitos-2026-10-23.


## Identidade final Confluência

O usuário escolheu o conceito 19 e autorizou aplicar a marca no site, branch codex/roadmap-f37-testes. A biblioteca oficial está em marca-confluencia/index.html, com manual, kit único e relatório de validação próprio. Substitui a condição histórica acima de que nenhuma marca foi aplicada ao código. Sem publicação remota.
