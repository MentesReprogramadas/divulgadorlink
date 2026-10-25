"""Assemble the presentation and printable brandbook from the exported identity registry."""
from pathlib import Path
import json
import html
import hashlib

BASE = Path(__file__).resolve().parent
directions = json.loads((BASE/'direcoes.json').read_text(encoding='utf-8'))
(BASE/'direcoes.js').write_text('window.BRAND_DIRECTIONS = '+json.dumps(directions,ensure_ascii=False)+';\n',encoding='utf-8')
provenance=[]
for d in directions:
    image=BASE/d['id']/'mockup.png'
    provenance.append({'direction':d['name'],'file':str(image.relative_to(BASE)).replace('\\','/'),'method':'OpenAI built-in ImageGen; identity reference image supplied; photorealistic concept mockup, not a real photograph of manufactured products','reference':d['id']+'/referencia.png','sha256':hashlib.sha256(image.read_bytes()).hexdigest(),'derivative':d['id']+'/mockup.webp','derivative_method':'Sharp WebP quality 90, original dimensions preserved','date':'2026-10-23','prompt_file':d['id']+'/PROMPT-MOCKUP.txt','content':'Navy/white cotton t-shirts, embroidered cap, hoodie, canvas tote, ceramic mug, business cards, notebook and sticker. Exact vector identity is source of truth.'})
