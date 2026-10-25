"""Build four local identity proposals, exact artwork and the comparison showroom."""
from pathlib import Path
import html
import json
import re
import struct
import subprocess
import sys
import urllib.request
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
SKILL = Path.home() / '.codex/skills/logo-design/scripts'
sys.path.insert(0, str(SKILL))
import export_variants
import render_png
import svg_audit

NAVY, MINT, WHITE = '#0a192f', '#4af9eb', '#ffffff'
NS = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', NS[1:-1])
raw_word = ET.parse(BASE / 'assets/wordmark-contornos.svg').getroot()
wx, wy, ww, wh = map(float, raw_word.get('viewBox').split())
WORD = ''.join(ET.tostring(n, encoding='unicode') for n in raw_word if n.tag == NS + 'path')
FAMILIES = [
    {'id': 'ponte', 'name': 'Ponte', 'idea': 'O espaço entre pessoas vira um ponto de encontro.', 'tone': 'Humana, estável e acolhedora.', 'line': 'Tem um mundo\nentre a gente.', 'pattern': 'Arcos amplos e uma faixa de encontro.', 'risk': 'O arco pode ser lido como a letra A; o nome completa a identificação.', 'body':
     f'<path fill="{NAVY}" d="M24 224V128A104 104 0 0 1 232 128V224H184V128A56 56 0 0 0 72 128V224Z"/>'
     f'<path fill="{MINT}" d="M72 144H184V184H72Z"/>'},
    {'id': 'farol', 'name': 'Farol', 'idea': 'Um ponto de descoberta que abre espaço para o próximo interesse.', 'tone': 'Precisa, curiosa e digital.', 'line': 'Seu próximo\ninteresse está aqui.', 'pattern': 'Órbitas abertas e enquadramentos de descoberta.', 'risk': 'A forma circular é familiar na tecnologia; precisa da abertura própria e do wordmark.', 'body':
     f'<path fill="{NAVY}" d="M128 24A104 104 0 1 0 232 128H184A56 56 0 1 1 128 72Z"/>'
     f'<path fill="{MINT}" d="M160 24H232V96H192V64H160Z"/>'},
    {'id': 'liga', 'name': 'Liga', 'idea': 'As iniciais de Tem e Link se aproximam em uma assinatura contínua.', 'tone': 'Próxima, direta e reconhecível.', 'line': 'Gente, assunto\ne conexão.', 'pattern': 'Hastes arredondadas e ligações em módulos.', 'risk': 'A leitura de tl deve ser aprendida; não pretende representar todas as iniciais.', 'body':
     f'<path fill="{NAVY}" d="M40 32H88V88H144V132H88V176Q88 184 96 184H128V224H96Q40 224 40 168V132H16V88H40Z"/>'
     f'<path fill="{MINT}" d="M168 32H216V176Q216 184 224 184H240V224H224Q168 224 168 168Z"/>'},
    {'id': 'rota', 'name': 'Rota', 'idea': 'Um percurso dobrado transforma descoberta em movimento.', 'tone': 'Expressiva, urbana e independente.', 'line': 'Siga o que\nte interessa.', 'pattern': 'Faixas deslocadas e uma dobra de 45 graus.', 'risk': 'É a alternativa mais abstrata: a associação com descoberta depende do nome e das peças.', 'body':
     f'<path fill="{NAVY}" d="M24 24H104V88H232V232H152V168H24Z"/>'
     f'<path fill="{MINT}" d="M152 168H232V232Z"/>'},
]


