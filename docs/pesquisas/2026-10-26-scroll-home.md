# Investigação de engasgos ao rolar a home — 26/10/2026

## Conclusão

O relato foi esclarecido pelo usuário: engasgos ao dar scroll na home, em desktop e mobile. A hipótese principal sustentada pelas intervenções no navegador é o custo combinado dos efeitos visuais: atmosfera animada, vidro/refração e composição durante a rolagem. O laboratório reproduziu intervalos longos entre callbacks de animação na home publicada. Reduzir movimento e simplificar as lentes melhorou essas amostras.

Isso não identifica um único shader como causa exclusiva, não mede a experiência de todos os usuários e não constitui correção entregue. Uma segunda rodada variou bastante; retirar apenas WebGL não eliminou as pausas. A prioridade é reduzir o custo do conjunto, validando cada mudança no mesmo cenário.

## Escopo e método

- Home pública: https://temlinkaqui.com/. Inspeção inicial também confirmou a aplicação local em localhost:3000; as tabelas abaixo são da URL publicada.
- Playwright MCP, contextos novos e isolados, sem sessão pessoal; consentimento configurado como denied.
- Chromium Headless 153 no Windows. CPU com fator de lentidão 4; rede sem limitação artificial.
- Desktop: 1365 × 900, DPR 1. Mobile: 390 × 844, DPR 2, viewport/touch emulados.
- Em cada cenário: volta ao topo, espera de 350 ms, 12 eventos de roda de 240 px separados por 45 ms e cauda de 250 ms. Todos chegaram a scrollY 2880.
- Mobile recebeu os mesmos eventos de roda. Esta é uma comparação em viewport mobile, não reprodução de gesto de dedo, inércia ou barra dinâmica de um telefone real.
- Observadores de long tasks e intervalos de requestAnimationFrame; deltas de Performance.getMetrics por CDP na primeira rodada.
- Mesma página e mesmos cards dentro de cada dispositivo; ordem: padrão, movimento reduzido, sem lentes, ambos, padrão novamente.
- Instrumentação e estilos temporários existiram somente nos contextos de diagnóstico, encerrados ao final. Nenhuma alteração no site publicado.
- Uma navegação inicial esperando networkidle expirou em 30 s. As medições seguintes usaram DOM pronto e espera explícita pela busca; esse timeout isolado não diagnostica servidor lento.

Os intervalos de requestAnimationFrame são um indicador de disponibilidade para animação. Não são tempo entre frames efetivamente apresentados, FPS real, INP nem latência física do aparelho. O headless apresentou intervalos mínimos abaixo de 16,7 ms; por isso não converter estas amostras em FPS de tela ou percentual de melhoria. O tempo total de cada sequência também varia com o processamento dos comandos.

## Primeira rodada

| Cenário | Desktop p95 / maior intervalo | Desktop tarefas >50 ms | Mobile p95 / maior intervalo | Mobile tarefas >50 ms |
|---|---:|---:|---:|---:|
| Padrão | 200 / 211 ms | 17 | 33 / 67 ms | 1 |
| Movimento reduzido | 22 / 33 ms | 0 | 11 / 17 ms | 0 |
| Sem lentes/backdrop-filter | 39 / 83 ms | 1 | 11 / 28 ms | 0 |
| Movimento reduzido + sem lentes | 6 / 33 ms | 0 | 6 / 33 ms | 0 |
| Padrão, repetição | 167 / 245 ms | 11 | 22 / 56 ms | 1 |

p95 significa o intervalo abaixo do qual ficaram aproximadamente 95% das amostras daquela sequência; não é p75 de visitas ou dado de campo. As contagens de tarefas têm janelas de duração variável, não devem ser comparadas como taxas.

A página tinha 80 elementos LiquidLens no DOM em ambos os dispositivos; 73 estavam marcados como refrativos no desktop e 70 no mobile. A contagem inclui elementos fora da viewport e possivelmente ocultos; não significa que todos eram pintados a cada frame. Canvas observado: 1353 × 900 no desktop e 488 × 1055 no mobile.

No primeiro padrão desktop, os deltas somaram 2152 ms de TaskDuration, 160 ms de RecalcStyleDuration e 5 ms de LayoutDuration. Não somar essas categorias: elas se sobrepõem. O resultado não aponta uma grande recomposição de layout como explicação principal nessa amostra.

## Segunda rodada: isolar refração e WebGL

Outra sessão desktop, mesmas dimensões e CPU 4×; amostras independentes da primeira tabela.

| Cenário | p95 / maior intervalo | Tarefas >50 ms |
|---|---:|---:|
| Padrão | 50 / 83 ms | 0 |
| Vidro simples, sem filtro SVG | 28 / 83 ms | 2 |
| Padrão, repetição | 39 / 39 ms | 0 |
| Sem contexto WebGL, mantendo refração e animações CSS | 39 / 61 ms | 0 |

Vidro simples manteve blur de 0,65 px e saturação, retirando apenas a referência ao filtro SVG. Sem WebGL provocou perda de contexto somente naquela página isolada; o fallback visual foi ativado. A variabilidade impede prometer o ganho da primeira rodada como constante. Há indício de contribuição da refração, mas o WebGL isoladamente não explica todo o engasgo.

## Confirmação no código atual