(BASE/'proveniencia.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2),encoding='utf-8')

research='''# Pesquisa e decisões — 23/10/2026

Pesquisa na internet, seguida de estudo da biblioteca local logo-design e construção de vetores próprios. Nenhuma referência foi copiada ou usada como mercadoria do Tem Link Aqui.

| Fonte | O que fundamentou | Aplicação nesta entrega |
| --- | --- | --- |
| [Pentagram — Raylo](https://www.pentagram.com/work/raylo) | Um motivo simples sustenta padrões, embalagem, digital e merchandise com intensidades diferentes. | Cada direção tem um padrão derivado; pequeno símbolo no peito, presença maior nas costas e ecobag. Não adotar o switch, as cores ou a fonte da Raylo. |
| [Pentagram — Slack](https://www.pentagram.com/work/slack) | Geometria simples, escala e módulos extraídos do símbolo para uma linguagem consistente. | Confrontar símbolo, favicon, uma tinta e aplicação grande; padrões usam módulos da própria direção. Não usar octothorpe, balões ou paleta do Slack. |
| [Gelato — embroidery design guidelines](https://support.gelato.com/en/articles/8996221-embroidery-design-guidelines) | Para bordado padrão, recomenda altura mínima de texto de 6,4 mm e espessura de 1,3 mm; recomenda formas sólidas e simples. | Bordado pequeno usa símbolo sem o wordmark. O vetor não é arquivo de pontos: digitalização e amostra continuam a cargo do fornecedor. As medidas são orientação desse fornecedor, não padrão universal. |
| [MOO — bleed / crop marks](https://support.moo.com/hc/en-gb/articles/360035605571-Removing-crop-marks) | Sangria e área segura dependem do produto; marcas de corte podem não ser solicitadas. | Cartão ilustrativo de 90×50 mm com 3 mm de sangria; conferir gabarito do fabricante antes de imprimir. Não incluir marcas de corte como regra universal. |
| [Mozilla — a rebrand and a call to action](https://www.mozilla.org/en-US/foundation/annualreport/2024/article/a-rebrand-and-a-call-to-action-reclaim-the-internet/) | Uma identidade unifica símbolo, tipografia, narrativa e produtos em torno de uma ideia. | Documentar voz, aplicações e regras do sistema, além de entregar logos. Não importar nome, missão, cores ou emblemas Mozilla. |
| [Google Fonts — Outfit](https://github.com/google/fonts/tree/main/ofl/outfit) | Fonte variável distribuída sob SIL Open Font License. | Apresentação com arquivo local e licença em assets/OFL-Outfit.txt; o wordmark permanece em contornos. |

Os estudos de Pentagram foram consultados em seus textos oficiais. Imagens externas de referência retornaram 403; não as descrevemos como fotografias inspecionadas. As imagens de aplicação desta entrega foram geradas a partir dos vetores e inspecionadas localmente. Refero não apareceu entre as ferramentas disponíveis. Não houve compra de mockup, assinatura, estoque, produção física ou contratação de fornecedor.

Direção de galeria: Taste `uneven-photographs`, com aplicações em tamanhos e posições diferentes. A galeria é código próprio, sem novas bibliotecas. O contexto de produto de Impeccable e as orientações de Emil foram usados para hierarquia, foco, toque e reduced-motion. Nenhuma preferência da galeria foi consolidada nos tokens da home.
'''
(BASE/'PESQUISA.md').write_text(research,encoding='utf-8')
guide='''# Tem Link Aqui — branding em três direções

Estudo de 23/10/2026. **Nexo, TLA e Confluência** são alternativas da mesma marca. Não usar as três identidades simultaneamente no produto como se fossem submarcas. A galeria permite compará-las; nenhuma foi aplicada ao site.

## Estratégia e voz

Tem Link Aqui é um catálogo brasileiro de links, comunidades e conteúdos. A identidade convida a descobrir um interesse e aproxima quem procura de quem publica. Personalidade comum: direta, curiosa, acessível e confiável.

Mensagem base: **Encontre seu próximo interesse.** As frases das peças são propostas de comunicação, não promessas de audiência. Publicar é grátis; destaque é publicidade paga conforme elegibilidade do backend. A marca não representa nem garante o conteúdo de cada link.

Tom: português simples, convites concretos e sem superlativos vazios. Preferir “Explore por assunto”, “Conheça a comunidade” e “Compartilhe seu link”. Evitar prometer vendas, alcance garantido ou análise humana obrigatória. Falar com visitantes e publicadores conforme o objetivo de cada jornada.

## Identidade visual

| Papel | Especificação |
| --- | --- |
| Navy | HEX #0A192F; RGB 10,25,47. Base e texto em superfícies claras. |
| Turquesa | HEX #4AF9EB; RGB 74,249,235. Acento e campo de marca. |
| Branco | HEX #FFFFFF; reversão e respiro. |
| Wordmark | Lettering geométrico próprio em contornos, refinado dos conceitos 01/09/19. Sem dependência de fonte. |
| Apresentação | Outfit variável, arquivo local e SIL OFL incluída. |
| Espaço de proteção | Pelo menos 1/8 do canvas do símbolo ao redor da área ocupada. |
| Mínimos digitais propostos | Símbolo 16 px; horizontal 220 px; abaixo disso, preferir símbolo. |
| Fotografia | Objetos reais ou mockups identificados, luz natural, materiais navy/branco; o símbolo deve ser aplicado fisicamente, não flutuar na imagem. |

Turquesa sobre branco tem baixo contraste; em favicons claros usar navy monocromático. Versões sobre navy usam branco e turquesa. Não depender apenas da cor para distinguir partes importantes. Símbolos em uma tinta funcionam como uma silhueta contínua; conferir cada arquivo antes de produzir.

Não esticar nem girar a marca, não adicionar efeitos ao arquivo mestre, não trocar a proporção símbolo/nome. É permitido usar partes ampliadas como padrão, com o logo completo legível em outra posição da peça. As paletas de bordado/tinta não correspondem necessariamente ao RGB: confirmar amostra. Não foi atribuída equivalência Pantone nem conversão CMYK sem perfil de impressão.

## Aplicações

- **Camisa:** símbolo pequeno no peito; assinatura vertical maior nas costas. Artes de 35 mm e largura de 280 mm são estudos de aplicação. O canvas do símbolo inclui margem, portanto o desenho ocupa menos que a medida do canvas.
- **Boné/moletom:** símbolo, preferencialmente bordado; usar uma tinta quando as separações ficarem frágeis. Os mockups mostram intenção de posição e acabamento; não são medidas de modelagem.
- **Ecobag:** símbolo e nome em área central; arte ilustrativa de 240×240 mm. Conferir costuras e área imprimível.
- **Caneca:** arte de 200×85 mm como estudo de faixa; ajustar alça, revestimento e zona térmica ao produto escolhido.
- **Adesivo:** desenho circular de 60 mm; sangria, faca e tolerância são do fornecedor.
- **Cartão:** formato proposto 90×50 mm, com sangria ilustrativa de 3 mm, total 96×56 mm. Não inclui contatos fictícios. Confirmar medidas e perfil de cor com a gráfica.
- **Digital:** favicon adaptativo, ICO 16/32/48, Apple Touch 180, ícones 192/512, maskable 512, avatar 1024; post 1080×1080, story 1080×1920, capa 1200×630. O manifest não foi integrado ao produto.
- **Padrões:** repetição modular derivada de cada símbolo, para fundos, papel de seda e embalagem. Não distorcer o símbolo para preencher a superfície.

## Impressão e bordado

Artes `print/` são vetores em RGB com tamanho físico, **não arquivos homologados para fabricação**. Peito/bordado usa formas sólidas e sem texto pequeno. Como referência de fornecedor, Gelato recomenda texto de pelo menos 6,4 mm e traços de 1,3 mm para bordado padrão. Conferir também espaço negativo, tecido, linha, área de costura e amostra. Arquivos DST/PES e contagem de pontos não foram produzidos.

O PDF é um manual de apresentação. Não imprimir o mockup como estampa: usar os SVGs exatos. Solicitar prova de cor e gabarito antes de qualquer lote; nenhum pedido foi enviado a fabricantes.

## Pastas e uso

Cada direção possui `logo/`, `digital/`, `print/`, `social/`, `sistema/`, `referencia.png`, `mockup.png` e `mockup.webp`. A arte exata é o vetor. Mockups são simulações por IA, com possíveis diferenças de acabamento, geometria, posição e cor. Origem e hashes em `proveniencia.json`.

Abrir index.html para comparar. Há um ZIP por direção e um completo. O PDF reúne estratégia, todas as alternativas, aplicações e notas técnicas. As três propostas anteriores continuam na pasta de 22/10/2026.

## Reversão e limites

Não houve mudança no código, preços, moderação, permissões, analytics ou assets em uso no site. Sem branch, commit, push ou deploy. A reversão dos materiais desta etapa consiste em remover apenas `branding/tem-link-aqui-2026-10-23` e o registro de estratégia `.impeccable/surfaces/branding-showroom.md`.

Não houve pesquisa jurídica de marca, teste com usuários, amostra fabricada ou prova CMYK/Pantone. São alternativas para avaliação, não certificação de originalidade ou de viabilidade industrial. Referências e verificações em PESQUISA.md e VALIDACAO.md.
'''
(BASE/'GUIA-DA-MARCA.md').write_text(guide,encoding='utf-8')

def image(src,alt,cls=''):
    return f'<img class="{cls}" src="{src}" alt="{html.escape(alt)}">'

pages=[]
pages.append('<section class="page cover"><h1>Tem Link Aqui</h1><p>Identidade, presença e possibilidades.</p>'+image('nexo/mockup.webp','Aplicações físicas da proposta Nexo','cover-image')+'<div class="bottom">Três direções selecionadas de branding · 23/10/2026<br>Estudo conceitual para comparação — não aplicado ao produto.</div></section>')
pages.append('''<section class="page"><h2>A ideia antes da forma.</h2><div class="columns"><div><h3>Um ponto de encontro por interesse.</h3><p>O catálogo aproxima quem procura de quem publica. A identidade precisa acolher muitos assuntos sem parecer a marca de uma única comunidade.</p><h3>Como falar</h3><p>Direto, próximo e curioso. Convidar a explorar, compartilhar e conhecer. Frases das peças são propostas de comunicação.</p><p>Sem promessa de alcance, vendas ou audiência garantida. Publicar é grátis; destaque é publicidade paga sujeita à elegibilidade.</p></div><div><h3>A paleta permanece</h3><div class="swatch navy">Navy #0A192F<br>RGB 10 · 25 · 47</div><div class="swatch mint">Turquesa #4AF9EB<br>RGB 74 · 249 · 235</div><p>Branco faz a reversão. Navy é a base legível em fundos claros. Não usar turquesa sozinho para informação pequena sobre branco.</p><p>CMYK e Pantone dependem de prova com o fornecedor.</p></div></div></section>''')
for d in directions:
    id=d['id']
    pages.append('<section class="page"><div class="direction-title"><h2>'+d['name']+'</h2>'+image(id+'/logo/horizontal-cor.svg','Logo '+d['name'])+'</div><div class="direction-grid">'+image(id+'/mockup.webp','Aplicações físicas de '+d['name'],'merch')+'<div><h3>'+d['idea']+'</h3><p>'+d['tone']+'</p><h4>Grafismo</h4><p>'+d['pattern']+'</p><h4>Trade-off</h4><p>'+d['risk']+'</p><p class="note">Mockup por IA: referência visual de acabamento. Os SVGs são as artes exatas.</p></div></div></section>')
logo_grid=''.join('<div><h3>'+d['name']+'</h3>'+image(d['id']+'/logo/horizontal-cor.svg','Logo em cor')+'<div class="reverse">'+image(d['id']+'/logo/horizontal-escuro.svg','Logo reverso')+'</div><div class="symbols">'+image(d['id']+'/logo/simbolo-preto.svg','Símbolo preto')+image(d['id']+'/digital/favicon-claro.svg','Favicon em navy')+'</div></div>' for d in directions)
pages.append('<section class="page"><h2>Um sistema, em qualquer escala.</h2><div class="logo-grid">'+logo_grid+'</div><p>Proteger o símbolo com uma margem de pelo menos 1/8 do canvas. Mínimos digitais propostos: símbolo 16 px, assinatura horizontal 220 px. Em áreas estreitas, usar o símbolo. Não esticar, girar, recolorir nem acrescentar efeitos ao mestre.</p></section>')
pages.append('''<section class="page"><h2>O desenho encontra o tecido.</h2><div class="columns"><div>'''+image('nexo/print/camisa-costas-280mm.svg','Arte vetorial para costas','back-art')+'''<p class="note">Arte plana exata · costas · largura proposta de 280 mm.</p></div><div><h3>Peito e boné</h3><p>Símbolo sem letras pequenas, em uma ou duas cores. Vetor de peito com canvas de 35×35 mm; o desenho ocupa menos devido à margem interna.</p><h3>Bordado</h3><p>Referência Gelato: altura de texto de 6,4 mm e traços de 1,3 mm para bordado padrão. O mínimo do seu fornecedor prevalece. Conferir também espaços negativos, tensão e tecido.</p><h3>Antes de produzir</h3><p>Escolher modelo, gabarito e acabamento. Solicitar digitalização de pontos e amostra. Não existem DST/PES ou prova física nesta entrega.</p><p class="note">A fotografia demonstra uma intenção de acabamento; não certifica espessura de linha ou fidelidade de cor.</p></div></div></section>''')
pages.append('''<section class="page"><h2>Do objeto ao papel.</h2><div class="columns"><div>'''+image('tla/print/cartao-frente-com-sangria.svg','Cartão frente','card-art')+image('tla/print/cartao-verso-com-sangria.svg','Cartão verso','card-art')+'''</div><div><h3>Cartão</h3><p>Estudo de 90×50 mm com sangria ilustrativa de 3 mm; arquivo total de 96×56 mm. Proteger texto e logo com margem interna. Sem contatos fictícios.</p><h3>Ecobag, caneca e adesivo</h3><p>Vetores próprios, com áreas ilustrativas: 240×240 mm, 200×85 mm e 60 mm. Confirmar costuras, alça, faca e zonas imprimíveis.</p><h3>Embalagem</h3><p>O padrão modular pode ocupar papel de seda, cinta ou etiqueta. Não é uma faca de caixa homologada. A forma e a gramatura dependem do produto.</p><p class="note">Artes fornecidas em RGB. Gabarito, sangria, separação de cores e perfil de impressão exigem aprovação da gráfica.</p></div></div></section>''')
digital=''.join('<div><h3>'+d['name']+'</h3>'+image(d['id']+'/social/post.png','Post '+d['name'])+'</div>' for d in directions)
pages.append('<section class="page"><h2>Presença digital com a mesma voz.</h2><div class="social-grid">'+digital+'</div><p>Post 1080×1080, story 1080×1920 e capa 1200×630. Favicon SVG adaptativo, ICO/PNG, Apple Touch, avatar e maskable. A configuração de PWA não foi integrada ao site. Os textos são propostas de campanha, sem promessas de resultado.</p></section>')
pages.append('''<section class="page"><h2>Arquivos certos. Uso consciente.</h2><div class="columns"><div><h3>O que está no kit</h3><p>Três sistemas com logos em SVG/PNG, preto/branco, versões horizontais e verticais, favicons, ícones, peças sociais, padrões e estudos de arte física. ZIP completo e por direção.</p><h3>O que é fonte de verdade</h3><p>SVGs exatos para o desenho. PNG/WebP de mockup apenas para apresentação. Não usar o mockup como arte de impressão.</p><h3>Como continuar</h3><p>Comparar, escolher ou combinar os atributos preferidos. Refinar a assinatura e testar no contexto real antes da aplicação. As opções não são submarcas para usar simultaneamente.</p></div><div><h3>Pesquisa aplicada</h3><p>Pentagram/Raylo: motivo que sustenta vários materiais. Pentagram/Slack: consistência e escala. Gelato: bordado simples. MOO: sangria e gabarito do produto.</p><p>Links completos em PESQUISA.md; origem das imagens em proveniencia.json.</p><h3>Limites</h3><p>Sem pesquisa jurídica, amostra fabricada, aprovação Pantone/CMYK ou estudo com usuários. Mockups gerados por IA podem divergir dos vetores.</p><p>Não houve publicação, compra de mercadoria ou substituição da marca no produto.</p></div></div></section>''')
style='''@font-face{font-family:Outfit;src:url(assets/outfit.ttf);font-weight:100 900}*{box-sizing:border-box}body{margin:0;color:#0a192f;font-family:Outfit,sans-serif;background:#edf1f6}.page{position:relative;width:297mm;height:210mm;padding:17mm 19mm;background:#fff;break-after:page;overflow:hidden}.page:last-child{break-after:auto}h1{font-size:52pt;letter-spacing:-2pt;font-weight:500;line-height:1;margin:0 0 5mm}h2{font-size:32pt;font-weight:500;letter-spacing:-1pt;line-height:1.1;margin:0 0 12mm}h3{font-size:17pt;line-height:1.15;font-weight:500;margin:0 0 5mm}h4{font-size:12pt;margin:7mm 0 2mm}p{font-size:11.3pt;line-height:1.45;margin:0 0 6mm}img{display:block;max-width:100%;height:auto}.cover{background:#0a192f;color:white}.cover>p{font-size:19pt}.cover-image{position:absolute;right:0;bottom:0;width:190mm;height:137mm;object-fit:cover}.bottom{position:absolute;left:19mm;bottom:17mm;font-size:10pt;line-height:1.5;width:63mm}.columns{display:grid;grid-template-columns:1fr 1fr;gap:17mm}.swatch{padding:8mm;margin-bottom:5mm;font-size:16pt}.navy{background:#0a192f;color:#fff}.mint{background:#4af9eb;color:#0a192f}.direction-title{display:flex;align-items:center;justify-content:space-between;margin-bottom:10mm}.direction-title h2{margin:0}.direction-title>img{width:115mm}.direction-grid{display:grid;grid-template-columns:180mm 1fr;gap:10mm}.merch{width:180mm}.note{font-size:9pt;color:#34445a}.logo-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm 14mm;margin-bottom:6mm}.logo-grid h3{font-size:13pt;margin-bottom:3mm}.logo-grid>div>img{width:95mm}.reverse{background:#0a192f;padding:2mm;margin-top:2mm}.logo-grid .reverse img{width:75mm}.symbols{display:flex;align-items:end;gap:5mm;margin-top:3mm}.symbols img:first-child{width:11mm;height:11mm}.symbols img:last-child{width:4.23mm;height:4.23mm}.back-art{height:135mm;width:auto;margin:auto}.card-art{width:110mm;margin-bottom:7mm}.social-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;margin-bottom:10mm}.social-grid h3{font-size:14pt}.social-grid img{width:100%}@page{size:A4 landscape;margin:0}@media screen{.page{margin:24px auto}}@media print{body{background:white}.page{margin:0}}'''
(BASE/'brandbook.html').write_text('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Tem Link Aqui — Brandbook</title><style>'+style+'</style></head><body>'+''.join(pages)+'</body></html>',encoding='utf-8')
print('Showroom data, provenance, research, guide and '+str(len(pages))+'-page brandbook source built.')
