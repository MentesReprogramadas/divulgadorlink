"""Rebuild the local brand proposals with the installed logo-design skill and Sharp."""
from pathlib import Path
import copy
import html
import json
import struct
import subprocess
import sys
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
NEW = '--new-direction' in sys.argv
if NEW:
    OUT = OUT / 'nova-identidade'
SKILL = Path.home() / '.codex/skills/logo-design'
sys.path.insert(0, str(SKILL / 'scripts'))
import export_variants
import render_png
import svg_audit

NAVY, MINT, PAPER = '#0a192f', '#4af9eb', '#f6f8fb'
NS = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', NS[1:-1])
original = ET.parse(ROOT / 'frontend/public/logo.svg').getroot()
wordmark = []
for node in original:
    if node.tag != NS + 'path':
        continue
    if node.get('fill') == '#fff':
        # The existing logo paints counters white; real holes survive any background.
        parent = wordmark[-1]
        parent.set('d', parent.get('d').rstrip('zZ') + 'Z ' + node.get('d').rstrip('zZ') + 'Z')
        parent.set('fill-rule', 'evenodd')
    else:
        wordmark.append(copy.deepcopy(node))
WORD = ''.join(ET.tostring(p, encoding='unicode') for p in wordmark)
if NEW:
    new_wordmark = ET.parse(OUT / 'wordmark-contornos.svg').getroot()
    wx, wy, ww, wh = map(float, new_wordmark.get('viewBox').split())
    # Normalize outlined typography to the existing composition canvas.
    WORD = f'<g transform="translate(122 278) scale({1292/ww}) translate({-wx} {-wy})">' + ''.join(ET.tostring(p, encoding='unicode') for p in new_wordmark if p.tag == NS + 'path') + '</g>'


def svg(body, width=256, height=256, title='Tem Link Aqui'):
    return (f'<svg xmlns="{NS[1:-1]}" width="{width}" height="{height}" '
            f'viewBox="0 0 {width} {height}" role="img"><title>{html.escape(title)}</title>{body}</svg>')


def paint(body, dark=False, mono=None):
    return body.replace(NAVY, mono or ('#ffffff' if dark else NAVY)).replace(MINT, mono or MINT)


def word(x, y, scale, dark=False, mono=None):
    return f'<g transform="translate({x} {y}) scale({scale}) translate(-122 -278)">{paint(WORD, dark, mono)}</g>'