def save(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


def svg(body, w=256, h=256, title='Tem Link Aqui', mm=None):
    dims = f'width="{mm[0]}mm" height="{mm[1]}mm"' if mm else f'width="{w}" height="{h}"'
    return f'<svg xmlns="{NS[1:-1]}" {dims} viewBox="0 0 {w} {h}" role="img"><title>{html.escape(title)}</title>{body}</svg>'


def paint(body, dark=False, mono=None):
    return body.replace(NAVY, mono or (WHITE if dark else NAVY)).replace(MINT, mono or MINT)


def word(x, y, width, dark=False, mono=None):
    return f'<g transform="translate({x} {y}) scale({width/ww}) translate({-wx} {-wy})">{paint(WORD, dark, mono)}</g>'


def symbol(body, x, y, size, dark=False, mono=None):
    return f'<g transform="translate({x} {y}) scale({size/256})">{paint(body, dark, mono)}</g>'


def copy_lines(text, x, y, size, color=WHITE):
    return ''.join(f'<text x="{x}" y="{y+i*size*1.08}" font-family="Segoe UI,sans-serif" font-weight="700" font-size="{size}" letter-spacing="-1.5" fill="{color}">{html.escape(line)}</text>' for i, line in enumerate(text.splitlines()))


jobs, audits = [], []


def raster(src, dst, w, h=None):
    jobs.append({'src': str(src), 'dst': str(dst), 'w': w, 'h': h or w})


def pattern(f, width, height, color=MINT, scale=1):
    body = paint(f['body'], mono=color)
    return ''.join(f'<g transform="translate({x} {y}) scale({scale})">{body}</g>'
                   for y in range(-64, height, int(300*scale)) for x in range(-80, width, int(300*scale)))


for f in FAMILIES:
    folder, body = BASE / f['id'], f['body']
    save(folder / 'logo/simbolo.svg', svg(body))
    for variant, dark, mono in [('cor', False, None), ('escuro', True, None), ('preto', False, '#000000'), ('branco', True, WHITE)]:
        save(folder / f'logo/horizontal-{variant}.svg', svg(symbol(body, 0, 0, 256, dark, mono) + word(310, 50, 1040, dark, mono), 1380, 256))
        save(folder / f'logo/vertical-{variant}.svg', svg(symbol(body, 256, 8, 256, dark, mono) + word(24, 306, 720, dark, mono), 768, 480))
        save(folder / f'logo/simbolo-{variant}.svg', svg(paint(body, dark, mono)))
    save(folder / 'logo/wordmark.svg', svg(word(0, 0, 1292), 1292, round(wh*1292/ww)))
    # The skill supplies tested SVG variants and the ICO writer; Sharp is already installed locally.
    sys.argv = ['export_variants.py', str(folder / 'logo/simbolo.svg'), '--out-dir', str(folder / 'digital'), '--name', 'marca', '--mono', NAVY, '--icon-bg', NAVY, '--title', 'Tem Link Aqui — ' + f['name']]
    export_variants.main()
    raw = svg(body)
    small = export_variants.square_wrap(raw, ET.fromstring(raw), padding=.03, title='Tem Link Aqui')
    adaptive = small.replace(f'fill="{NAVY}"', f'class="ink" fill="{NAVY}"').replace('</svg>', '<style>@media(prefers-color-scheme:dark){.ink{fill:#fff}}</style></svg>')
    save(folder / 'digital/favicon.svg', adaptive)
    save(folder / 'digital/favicon-claro.svg', paint(small, mono=NAVY))
    tile = svg(f'<rect width="256" height="256" fill="{NAVY}"/>' + symbol(body, 26, 26, 204, True))
    maskable = svg(f'<rect width="256" height="256" fill="{NAVY}"/>' + symbol(body, 64, 64, 128, True))
    save(folder / 'digital/app.svg', tile)
    save(folder / 'digital/maskable.svg', maskable)
    for size in (16, 32, 48):
        raster(folder / 'digital/favicon-claro.svg', folder / f'digital/favicon-{size}.png', size)
    for size, filename in [(180, 'apple-touch-icon'), (192, 'icon-192'), (512, 'icon-512'), (1024, 'avatar')]:
        raster(folder / 'digital/app.svg', folder / f'digital/{filename}.png', size)
    raster(folder / 'digital/maskable.svg', folder / 'digital/maskable-512.png', 512)
    manifest = {'name': 'Tem Link Aqui', 'short_name': 'Tem Link Aqui', 'theme_color': NAVY, 'background_color': NAVY, 'display': 'standalone', 'icons': [
        {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'}, {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}]}
    save(folder / 'digital/site.webmanifest', json.dumps(manifest, ensure_ascii=False, indent=2))
    for variant in ('cor', 'escuro', 'preto', 'branco'):
        raster(folder / f'logo/horizontal-{variant}.svg', folder / f'logo/horizontal-{variant}.png', 2070, 384)
    raster(folder / 'logo/vertical-cor.svg', folder / 'logo/vertical-cor.png', 1152, 720)
    raster(folder / 'logo/simbolo.svg', folder / 'logo/simbolo.png', 1024)

    # Exact, flat application artwork. Mockup photographs are separate, never production masters.
    save(folder / 'print/peito-35mm.svg', svg(paint(body, mono=NAVY), title='Símbolo para peito — 35 mm', mm=(35, 35)))
    save(folder / 'print/peito-35mm-branco.svg', svg(paint(body, mono=WHITE), title='Símbolo branco para tecido navy — 35 mm', mm=(35, 35)))
    back = symbol(body, 240, 0, 480, mono=NAVY) + word(16, 548, 928)
    save(folder / 'print/camisa-costas-280mm.svg', svg(back, 960, 760, 'Estampa de costas — largura 280 mm', mm=(280, 221.67)))
    save(folder / 'print/ecobag-240mm.svg', svg(symbol(body, 200, 48, 400) + word(40, 520, 720), 800, 800, 'Arte para ecobag — 240 mm', mm=(240, 240)))
    mug = symbol(body, 80, 40, 180) + word(300, 86, 660)
    save(folder / 'print/caneca-200x85mm.svg', svg(mug, 1200, 510, 'Arte de caneca — 200 × 85 mm', mm=(200, 85)))
    save(folder / 'print/adesivo-60mm.svg', svg(f'<rect width="256" height="256" rx="128" fill="{NAVY}"/>' + symbol(body, 40, 40, 176, True), title='Arte circular de adesivo — 60 mm', mm=(60, 60)))
    for side in ('frente', 'verso'):
        card = (f'<rect width="960" height="560" fill="{NAVY}"/>' + symbol(body, 40, 28, 220, True) + word(48, 350, 720, True)) if side == 'frente' else (
            f'<rect width="960" height="560" fill="{MINT}"/>' + word(48, 56, 680) + copy_lines('Encontre seu próximo interesse.', 48, 310, 40, NAVY))
        save(folder / f'print/cartao-{side}-com-sangria.svg', svg(card, 960, 560, 'Cartão 90 × 50 mm; sangria ilustrativa de 3 mm', mm=(96, 56)))
    pattern_art = svg(f'<rect width="1200" height="1200" fill="{NAVY}"/>' + pattern(f, 1200, 1200, scale=.8), 1200, 1200, 'Padrão derivado da marca — ' + f['name'])
    save(folder / 'sistema/padrao.svg', pattern_art)
    raster(folder / 'sistema/padrao.svg', folder / 'sistema/padrao.png', 1200)
    for kind, width, height in [('post', 1080, 1080), ('story', 1080, 1920), ('capa', 1200, 630)]:
        artwork = f'<rect width="{width}" height="{height}" fill="{NAVY}"/>' + symbol(body, width-310, 55, 240, True)
        artwork += word(64, 64, 530, True) + copy_lines(f['line'], 64, height*.62, 84)
        artwork += f'<rect x="64" y="{height-80}" width="{width-128}" height="12" fill="{MINT}"/>'
        save(folder / f'social/{kind}.svg', svg(artwork, width, height, 'Tem Link Aqui — ' + kind))
        raster(folder / f'social/{kind}.svg', folder / f'social/{kind}.png', width, height)
    reference = svg(f'<rect width="1600" height="1000" fill="{WHITE}"/>' + symbol(body, 100, 80, 360) + word(540, 188, 960)
                    + f'<rect y="520" width="1600" height="480" fill="{NAVY}"/>' + symbol(body, 100, 570, 320, True) + word(540, 680, 960, True), 1600, 1000, 'Referência exata da identidade — ' + f['name'])
    save(folder / 'referencia.svg', reference)
    raster(folder / 'referencia.svg', folder / 'referencia.png', 1600, 1000)
    for print_file in (folder / 'print').glob('*.svg'):
        print_root = ET.parse(print_file).getroot()
        width_mm = float(print_root.get('width').removesuffix('mm'))
        height_mm = float(print_root.get('height').removesuffix('mm'))
        raster(print_file, print_file.with_suffix('.png'), round(width_mm/25.4*300), round(height_mm/25.4*300))
        jobs[-1]['density'] = 300
    for filename in ['logo/simbolo.svg', 'logo/horizontal-preto.svg']:
        result = svg_audit.audit(str(folder / filename), None)
        result['file'] = f['id'] + '/' + filename
        audits.append(result)
    save(folder / 'LEIA-ME.md', f'''# Tem Link Aqui — {f['name']}

**Ideia:** {f['idea']} **Personalidade:** {f['tone']}

**Grafismo:** {f['pattern']} **Limite:** {f['risk']}

Logo e arte exatos: `logo/`, `digital/`, `print/`, `social/`, `sistema/`. `mockup.png` é uma simulação visual por IA, não gabarito de impressão; pode variar do vetor. Os vetores são a fonte de verdade.

`print/` contém estudos em tamanho físico, em RGB. Peito e adesivo usam símbolo sem letras pequenas. Camisa/caneca/ecobag exigem gabarito do fabricante e aprovação de amostra. A arte da caneca não prevê alça nem revestimento específico. Cartão de 90 × 50 mm usa 3 mm de sangria ilustrativa, total 96 × 56 mm; confirmar o fornecedor antes de produzir. Nenhum QR ilustrativo ou endereço inventado foi incluído.

O SVG de peito de 35 mm usa canvas com margem: a marca impressa ocupa menos que o canvas. Não é arquivo de pontos DST/PES. A digitalização, linhas e reforços dependem da bordadeira. Não foram simulados efeitos têxteis dentro do arquivo de produção.

Nome, navy #0A192F e turquesa #4AF9EB preservados. Logo em contornos, sem dependência de fonte. Wordmark deriva da Segoe UI Bold já explorada no estudo anterior; não inclui redistribuição da fonte. A apresentação usa Outfit sob OFL.
''')

overview = '<rect width="1800" height="1260" fill="#ffffff"/>' + copy_lines('Tem Link Aqui / novas direções', 64, 84, 46, NAVY)
for i, f in enumerate(FAMILIES):
    x, y = 64+(i%2)*876, 145+(i//2)*540
    overview += f'<rect x="{x}" y="{y}" width="812" height="500" fill="#f6f8fb"/>'
    overview += symbol(f['body'], x+35, y+35, 260) + word(x+330, y+120, 440)
    overview += f'<rect x="{x+24}" y="{y+320}" width="764" height="150" fill="{NAVY}"/>' + symbol(f['body'], x+42, y+326, 138, True)
    overview += f'<text x="{x+218}" y="{y+410}" font-family="Segoe UI,sans-serif" font-size="42" font-weight="700" fill="#fff">{f["name"]}</text>'
save(BASE / 'comparativo.svg', svg(overview, 1800, 1260, 'Quatro novas opções da marca Tem Link Aqui'))
raster(BASE / 'comparativo.svg', BASE / 'comparativo.png', 1800, 1260)
save(BASE / 'direcoes.json', json.dumps([{k:v for k,v in f.items() if k != 'body'} for f in FAMILIES], ensure_ascii=False, indent=2))
save(BASE / 'auditoria-svg.json', json.dumps(audits, ensure_ascii=False, indent=2))
save(BASE / 'raster-jobs.json', json.dumps(jobs, indent=2))
code = """const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');const sharp=require(path.join(process.cwd(),'frontend/node_modules/sharp'));(async()=>{for(const j of JSON.parse(fs.readFileSync(process.argv[1],'utf8'))){await sharp(j.src,{density:192}).resize(j.w,j.h,{fit:'contain'}).withMetadata({density:j.density||72}).png().toFile(j.dst);const m=await sharp(j.dst).metadata();assert.equal(m.width,j.w);assert.equal(m.height,j.h);if(j.density)assert.equal(m.density,j.density);}console.log('PNG dimensions and print density verified')})().catch(e=>{console.error(e);process.exit(1)});"""
subprocess.run(['node', '-e', code, str(BASE / 'raster-jobs.json')], cwd=ROOT, check=True)
for f in FAMILIES:
    folder = BASE / f['id'] / 'digital'
    render_png.write_ico([str(folder / f'favicon-{s}.png') for s in (16,32,48)], str(folder / 'favicon.ico'))
    assert struct.unpack('<HHH', (folder/'favicon.ico').read_bytes()[:6]) == (0,1,3)
for file in BASE.glob('*/logo/*.svg'):
    root = ET.parse(file).getroot()
    assert root.find(NS+'title') is not None
    assert not list(root.iter(NS+'text')) and not list(root.iter(NS+'image'))
print('SVG paths, titles and ICO frames verified.')
