"""Reconstruct selected symbols and refine geometric lettering into font-free paths."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET

BASE = Path(__file__).resolve().parent
OUT = BASE / 'vetores-01-09-19'
NAVY, MINT = '#0A192F', '#4AF9EB'
MARKS = [
    ('01', 'nexo', 'Nexo', 'logos-01-04.png', 0, 480, 574, [
        (NAVY, 'M112 280V234C112 165 167 109 237 109C305 109 359 159 359 223V285Q359 290 355 286L272 203C249 181 227 184 209 198C195 209 189 221 189 239V344Q189 352 180 352C140 352 112 320 112 280Z'),
        (NAVY, 'M280 260L351 331Q355 335 349 340C336 351 319 358 303 352C287 347 280 334 280 317Z'),
        (MINT, 'M206 239C206 227 212 218 222 212Q227 208 231 212L280 261V318C280 349 295 371 322 371C355 371 378 348 378 316V216Q378 204 389 204C426 204 456 233 456 273V328C456 395 401 450 332 450C261 450 206 401 206 333Z'),
    ]),
    ('09', 'tla', 'TLA', 'logos-09-12.png', 0, 480, 580, [
        (NAVY, 'M77 215H244Q277 215 277 247V366Q277 376 289 376H380Q406 376 418 399L434 430Q438 437 430 437H276C240 437 215 414 215 377V277H184V437H124V277H77Z'),
        (NAVY, 'M287 355L355 231C362 218 372 211 388 211C404 211 414 217 422 231L494 376H428L388 297L352 362Q351 365 347 365H294Q283 365 287 355Z'),
        (MINT, 'M427.5 375H493.5L512 414Q515 420 515 429V437H463Q457 437 455 431Z'),
    ]),
    ('19', 'confluencia', 'Confluência', 'logos-17-20.png', 701, 455, 553, [
        (NAVY, 'M112 114H185C233 114 272 153 272 201V269C245 236 210 217 170 217H158C132 217 112 198 112 172Z'),
        (MINT, 'M292 269V202C292 153 331 114 381 114H451V171C451 198 431 217 405 217H393C352 217 318 235 292 269Z'),
        (NAVY, 'M190 238C237 250 268 288 282 343C295 289 326 251 375 238C354 257 346 272 346 294V391C346 411 331 426 311 426H254C234 426 218 411 218 391V294C218 272 210 256 190 238Z'),
    ]),
]


# Geometric lettering replaces image-edge noise with consistent stems and true counters.
GLYPHS = {
    't': (29, 'M8 3H20V17H29V28H20V42Q20 49 27 49H29V60H25Q8 60 8 43V28H0V17H8Z'),
    'e': (46, 'M45 41H13C14 48 19 51 25 51Q33 51 38 46L45 54Q37 62 24 62C10 62 0 52 0 38C0 24 10 14 24 14C38 14 46 25 46 38Z M13 32H33Q31 24 24 24Q16 24 13 32Z'),
    'm': (66, 'M0 60V35C0 21 8 14 20 14Q29 14 33 21Q38 14 47 14C59 14 66 22 66 35V60H54V35Q54 26 47 26Q39 26 39 35V60H27V35Q27 26 20 26Q12 26 12 35V60Z'),
    'l': (12, 'M0 0H12V60H0Z'),
    'i': (12, 'M0 17H12V60H0Z'),
    'n': (44, 'M0 60V36C0 22 8 14 22 14C36 14 44 22 44 36V60H32V36Q32 26 22 26Q12 26 12 36V60Z'),
    'k': (43, 'M0 0H12V34L27 17H42L24 37L44 60H28L12 41V60H0Z'),
    'a': (46, 'M34 17H46V60H34V56Q29 62 21 62C9 62 0 52 0 38C0 24 9 14 21 14Q29 14 34 20Z M12 38C12 46 16 50 23 50C30 50 34 46 34 38C34 30 30 26 23 26C16 26 12 30 12 38Z'),
    'q': (46, 'M34 17H46V76H34V56Q29 62 21 62C9 62 0 52 0 38C0 24 9 14 21 14Q29 14 34 20Z M12 38C12 46 16 50 23 50C30 50 34 46 34 38C34 30 30 26 23 26C16 26 12 30 12 38Z'),
    'u': (44, 'M0 17H12V40Q12 50 22 50Q32 50 32 40V17H44V40C44 54 36 62 22 62C8 62 0 54 0 40Z'),
}


def lettering(number):
    x, parts = 0, []
    for index, char in enumerate('tem link aqui'):
        if char == ' ':
            x += 14
            continue
        width, d = GLYPHS[char]
        color = MINT if number == '01' and index >= 9 else NAVY
        body = f'<path fill="{color}" fill-rule="evenodd" d="{d}"/>'
        if char == 'i':
            dot = MINT if number == '19' and index == 5 else color
            body += f'<path fill="{dot}" d="M12 6A6 6 0 1 1 0 6A6 6 0 1 1 12 6Z"/>'
        parts.append(f'<g transform="translate({x} 0)">{body}</g>')
        x += width + 3
    left, top, width = {'01':(54,488,454),'09':(67,495,434),'19':(73,465,423)}[number]
    return f'<g transform="translate({left} {top}) scale({width/(x-3):.5f} .96)">{"".join(parts)}</g>'


def svg(title, body, box):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img" aria-labelledby="title"><title id="title">Tem Link Aqui — {title}</title>{body}</svg>'


def main():
    OUT.mkdir(exist_ok=True)
    registry = []
    for number, slug, name, sheet, offset, top, bottom, shapes in MARKS:
        dest = OUT / f'{number}-{slug}'
        dest.mkdir(exist_ok=True)
        word = lettering(number)
        symbol = ''.join(f'<path fill="{color}" d="{d}"/>' for color,d in shapes)
        artwork = f'<g id="symbol">{symbol}</g><g id="wordmark">{word}</g>'
        for suffix, body in [('colorida',artwork), ('preta',artwork.replace(NAVY,'#000000').replace(MINT,'#000000')), ('branca',artwork.replace(NAVY,'#FFFFFF').replace(MINT,'#FFFFFF'))]:
            (dest/f'logo-{suffix}.svg').write_text(svg(name,body,'30 80 500 510'),encoding='utf-8')
        symbol_box = {'01':'50 70 480 420','09':'50 170 480 310','19':'80 80 400 380'}[number]
        (dest/'simbolo.svg').write_text(svg(name,symbol,symbol_box),encoding='utf-8')
        (dest/'assinatura.svg').write_text(svg(name,word,f'30 {top-5} 500 {bottom-top+10}'),encoding='utf-8')
        (dest/'galeria.svg').write_text(svg(name,artwork,'0 0 561 701'),encoding='utf-8')
        for file in dest.glob('*.svg'):
            root = ET.parse(file).getroot()
            assert not any(n.tag.rsplit('}',1)[-1] in ('text','image','mask','filter') for n in root.iter())
            assert all(n.get('d','').endswith('Z') for n in root.iter() if n.tag.endswith('path'))
        registry.append({'numero':number,'nome':name,'pasta':dest.name,'origem':sheet,'metodo':'Símbolo reconstruído em curvas Bézier; lettering geométrico refinado em contornos; cores planas da marca.'})
    (OUT/'proveniencia.json').write_text(json.dumps(registry,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'LEIA-ME.md').write_text('# Tem Link Aqui — vetores 01, 09 e 19\n\nSVGs com contornos editáveis, transparência real e sem dependência de fontes.\n\nCada opção inclui logo colorida, preta e branca, símbolo separado, assinatura e versão para a galeria. Azul #0A192F e turquesa #4AF9EB. Os gradientes das imagens de conceito foram substituídos por cores planas.\n\nSímbolos reconstruídos geometricamente. Lettering redesenhado geometricamente para eliminar irregularidades da imagem de conceito. Proporções e destaques de cor preservados; curvas e hastes regularizadas.\n\nNão foram verificadas exclusividade de marca, impressão física nem bordado. Ajustar espessuras mínimas ao processo do fornecedor. Os PNGs são prévias; os SVGs são os arquivos vetoriais.\n',encoding='utf-8')
    print(f'{len(registry)} marcas; {len(list(OUT.rglob("*.svg")))} SVGs verificados em {OUT}')


if __name__ == '__main__':
    main()
