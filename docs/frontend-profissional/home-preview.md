# Home e detalhes — prévia Liquid Glass

22/10/2026. Demonstração isolada para decidir a apresentação do catálogo Tem Link Aqui. Substitui o UI Lab rejeitado. A rota, os componentes e os SVGs do laboratório anterior foram removidos; `/dev/ui-lab` retorna 404. Capturas antigas e cópias descartáveis em `output/` são evidência histórica, não código ativo.

Exploração posterior: [galeria com doze novas direções](home-directions.md), em `/dev/homes`. Esta Liquid Glass permanece disponível para comparação.

## Abrir

No pacote `frontend`, executar `npm run dev -- --hostname 127.0.0.1 --port 3012`, com `TEMLINK_E2E_BUILD=1` para separar o cache de outra instância de desenvolvimento. Abrir [home](http://127.0.0.1:3012/dev/home-preview) e [detalhe](http://127.0.0.1:3012/dev/home-preview/link/fora-do-roteiro). Não encerrar processos para liberar uma porta ocupada.

As três rotas aceitam somente `NODE_ENV=development`: home, detalhe e fotos. Metadados noindex/nofollow; sem entrada no sitemap. O bloqueio de produção é validado em teste unitário; não houve teste HTTP de um servidor de produção nesta etapa.

## Auditoria e direção

O catálogo existente usa Next 15.5.26, React 19, TypeScript, CSS Modules, Base UI e ícones próprios. `SiteShell` mantém o cabeçalho e rodapé compartilhados. Outfit/Source Sans 3 e as cores `#0a192f`/`#4af9eb` permanecem. Não foram adicionados Motion, GSAP, Three, Tailwind ou shadcn; dependências e lockfiles não foram alterados por esta implementação.

A home pública usa `LinkRow`, descoberta por nicho/rede e contratos de impressões/publicidade. O detalhe real tem verificação de idade e caminho de saída rastreado. Esta hipótese visual não substitui esses contratos. Foto anexada ao link é uma proposta de apresentação; não implementa upload nem muda o esquema de dados.

A [pesquisa das nove fontes](home-glass-research.md) registra técnicas, licenças, dependências e limites. A composição prioriza busca, fotos, nichos e patrocinados, com atmosfera navy/turquesa, bordas de vidro e reflexo discreto no ponteiro. Não usa efeitos que dificultem ler os links.

## Arquitetura e inventário

- `app/dev/home-preview`: páginas e validação no servidor; handler das fotos com allowlist fixa. `notFound` para slugs inexistentes e ambiente não autorizado.
- `features/home-preview/preview-data.ts`: fixtures tipados, filtros puros e URLs das nove fotos.
- `home-preview.tsx`: busca, assuntos, rede, ordenação e favoritos. Estado de filtros na URL, sem consulta a dados de clientes.
- `glass-link-card.tsx`: anatomia comum e variante patrocinada; imagem, metadados, título, resumo, favorito e navegação independentes.
- `preview-frame.tsx`: atmosfera, SVG de refração, controle de movimento e indicação da demo.
- `preview-link-detail.tsx`: composição de imagem, informações completas, ações ilustrativas e relacionados.
- `use-preview-favorites.ts`: armazenamento local exclusivo, parse defensivo e sincronização entre telas/abas. Não usa a API de favoritos real.

As páginas são compostas no servidor e pré-renderizam seu conteúdo; os componentes interativos usam cliente. Não há canvas, loop JavaScript de animação nem provider global adicional. CSS fica nos dois módulos locais; filtros reutilizam o Select existente. O único ajuste em componente compartilhado é a exclusão exata de `/dev/home-preview` e descendentes em `SiteVisits`, para não registrar visitas fictícias. `/` continua contando normalmente, coberto por teste.

## Catálogo inicial de 15 peças

Peças de composição desta demo, não quinze pacotes ou APIs novos. Todas são compatíveis com Next 15/React 19/TS. Implementação própria: referências abaixo fundamentam a técnica visual; nenhuma fonte externa foi copiada. Licença de redistribuição do projeto não é definida por este documento. Para copiar futuramente código de bibliotecas, conferir a matriz de licenças da pesquisa. “Baixo/médio” indica custo relativo estimado, não medição de GPU.

| Peça / categoria | Referência | Técnica e dependências | Integração / custo | Mobile, acessibilidade e movimento |
| --- | --- | --- | --- | --- |
| Atmosfera oceano / fundo | [Fancy](https://www.fancycomponents.dev/docs/components/background/animated-gradient-svg), [Kokonut](https://kokonutui.com/docs/backgrounds/caustics-background) | CSS/SVG próprios; sem WebGL | Baixa / médio em GPU | Decorativo; movimento desligado por preferência e botão |
| Lente refrativa / material | [React Bits](https://reactbits.dev/components/glass-surface) | SVG displacement + CSS `@supports` | Média / médio | Fallback tint/frosted; texto fora da lente |
| Card de catálogo / conteúdo | [Nyx](https://nyxui.com/components/apple-glass-effect) | CSS + React + Link existentes | Baixa / médio pelo blur | Uma coluna no celular; títulos e descrições completos no detalhe |
| Card patrocinado / destaque | [Aceternity](https://ui.aceternity.com/components/glare-card) | Variante do mesmo card, CSS | Baixa / médio | Rolagem manual no celular; rótulo Patrocinado persistente |
| Reflexo e inclinação / microinteração | [Magic Card](https://magicui.design/docs/components/magic-card), [Tilted Card](https://reactbits.dev/components/tilted-card) | PointerEvent + propriedades CSS | Baixa / baixo, ativo só no ponteiro | Desligado no toque, reduced-motion e pausa; sem informação exclusiva do hover |
| Busca vítrea / descoberta | [21st](https://21st.dev/@designali-in/components/liquid-glass-button) | Formulário, CSS, URLSearchParams | Baixa / baixo | Label, Enter, ação explícita e foco visível |
| Assuntos / navegação | Padrões do catálogo existente | Botões, CSS e nicheIcon | Baixa / baixo | `aria-pressed`; rolagem manual e teclado |
| Rede e ordenação / filtros | Select interno | Base UI já instalado | Baixa / baixo | Combobox com teclado e nome acessível |
| Estrela de favorito / ação | Contrato interno de ícones | React, storage e ActionIcon | Baixa / baixo | Nome contextual, `aria-pressed`, falha de storage anunciada |
| Marca de rede / metadado | networkLogo interno | Imagens locais e texto | Baixa / baixo | Texto identifica a rede; imagem decorativa |
| Olho e contagem / metadado | Contrato interno de ícones | Intl.NumberFormat e ActionIcon | Baixa / baixo | Nome acessível com valor integral e natureza ilustrativa |
| Foto e fallback / mídia | [Unsplash](https://unsplash.com/documentation#supported-parameters) | img + handler fixo; nenhum SDK | Baixa / médio, bytes de foto | Dimensões reservadas, alt, lazy nas secundárias; fallback até em erro anterior à hidratação |
| Painel do detalhe / conteúdo | [Motion Primitives](https://motion-primitives.com/docs/morphing-dialog), [Codrops](https://tympanus.net/codrops/2026/10/21/atelier-ui-webgl-dom/) | Página com URL, CSS grid | Baixa / baixo | Descrição integral, layout empilhado e retorno ao catálogo |
| Ficha e utilidades / informação | Padrões internos | dl, botões e Clipboard API | Baixa / baixo | Copiar tem erro anunciado; denúncia explicitamente ilustrativa |
| Relacionados / descoberta | Mesmo GlassLinkCard | Composição, sem dependência nova | Baixa / médio pelas fotos | Mesma semântica e anatomia do catálogo |

## Imagens e interações

Nove URLs fixas do serviço de transformação de imagens Unsplash/Imgix, com tamanho/crop/qualidade. Não há integração autenticada com a API Search nem chave. As URLs exatas e os arquivos usados nos testes estão em `frontend/e2e/fixtures/home-preview/sources.json`; as nove respostas externas foram 200 no preparo. Licença das fotos: [Unsplash](https://unsplash.com/license).

O navegador pede a foto à rota local; o servidor aceita apenas chaves conhecidas, não segue redirects e valida resposta/tipo. Timeout de 10 segundos e cache de um dia. Falha mostra um bloco de imagem indisponível com tamanho reservado. Nenhuma URL enviada pelo visitante é buscada pelo proxy.

São três patrocinados e seis links orgânicos. Busca ignora acentos; filtros combinam assunto, rede e favoritos. Ordenação opcional por contagem fictícia. Títulos têm até duas linhas; resumos normais duas e patrocinados uma. O detalhe mostra o conteúdo completo. Salvar funciona localmente; acesso e denúncia mostram confirmação da simulação e não abrem destinos reais nem enviam registros.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Passou |
| `npm run typecheck` | Passou, incluindo tipos E2E |
| `npm test` | 161 arquivos, 559 testes passaram |
| `npx playwright test --config playwright.home-preview.config.ts` | 8 testes passaram, Chromium desktop 1440×1000 e mobile 390×844 |
| Comparação visual após revisão | 2 testes passaram com 4 comparações `toHaveScreenshot` de home/detalhe desktop/mobile |
| Smoke HTTP real, sem interceptação de imagens | Home 200/noindex e foto mountains 200/image/jpeg, 346.147 bytes |
| Smoke Chromium com fotos reais | 9/9 fotos carregadas; zero erros JavaScript e zero escritas BFF; suporte a backdrop-filter confirmado |
| Home/detalhe, fotos, favoritos e filtros | Passaram, inclusive busca sem acentos, filtro combinado vazio e persistência após reload |
| Falha da foto e rotas inválidas | Passaram, inclusive laboratório removido com 404 |
| Axe WCAG A/AA na área nova | Nenhuma violação automática detectada em home e detalhe, nos dois viewports |
| Teclado/foco, movimento e reflow | Tab até ação de busca, foco visível, pausa, reduced-motion; sem overflow de página a 320/768/1280 e zoom CSS 200% |
| `npm run build` | Passou em cópia isolada `output/home-preview-validation/frontend`, mesmas fontes/config/dependências, sem interromper o servidor existente |

Build: 4,47 kB de rota/171 kB First Load JS para a home; detalhe 1,97/119 kB. A home real no mesmo build registra 5,26/178 kB; isso não é comparação de LCP/INP nem prova de ganho. As rotas da demo são listadas no build, mas negam renderização em produção. Avisos existentes de workspace/lockfiles, plugin ESLint Next e CSS `start/end` fora desta fatia foram preservados.

Capturas e baselines revisadas no Windows/Chromium: `frontend/e2e/home-preview-snapshots/home-desktop/` e `home-mobile/`, arquivos `home.png` e `detail.png`. O ícone de ferramentas do Next é ocultado somente nos testes. Sem máscara de conteúdo novo e sem aumentar tolerância para esconder diferenças. A revisão é técnica, não aprovação estética do usuário ou baseline Linux de CI.

Os testes usam fotos locais determinísticas e interceptam BFF; não iniciam PostgreSQL/Redis, não enviam analytics, cobrança, mensagens ou denúncias reais. Não validam a jornada backend de publicação/destaque, pois ela não foi alterada.

## Limites e reversão

Não houve Safari/Firefox, leitor de tela, aparelho físico, GPU mobile, métricas de campo ou auditoria completa de contraste em cada quadro animado. Blur/refração variam por navegador. Sem teste HTTP de produção; a guarda foi testada por unidade. As fotos dependem do serviço externo quando a demo está aberta fora dos testes. Antes de promover este desenho à home pública, decidir uploads, estados reais, política de mídia e ligação aos contratos existentes.

Para reverter somente esta proposta, remover rotas/feature/config/testes/fixtures/baselines de `home-preview` e retirar a condição específica de demo e seu teste em `SiteVisits`. Não usar reset global: a árvore compartilhada contém alterações anteriores de outras tarefas. Nenhum commit, push ou deploy foi feito.
