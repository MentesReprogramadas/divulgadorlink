# Ondas: fotografia separada do conteúdo — 23/10/2026

Registro histórico. Estado atual: [Ondas: marca, busca e catálogo](ondas-brand-search.md).

Pedido: imagem em cima, texto embaixo; não cobrir o anexo do publicador. Ampliar Liquid Glass nos componentes, animar o fundo e manter detalhes no mesmo padrão. Este pedido substitui a sobreposição de fotos/texto documentada anteriormente.

## Escopo

Somente `/dev/homes/ondas` e detalhes. Preservados cabeçalho compartilhado, identidade, nove dados fictícios, ações locais, patrocinado, contratos e demais homes. Sem dependências, lockfiles, CSS global ou regras comerciais alterados.

## Implementação

- Card: foto isolada primeiro; categoria, patrocinado, favorito, título, descrição truncada e views em painel abaixo. Nenhum texto ou controle na foto.
- Coleções usam o mesmo princípio; o hero fotográfico intermediário foi substituído pela composição ampla de Galeria, sem card patrocinado. Após o pedido seguinte, detalhes preservam a imagem inteira com `object-fit: contain`, foto e resumo lado a lado no desktop, descrição/ficha abaixo; mobile empilhado.
- Lente SVG existente aplicada também a nichos, redes, filtros, botões, barra de demonstração, rodapé, coleção, publicação e informações. Botões claros preservam contraste no fallback opaco.
- Fundo fixo com novo shader local de forma toroidal 3D deformada, normais e reflexos, reaproveitando o renderer WebGL existente. Corrente luminosa CSS de 24s oferece movimento alternativo sem GPU. O shader usa até 36 passos, buffer de cerca de 1 milhão de pixels e desenho limitado a 30fps; são limites de implementação, não benchmark. Recorte local impede pintar sobre o cabeçalho. Pausa/reduced-motion cobrem CSS, shader e resposta ao ponteiro; fallback CSS funciona sem WebGL.

## Referências do ajuste final

A opção local Galeria foi aberta e capturada em `output/ondas-glass-evidence/gallery-reference-current.png`: hero amplo, título e busca dominantes, sem peça promocional. Foram consultados [React Bits Iridescence](https://reactbits.dev/backgrounds/iridescence), [Ballpit](https://reactbits.dev/backgrounds/ballpit) e [Aceternity 3D Card](https://ui.aceternity.com/components/3d-card-effect) para superfície fluida, profundidade e perspectiva. Context7 forneceu documentação de ciclo de vida, visibilidade e limpeza dos backgrounds React Bits. A página Tilt de Motion Primitives respondeu403 e não foi usada como evidência. Não se instalou nem copiou uma dessas implementações: GLSL local, sem Three.js, OGL ou motor físico adicional.

## Evidência e limites

Em validação. Capturas determinísticas em `.impeccable/review/ondas-final/`, incluindo viewport real 928×884. Fundo fixo é avaliado também com capturas roladas; imagem full page sozinha não prova seu estado em cada posição. Teste de geometria verifica conteúdo abaixo de cada foto em diferentes larguras; teste de movimento verifica avanço do tempo, pausa, retomada e reduced-motion.

Refração SVG segue restrita a Chromium. Safari/Firefox recebem vidro fosco; não há benchmark físico. O runtime copiado na porta 3013 é uma demonstração sem API4098 ativa; limite anterior de consentimento remoto permanece. Reversão somente nos arquivos da feature e baselines afetadas; preservar outras alterações do working tree.