def save(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')


diamond = f'<path fill="{MINT}" d="M208 32 232 56 208 80 184 56Z"/>'
families = [
    ('01-classico', 'Clássico', 'Evolução direta do T e do losango atuais.',
     f'<path fill="{NAVY}" d="M32 64H176V96H120V224H88V96H32Z"/>' + diamond),
    ('02-proximo', 'Próximo', 'O mesmo T com cantos suaves e presença mais acolhedora.',
     f'<path fill="{NAVY}" d="M48 64H160Q176 64 176 80V84Q176 100 160 100H122V208Q122 224 106 224H102Q86 224 86 208V100H48Q32 100 32 84V80Q32 64 48 64Z"/>' + diamond),
    ('03-compacto', 'Compacto', 'Um t contínuo e mais denso para avatares e superfícies digitais.',
     f'<path fill="{NAVY}" d="M88 40H128V88H176V124H128V168Q128 188 148 188H176V224H144Q88 224 88 168V124H40V88H88Z"/>' + diamond),
]

if NEW:
    families = [
        ('01-encontro', 'Encontro', 'Duas pontas se aproximam e formam uma passagem compartilhada.',
         f'<path fill="{NAVY}" d="M144 32H80A48 48 0 0 0 32 80V144A48 48 0 0 0 80 192H112V152H80A8 8 0 0 1 72 144V80A8 8 0 0 1 80 72H144Z"/>'
         f'<path fill="{MINT}" d="M112 224H176A48 48 0 0 0 224 176V112A48 48 0 0 0 176 64H144V104H176A8 8 0 0 1 184 112V176A8 8 0 0 1 176 184H112Z"/>'),
        ('02-portal', 'Portal', 'Uma abertura recortada revela um caminho: entrar, encontrar e seguir.',
         f'<path fill="{NAVY}" d="M40 224V104A88 88 0 0 1 128 16H144V60H128A44 44 0 0 0 84 104V224Z"/>'
         f'<path fill="{MINT}" d="M168 16H216V224H120V180H168Z"/>'),
        ('03-aqui', 'Aqui', 'Um a com saída própria transforma o nome em um sinal de destino.',
         f'<path fill="{NAVY}" fill-rule="evenodd" d="M120 32A88 88 0 1 0 164 196V208H208V32H164V44A88 88 0 0 0 120 32Z M120 76A44 44 0 1 1 120 164A44 44 0 1 1 120 76Z"/>'
         f'<path fill="{MINT}" d="M164 176H232V216H164Z"/>'),
    ]

jobs = []


def raster(src, dst, width, height=None):
    jobs.append({'src': str(src), 'dst': str(dst), 'width': width, 'height': height or width})


audits = []
for slug, name, note, body in families:
    folder = OUT / slug
    save(folder / 'simbolo.svg', svg(body))
    save(folder / 'simbolo-escuro.svg', svg(paint(body, dark=True)))
    for suffix, dark, mono in [('cor', False, None), ('escuro', True, None), ('preto', False, '#000000'), ('branco', True, '#ffffff')]:
        mark = paint(body, dark, mono)
        horizontal = f'<g transform="translate(0 0)">{mark}</g>' + word(296, 42, .72, dark, mono)
        stacked = f'<g transform="translate(256 12)">{mark}</g>' + word(32, 300, .545, dark, mono)
        save(folder / f'logo-horizontal-{suffix}.svg', svg(horizontal, 1256, 256))
        save(folder / f'logo-vertical-{suffix}.svg', svg(stacked, 768, 472))
    save(folder / 'wordmark.svg', svg(word(0, 0, 1), 1292, 235))
    for base in ['logo-horizontal-cor', 'logo-horizontal-escuro', 'logo-horizontal-preto', 'logo-horizontal-branco']:
        raster(folder / f'{base}.svg', folder / f'{base}.png', 1600, 326)
    raster(folder / 'logo-vertical-cor.svg', folder / 'logo-vertical-cor.png', 960, 590)

    # Reuse the installed skill's exports; rasterization uses the project's existing Sharp.
    before = sys.argv
    sys.argv = ['export_variants.py', str(folder / 'simbolo.svg'), '--out-dir', str(folder), '--name', 'simbolo', '--mono', NAVY, '--icon-bg', NAVY, '--icon-fg', '#ffffff', '--title', 'Tem Link Aqui — ' + name]
    export_variants.main()
    sys.argv = before
    small = export_variants.square_wrap(svg(body), ET.fromstring(svg(body)), padding=.02, title='Tem Link Aqui')
    # A navy silhouette remains legible on light tabs; white + mint is used on dark tabs.
    adaptive = small.replace('</svg>', '<style>@media(prefers-color-scheme:dark){.ink{fill:#fff}}</style></svg>')
    adaptive = adaptive.replace(f'fill="{NAVY}"', f'class="ink" fill="{NAVY}"')
    save(folder / 'favicon.svg', adaptive)
    save(folder / 'favicon-claro.svg', paint(small, mono=NAVY))
    save(folder / 'favicon-escuro.svg', paint(small, dark=True))
    tile_body = f'<rect width="256" height="256" fill="{NAVY}"/><g transform="translate(25.6 25.6) scale(.8)">{paint(body, dark=True)}</g>'
    mask_body = f'<rect width="256" height="256" fill="{NAVY}"/><g transform="translate(58.88 58.88) scale(.54)">{paint(body, dark=True)}</g>'
    save(folder / 'icone-app.svg', svg(tile_body))
    save(folder / 'icone-maskable.svg', svg(mask_body))
    for size in (16, 32, 48):
        raster(folder / 'favicon-claro.svg', folder / f'favicon-{size}.png', size)
    for size, filename in [(180, 'apple-touch-icon.png'), (192, 'icon-192.png'), (512, 'icon-512.png'), (1024, 'avatar-1024.png')]:
        raster(folder / 'icone-app.svg', folder / filename, size)
    raster(folder / 'icone-maskable.svg', folder / 'maskable-512.png', 512)
    raster(folder / 'simbolo.svg', folder / 'simbolo-transparente-512.png', 512)
    save(folder / 'site.webmanifest', json.dumps({'name': 'Tem Link Aqui', 'short_name': 'Tem Link Aqui', 'icons': [
        {'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
        {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
        {'src': 'maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
        'theme_color': NAVY, 'background_color': NAVY, 'display': 'standalone'}, ensure_ascii=False, indent=2))
    save(folder / 'head-snippet.html', '<!-- Exemplo: adaptar os caminhos à aplicação antes de integrar. -->\n<link rel="icon" href="./favicon.svg" type="image/svg+xml">\n<link rel="icon" href="./favicon.ico" sizes="16x16 32x32 48x48">\n<link rel="apple-touch-icon" href="./apple-touch-icon.png">\n<link rel="manifest" href="./site.webmanifest">\n')
    social = (f'<rect width="1200" height="630" fill="{NAVY}"/>'
              f'<g transform="translate(80 74) scale(.7)">{paint(body, dark=True)}</g>'
              + word(80, 310, .8, True)
              + f'<path fill="{MINT}" d="M80 548H1120V556H80Z"/>')
    save(folder / 'capa-social-1200x630.svg', svg(social, 1200, 630))
    raster(folder / 'capa-social-1200x630.svg', folder / 'capa-social-1200x630.png', 1200, 630)
    audits.extend(svg_audit.audit(str(folder / f), None) for f in ['simbolo.svg', 'logo-horizontal-cor.svg', 'logo-horizontal-branco.svg'])

cards, board = [], [f'<rect width="1600" height="1130" fill="{PAPER}"/>']
board.append('<text x="64" y="82" font-family="Segoe UI,sans-serif" font-size="42" font-weight="700" fill="#0a192f">Tem Link Aqui / variações da marca</text>')
board.append('<text x="64" y="122" font-family="Segoe UI,sans-serif" font-size="21" fill="#34445a">Uma identidade. Três tratamentos. Logo, símbolo e presença digital.</text>')
for i, (slug, name, note, body) in enumerate(families):
    x = 64 + i * 498
    board.append(f'<rect x="{x}" y="168" width="474" height="898" rx="20" fill="#ffffff"/>')
    board.append(f'<g transform="translate({x + 100} 202) scale(1.05)">{paint(body, mono=NAVY)}</g>')
    board.append(word(x + 28, 500, .323))
    board.append(f'<text x="{x + 28}" y="635" font-family="Segoe UI,sans-serif" font-size="28" font-weight="700" fill="{NAVY}">{i + 1:02} / {name}</text>')
    board.append(f'<rect x="{x + 28}" y="680" width="418" height="230" rx="14" fill="{NAVY}"/>')
    board.append(f'<g transform="translate({x + 160} 696) scale(.7)">{paint(body, dark=True)}</g>')
    for j, size in enumerate((64, 32, 16)):
        xx, yy = x + 28 + j * 140, 944
        board.append(f'<g transform="translate({xx} {yy}) scale({size / 256})">{paint(body, mono=NAVY)}</g>')
        board.append(f'<text x="{xx + 74}" y="{yy + 20}" font-family="Segoe UI,sans-serif" font-size="15" fill="#34445a">{size}px</text>')
    cards.append(f'''<article id="{slug}"><div class="card-heading"><span>0{i + 1}</span><h2>{name}</h2>{'<b>Recomendada</b>' if i == 0 else ''}</div>
<p>{note}</p><div class="symbol-stage"><img src="{slug}/simbolo.svg" alt="Símbolo {name}: T com losango" width="256" height="256"></div>
<div class="lockup"><img src="{slug}/logo-horizontal-cor.svg" alt="Tem Link Aqui — {name}" width="1256" height="256"></div>
<div class="lockup dark"><img src="{slug}/logo-horizontal-escuro.svg" alt="Versão para fundo escuro" width="1256" height="256"></div>
<div class="sizes">{''.join(f'<figure><img src="{slug}/favicon-claro.svg" alt="Símbolo em {s} pixels" width="{s}" height="{s}"><figcaption>{s} px</figcaption></figure>' for s in (64, 32, 16))}</div>
<div class="app-row"><img class="avatar" src="{slug}/avatar-1024.png" alt="Avatar com recorte circular" width="80" height="80"><img class="app" src="{slug}/icon-192.png" alt="Ícone de aplicativo" width="80" height="80"><div><strong>App, avatar e favicon</strong><p>16 a 1024 pixels. SVG, PNG e ICO.</p></div></div>
<details><summary>Ver aplicações e arquivos</summary><img class="social" src="{slug}/capa-social-1200x630.png" alt="Capa social da marca" width="1200" height="630">
<img class="stacked" src="{slug}/logo-vertical-cor.svg" alt="Composição vertical" width="768" height="472"><nav aria-label="Arquivos {name}">
<a href="{slug}/logo-horizontal-cor.svg" download>Logo SVG</a><a href="{slug}/logo-horizontal-cor.png" download>Logo PNG</a><a href="{slug}/favicon.ico" download>Favicon ICO</a><a href="{slug}/favicon.svg" download>Favicon adaptativo</a><a href="{slug}/avatar-1024.png" download>Avatar 1024</a><a href="{slug}/capa-social-1200x630.png" download>Capa social</a></nav></details></article>''')
save(OUT / 'comparativo.svg', svg(''.join(board), 1600, 1130, 'Tem Link Aqui — comparação das três variações'))
raster(OUT / 'comparativo.svg', OUT / 'comparativo.png', 1600, 1130)
save(OUT / 'index.html', '''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tem Link Aqui — Kit da marca</title>
<style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#f6f8fb;color:#0a192f;font-family:Segoe UI,Arial,sans-serif}a{color:#193655;text-underline-offset:4px}a:focus-visible,summary:focus-visible{outline:3px solid #0b684b;outline-offset:5px}header{background:#0a192f;color:#fff;padding:64px max(24px,calc((100vw - 1450px)/2))}header p{color:#dce3ec;max-width:65ch;line-height:1.6}.eyebrow{color:#4af9eb;font-size:13px;font-weight:700;letter-spacing:2px}h1{font-size:clamp(36px,6vw,72px);line-height:1.04;letter-spacing:-2px;max-width:900px;margin:24px 0}header a{color:#4af9eb;display:inline-flex;align-items:center;min-height:44px;margin:0 24px 0 0}main{max-width:1500px;margin:auto;padding:32px 24px 64px}.intro{display:flex;gap:20px;align-items:center;justify-content:space-between;margin-bottom:32px}.intro p{max-width:78ch;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px}article{background:#fff;border:1px solid #dce3ec;border-radius:18px;padding:24px;min-width:0}.card-heading{display:flex;align-items:center;gap:12px}.card-heading span{font-size:13px;color:#5c6b7f}h2{font-size:25px;margin:0;letter-spacing:-.6px}.card-heading b{margin-left:auto;font-size:11px;border:1px solid #dce3ec;padding:6px;border-radius:4px}article>p{color:#34445a;font-size:14px;line-height:1.6;min-height:46px}.symbol-stage{height:240px;display:grid;place-items:center}.symbol-stage img{width:200px;height:200px}.lockup{padding:28px 18px;border-top:1px solid #edf1f6}.lockup img{display:block;width:100%;height:auto}.dark{background:#0a192f;border-radius:10px;border:0}.sizes{display:flex;align-items:end;gap:28px;min-height:126px;padding:24px 0}.sizes figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:12px}.sizes img{display:block}.sizes figcaption{font-size:12px;color:#5c6b7f}.app-row{display:flex;gap:14px;align-items:center;padding:20px 0;border-top:1px solid #edf1f6}.avatar{border-radius:50%}.app{border-radius:20px}.app-row strong{font-size:13px}.app-row p{font-size:12px;line-height:1.5;color:#5c6b7f}summary{cursor:pointer;padding:16px 0;min-height:48px;border-top:1px solid #edf1f6;font-size:14px;font-weight:600}.social{width:100%;height:auto;border-radius:8px}.stacked{display:block;width:70%;height:auto;margin:24px auto}nav{display:grid;grid-template-columns:1fr 1fr;gap:8px}nav a{display:flex;align-items:center;font-size:13px;min-height:44px;padding:8px;border:1px solid #dce3ec;border-radius:6px}footer{border-top:1px solid #dce3ec;margin-top:40px;padding-top:24px;color:#34445a;font-size:13px;line-height:1.7}.palette{display:flex;flex-wrap:wrap;gap:12px}.palette span{padding:10px 16px;border:1px solid #dce3ec;border-radius:24px;font-size:12px}@media(max-width:1000px){.grid{grid-template-columns:1fr}.intro{display:block}.symbol-stage{height:220px}article>p{min-height:0}.lockup img{max-width:660px;margin:auto}.app-row{gap:20px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
</style></head><body><header><span class="eyebrow">TEM LINK AQUI / IDENTIDADE VISUAL</span><h1>Uma marca.<br>Mais possibilidades.</h1><p>Três variações do T e do losango existentes. Arquivos vetoriais, fundos claros e escuros, ícones e presença social.</p><a href="tem-link-aqui-kit.zip" download>Baixar o kit completo</a><a href="GUIA-DA-MARCA.md">Ler o guia da marca</a></header><main><div class="intro"><p><strong>Direção recomendada: Clássico.</strong> Preserva a assinatura atual e resolve os usos pequenos. Próximo suaviza os cantos; Compacto traz uma leitura mais informal.</p><div class="palette"><span style="background:#0a192f;color:white">Navy #0A192F</span><span style="background:#4af9eb;color:#0a192f">Turquesa #4AF9EB</span></div></div><div class="grid">''' + ''.join(cards) + '''</div><footer>Propostas para avaliação, sem aplicação ao site. O wordmark usa os contornos existentes, com transparência corrigida.<br>Ícones em tamanho real acima. Não houve pesquisa de registro de marca nem prova de impressão. <a href="VALIDACAO.md">Ver validação e limites</a>.</footer></main></body></html>''')

if NEW:
    gallery = (OUT / 'index.html').read_text(encoding='utf-8')
    for old, new in [
        ('Três variações do T e do losango existentes.', 'Três símbolos inéditos e nova tipografia. Preservadas somente as cores da marca.'),
        ('Uma marca.<br>Mais possibilidades.', 'Novas formas.<br>A mesma essência.'),
        ('Direção recomendada: Clássico.', 'Direção recomendada: Encontro.'),
        ('Preserva a assinatura atual e resolve os usos pequenos. Próximo suaviza os cantos; Compacto traz uma leitura mais informal.', 'Conecta duas partes em uma forma compacta. Portal explora acesso e descoberta; Aqui transforma a inicial em destino.'),
        ('O wordmark usa os contornos existentes, com transparência corrigida.', 'O novo wordmark em minúsculas foi convertido em contornos vetoriais.'),
        ('T com losango', 'nova proposta de símbolo'),
    ]:
        gallery = gallery.replace(old, new)
    save(OUT / 'index.html', gallery)

save(OUT / 'auditoria-svg.json', json.dumps(audits, ensure_ascii=False, indent=2))
save(OUT / 'raster-jobs.json', json.dumps(jobs, indent=2))
node = """
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(path.join(process.cwd(),'frontend/node_modules/sharp'));
(async()=>{for(const j of JSON.parse(fs.readFileSync(process.argv[1],'utf8'))){
 await sharp(j.src,{density:192}).resize(j.width,j.height,{fit:'contain'}).png().toFile(j.dst);
 const m=await sharp(j.dst).metadata();assert.equal(m.width,j.width);assert.equal(m.height,j.height);
} console.log('PNG dimensions verified');})().catch(e=>{console.error(e);process.exit(1)});
"""
subprocess.run(['node', '-e', node, str(OUT / 'raster-jobs.json')], cwd=ROOT, check=True)
for slug, *_ in families:
    folder = OUT / slug
    render_png.write_ico([str(folder / f'favicon-{size}.png') for size in (16, 32, 48)], str(folder / 'favicon.ico'))
    magic, kind, count = struct.unpack('<HHH', (folder / 'favicon.ico').read_bytes()[:6])
    assert (magic, kind, count) == (0, 1, 3)
    manifest = json.loads((folder / 'site.webmanifest').read_text(encoding='utf-8'))
    assert all((folder / icon['src']).is_file() for icon in manifest['icons'])
for file in OUT.glob('*/*.svg'):
    root = ET.parse(file).getroot()
    assert root.find(NS + 'title') is not None, file
    assert not any(root.iter(NS + 'text')), file
    assert not any(root.iter(NS + 'image')), file
print('Verified: SVG parsing, accessible titles, no live text/raster; ICO frames; manifest targets.')
