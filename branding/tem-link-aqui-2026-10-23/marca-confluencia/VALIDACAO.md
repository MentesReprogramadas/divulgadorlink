# Validação — Tem Link Aqui / Confluência

Data: 23/10/2026. Conceito 19 escolhido explicitamente pelo usuário. Branch verificada: codex/roadmap-f37-testes, já ativa no início da aplicação ao site. Alterações existentes preservadas; sem commit, push ou deploy.

## Escopo entregue

Logos horizontal, vertical, símbolo e assinatura sem símbolo, em seis tratamentos de cor. SVGs e PNGs transparentes; versões com branco/navy/turquesa aplicados. Favicons SVG adaptativo, fixos e ICOs claro/escuro; PNGs em sete tamanhos; Apple Touch, app, avatar e maskable. Post, story, capas de compartilhamento/LinkedIn/YouTube, padrões e artes físicas. Quatro PDFs de logo e manual de seis páginas. Guia, paletas JSON/CSS/GPL, licença da fonte e proveniência acompanham o inventário.

O mockup foi gerado com ImageGen nativo a partir da identidade e editado para usar branco/turquesa sobre a camiseta navy. Prompt completo incluído. Originais da ferramenta preservados; cópias de trabalho no projeto. Nenhuma mercadoria foi encomendada.

## Verificações executadas

- Frontend: npm run lint e npm run typecheck passaram após a alteração final.
- Vitest: 7 arquivos / 36 testes passaram, incluindo SiteShell, navegação, ícones, OverlayDialog e lógica do kit de divulgação.
- npm run build passou com Next 15.5.26, incluindo rotas dos novos ícones. Permanecem avisos de múltiplos lockfiles, plugin Next do ESLint e alinhamentos start/end em CSS anterior à mudança. Não foram alterados lockfiles, dependências nem essas áreas alheias.
- E2E real: sete testes de share-kit passaram, com geração/download do PNG e decodificação do QR. Após os ajustes do novo teste, a rodada final do catálogo passou 5/5 (setup e quatro testes de advertise), incluindo home, /divulgar, /cadastro, 390/1440 px, navegação para /, menu/teclado, ausência de overflow, assets e metadados de ícones e tinta do favicon em light/dark.
- As primeiras rodadas do novo E2E encontraram dois problemas: DNS de *.localhost no request Node e prioridade do PNG sobre SVG de mesmo nome-base. O teste de requests agora usa loopback com Host explícito; o produto usa icon1.svg junto de icon.png para ambos constarem do HTML. Ambos os pontos foram verificados na rodada final aprovada.
- Galeria/biblioteca: 7/7 testes passaram. Comparação em 320/390/768/1440 px, ampliações, downloads, foco, Escape, zoom CSS 200%, reduced-motion e favicon. Biblioteca oficial: 24 variantes, arquivos locais existentes e imagens decodificadas, 390/1440 px e Axe sem violações detectadas nos critérios WCAG2 A/AA e 2.1 AA testados.
- Playwright MCP em contexto próprio: inspeção HTTP da biblioteca oficial e da landing real de teste, navegação por teclado e capturas desktop/mobile. Capturas da biblioteca, landing e cadastro abertas para inspeção. A nova logo está legível no cabeçalho de desktop e celular. No cadastro mobile a captura também registra o final da transição de fechamento do menu; as asserções de overflow são executadas antes dessa transição.
- Geração: SVGs auditados contra texto vivo, imagens embutidas, máscaras e filtros; logos são contornos. Tamanhos de PNG e densidade de exportação conferidos. Arte física exportada em 300 ppi. Quatro PDFs de logo sem XObject de imagem raster. Manual com seis páginas, fontes/imagens carregadas e sem overflow.
- Integridade: inventário SHA-256 por arquivo e teste de integridade do ZIP. O inventário não lista a si próprio nem o ZIP para evitar dependência circular.

## Aplicação no site

frontend/public/logo.svg é a assinatura canônica de cabeçalho, menu e renderShareKit. public/brand/confluencia/ contém alternativas e ícones. App Router: icon.png, icon1.svg, favicon.ico, apple-icon.png. SiteShell ajusta altura para 40 px desktop e 32 px mobile; logo no menu 172×32. PersonalPageBrand usa assinatura sem símbolo em 90 px para leitura no rodapé; reversão existente em páginas escuras preservada.

Nome do produto, paleta, navegação/URLs, SEO textual, tema claro, fontes de interface, consentimento, contratos, preços, elegibilidade e regras de negócio foram preservados. Os assets dark não criam um tema novo no produto. Manifest fornecido somente como referência, sem integração de PWA.

A documentação técnica consultada por Context7 foi Next v15.1.11, mesma major da instalação 15.5.26; o comportamento de metadados foi confirmado no build e no navegador reais, inclusive a necessidade do sufixo numérico.

## Ambiente e limites

E2E usou containers próprios marca19-20261023-1320 e offset de portas 15000. Foram removidos pelo teardown; portas de teste e containers conferidos ao final. O serviço alheio na porta 3000 foi preservado. Banco de produção e contas de terceiros não foram usados.

Sem aparelho físico, leitor de tela real, testes com público, pesquisa de registro, prova CMYK/Pantone ou peça fabricada. Bordado não inclui DST/PES. As dimensões de impressão são estudos sujeitos ao gabarito do fornecedor. Axe/testes não certificam acessibilidade total. Mockup pode variar do vetor; usar SVG/PDF de logo como fonte de arte.

## Arquivos e reversão

Além dos assets, foram alteradas somente as linhas de apresentação de marca em site-shell.module.css, overlay-dialog.tsx, personal-page-brand.tsx e personal-page.module.css, mais os testes de advertise e a documentação. Esses arquivos já podiam conter alterações do usuário: não reverter o arquivo inteiro.

A marca anterior está preservada em arquivo-direcoes-anteriores/site-logo-anterior.svg e site-icon-anterior.png. Para reverter esta etapa, restaurar esses dois assets; remover somente icon1.svg, favicon.ico, apple-icon.png e public/brand/confluencia criados aqui; voltar as dimensões de logo do cabeçalho para 30/24 px, menu para 140×26 e rodapé para /logo.svg em 66×12. Preservar traduções, permissões e demais mudanças locais. Não foi executado reset/revert automático.

Grafo consultado antes do código e atualizado incrementalmente, sem LLM/API ou clustering. Estado final: 7324 nós, 25566 relações. Inclui outras alterações da árvore compartilhada. CSS/assets não têm cobertura estrutural; advertise.spec.ts não produziu símbolos no parser. Código, build e testes são a evidência de execução.