- frontend/src/components/layout/site-shell.tsx: OndasAtmosphere aparece nas rotas comuns, incluindo home. Cabeçalho, rodapé e navegação também usam LiquidLens.
- frontend/src/components/layout/ondas-atmosphere.tsx: WaveCanvas recebe paused=false.
- frontend/src/components/layout/wave-canvas.tsx: desenho WebGL contínuo limitado a cerca de 30 desenhos/s; callbacks usam requestAnimationFrame. Há proteção de aba oculta, interseção, reduced-motion e perda de contexto, além de DPR limitado a 1,25. Portanto, já existem proteções e não há evidência de loop sem limpeza.
- frontend/src/components/layout/ondas-atmosphere.module.css: camadas fixas de viewport, linhas e luz em movimento. Movimento reduzido interrompe as animações CSS.
- frontend/src/components/ui/liquid-lens.tsx: cada instância pode criar filtro SVG com três feDisplacementMap e mistura de canais; usa ResizeObserver e luz acompanhando ponteiro. A textura tem cache de até 32 dimensões e resolução máxima de 320 px, portanto não cresce ilimitadamente por tamanho.
- frontend/src/components/ui/liquid-lens.module.css: backdrop-filter combina refração, blur e saturação. Isso atua sobre o conteúdo visual atrás da superfície.
- Em LiquidLens, hover:none/reduced-motion impedem o acompanhamento do ponteiro; não desativam por si só a refração. A condição para gerar o mapa considera transparência reduzida e suporte do navegador. É coerente com a refração observada no viewport mobile.
- frontend/src/components/domain/link-row.tsx: cards repetem LiquidLens.
- frontend/src/features/catalog/components/home-catalog-grid.tsx: mede altura no layout inicial e em ResizeObserver; não foi encontrado recálculo de todos os cards por um listener de scroll nesse componente.
- frontend/src/components/domain/catalog-image.tsx: imagens já usam carregamento lazy e decoding async. Não há base nesta análise para trocar o sistema de imagens ou reescrever o catálogo.
- frontend/src/features/catalog/components/home-catalog.tsx: persistência de scroll é espaçada em 500 ms e só escreve histórico após carregar páginas extras. Não explica automaticamente o primeiro scroll da lista inicial.
- Debounce de busca e recarregamento por links foram encontrados na triagem inicial, mas não explicam diretamente rolar uma página já aberta.

O grafo foi consultado antes da leitura detalhada, com 9520 nós, e as relações relevantes foram confirmadas na fonte. Os cinco arquivos estruturais consultados tinham mtime correspondente ao manifest; não foi necessário reconstruir o índice. CSS e comportamento real não são provados pelo grafo. O código local contém mudanças concorrentes; não foi confirmada equivalência integral com o commit publicado.

## Prioridade recomendada

1. Testar uma atmosfera estática ou congelada durante a rolagem, preservando a aparência da marca e o fallback. Validar a combinação de canvas e camadas CSS, sem culpar só o WebGL.
2. Testar vidro simples nos cards e controles repetidos, sem a separação RGB por filtro SVG. Comparar com o original antes de decidir quanto efeito manter.
3. Repetir o percurso em Chrome/Edge desktop, Android e Safari iOS físicos, registrando frames apresentados e trilha de renderização/composição. Testar também retorno ao topo, Mostrar mais e movimento reduzido.
4. Só investigar mudanças maiores de catálogo/virtualização se o custo continuar alto após separar os efeitos. A evidência atual não justifica essa reestruturação.

A meta de aceitação deve considerar pausas de rolagem, frames apresentados e tarefas longas no mesmo aparelho. Não usar apenas pontuação de Lighthouse ou INP para fechar este relato.

## Pesquisa técnica

- [web.dev — INP](https://web.dev/articles/inp): rolagem e hover não entram no cálculo de INP. Por isso uma página pode ter um problema de scroll que esse indicador não revela.
- [web.dev — animações de alto desempenho](https://web.dev/articles/animations-guide): fundamenta medir pintura/composição, verificar trabalho por frame e preferir propriedades de animação de custo menor.
- [web.dev — otimizar INP](https://web.dev/articles/optimize-inp): fundamenta separar laboratório e campo e investigar processamento/renderização com evidência.
- [Next.js 15 — useReportWebVitals](https://nextjs.org/docs/15/app/api-reference/functions/use-report-web-vitals): fonte para eventual medição de interações discretas; não substitui diagnóstico de rolagem. Nenhuma telemetria foi adicionada.
- Context7 foi consultado na triagem de navegação, usando docs v15.1.11 por não oferecer o patch local v15.5.28. Essas conclusões não foram usadas para atribuir o problema de scroll.
- A pesquisa encontrou um relato no Chromium sobre backdrop-filter junto de WebGL, mas a página exigiu login. Não foi tratado como bug confirmado, causa deste projeto ou prova de versão afetada.

## Evidências e limites

Dados numéricos em evidencias/2026-10-26-scroll-home/medicoes.json. Trechos exatos executados no navegador em primeira-rodada.js e isolamento-desktop.js.

Não houve alteração de código de aplicação, dependências, preços, permissões, rastreamento, commit, push ou deploy. Criados apenas este relatório e seus arquivos de evidência. Para desfazer a documentação, remover somente esses arquivos novos.

Não executados: build, lint, typecheck, regressão Playwright Test, perfil completo de GPU/compositor, Safari/Firefox, aparelho físico, medição de campo e teste com muitas páginas extras. O escopo é pesquisa e diagnóstico; não há correção implementada a validar. As métricas variam com a máquina, o headless, o conteúdo servido e carga concorrente.
