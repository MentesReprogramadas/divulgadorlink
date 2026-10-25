# Tem Link Aqui — novas direções de identidade

Propostas de 22/10/2026. Nome preservado: **Tem Link Aqui**. O wordmark explora a escrita **tem link aqui**. São propostas de marca; os arquivos do site não foram substituídos.

## Brief adotado

Plataforma brasileira de descoberta e divulgação de links, comunidades e páginas. Público: pessoas que procuram conteúdos e pessoas que publicam. Personalidade proposta: direta, acessível, confiável e conectada. A identidade não promete audiência, conversão nem análise humana obrigatória.

A instrução mais recente libera o redesenho e pede manter somente as cores. Por isso, T e losango deixam de ser restrições. Não foram introduzidas novas cores de marca. Acessibilidade de textos da apresentação usa neutros já existentes no projeto.

## Três direções

| Direção | Ideia | Melhor aplicação | Limite |
| --- | --- | --- | --- |
| **01 — Encontro, recomendada** | Duas formas abertas se conectam e compartilham uma passagem. | Marca principal, avatar, favicon e app. | Pode lembrar elos; depende do conjunto e do nome para construir reconhecimento. |
| **02 — Portal** | Uma abertura e um caminho complementar expressam acesso e descoberta. | Cabeçalhos e aplicações editoriais. | A leitura é abstrata; não explica literalmente links. |
| **03 — Aqui** | A inicial de “aqui” ganha uma saída própria. | Ícone de app e comunicação informal. | Monogramas de “a” são comuns; é a direção menos exclusiva. |

Mapa explorado: elo, passagem, destino, encontro, acesso, janela, ponte, atalho, ponto e conversa. Seleção por clareza, distinção, simplicidade, relevância e leitura pequena. Evitados: megafone de destaque, estrela de favoritos, ícone funcional de link, pin de mapa convencional, QR e mascote. Os símbolos são marca e não foram associados a ações ou destinos da navegação.

Pesquisa: biblioteca local da skill logo-design, categorias social-communication, link, diamond e interlocking. Referências de construção consultadas: Squarespace, Svelte, Hashnode, Tidal e Intercom; apenas estudo de geometria, redução e espaço negativo. Não são assets de entrega nem pesquisa de disponibilidade de marca. Refero não está disponível nesta sessão.

## Cores e fundos

| Cor | HEX | RGB | Uso |
| --- | --- | --- | --- |
| Navy | `#0A192F` | 10, 25, 47 | Base, wordmark em fundos claros, fundos de app. |
| Turquesa | `#4AF9EB` | 74, 249, 235 | Parte complementar do símbolo e acento em fundos navy. |
| Branco | `#FFFFFF` | 255, 255, 255 | Reversão da parte navy em fundos escuros. |

Em superfícies claras, o turquesa tem contraste baixo: para ícones muito pequenos, usar `favicon-claro.svg`, em navy. Em superfícies escuras, usar a versão branca/turquesa. `favicon.svg` responde a `prefers-color-scheme`. Para reprodução em uma tinta, usar preto ou branco. Os dois segmentos do Encontro encostam intencionalmente; em monocromia tornam-se uma forma contínua.

Não especificamos equivalência Pantone. CMYK exige perfil e prova: o turquesa de tela pode perder saturação na impressão.

## Tipografia

Nova composição em minúsculas, desenhada a partir da **Segoe UI Bold instalada no Windows**, exportada para caminhos. Os SVGs não precisam da fonte instalada e nenhum arquivo de fonte foi redistribuído. A proposta tipográfica ainda pode receber ajustes proprietários após a escolha da direção. Verificar as condições da licença aplicável antes de redistribuir fontes ou contratar usos diferentes; esta entrega não inclui uma licença de fonte.

## Uso

- Reserva ao redor: pelo menos 32 unidades do símbolo em canvas de 256; aproximadamente 1/8 de sua altura.
- Mínimos digitais propostos: símbolo 16 px; horizontal 200 px; vertical 160 px. Para a assinatura com nome, preferir larguras maiores e conferir no contexto final.
- Não esticar, inclinar, recolorir, acrescentar sombra ou usar o horizontal como favicon.
- Em fotos, aplicar um fundo sólido navy ou branco para separar a marca.
- Avatar permite recorte circular; ícones de app sem cantos transparentes são fornecidos separadamente da versão ilustrativa arredondada.
- Arquivo `maskable-512.png`: símbolo reduzido e fundo sólido para recortes automáticos.

## Arquivos por direção

- Logos horizontal/vertical: cor, escuro, preto e branco; SVG e PNG principais com transparência.
- Wordmark isolado e símbolo; versões monocromáticas e avatar.
- Favicon SVG adaptativo, alternativas clara/escura, PNG 16/32/48 e ICO com três resoluções.
- Apple Touch 180, ícones 192/512, maskable 512 e avatar 1024.
- Capa social 1200 × 630, SVG e PNG.
- `site.webmanifest` com caminhos relativos e `head-snippet.html` para adaptar na integração.

Abrir `index.html` para comparar. O ZIP reúne os arquivos. Nenhum manifest foi conectado ao site, e a existência desses arquivos não instala uma PWA nem substitui as configurações do Next.js.

## Instalação, reprodução e reversão

Skill de origem: https://github.com/kaankiziltug/logo-design-skill/tree/main/skills/logo-design. Instalada em `C:/Users/ferna/.codex/skills/logo-design` pelo Skill Installer. A descoberta automática ocorre a partir do próximo turno.

Na raiz do projeto, executar `branding/tem-link-aqui-2026-10-22/outline-wordmark.ps1` e depois `python branding/tem-link-aqui-2026-10-22/build-kit.py --new-direction`. Usa a biblioteca padrão, ferramentas da skill, Windows para contornos e Sharp já instalado no frontend. Não instala dependências nem envia código do projeto para serviços externos.

Reversão: remover somente a pasta de propostas `branding/tem-link-aqui-2026-10-22`. Para desinstalar a skill, remover apenas sua pasta `C:/Users/ferna/.codex/skills/logo-design`. Preservar alterações de outras tarefas. Não houve branch, commit, push ou deploy.
