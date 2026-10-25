const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '../..');
const sharp = require(path.join(root, 'frontend/node_modules/sharp'));
const { chromium } = require(path.join(root, 'frontend/node_modules/@playwright/test'));
const out = path.join(__dirname, 'marca-confluencia');
const publicBrand = path.join(root, 'frontend/public/brand/confluencia');
const navy = '#0a192f', mint = '#4af9eb', white = '#ffffff';
const source = path.join(__dirname, 'confluencia');
const exportsList = [];
function write(file, content) {
  const dest = path.join(out, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  return dest;
}
function copyChanged(source, target) {
  if (fs.existsSync(target) && fs.readFileSync(target).equals(fs.readFileSync(source))) return;
  fs.copyFileSync(source, target);
}
function readSvg(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const box = raw.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const body = raw.replace(/^[\s\S]*?<svg\b[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<title\b[^>]*>[\s\S]*?<\/title>/g, '');
  return { box, body };
}
const symbol = readSvg(path.join(source, 'logo/simbolo.svg')).body;
const masters = Object.fromEntries([['horizontal', 'horizontal-cor'], ['vertical', 'vertical-cor'], ['simbolo', 'simbolo'], ['assinatura', 'wordmark']].map(([name, file]) => [name, readSvg(path.join(source, `logo/${file}.svg`))]));
function svg(body, width, height, title = 'Tem Link Aqui — Confluência', units = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}${units}" height="${height}${units}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title"><title id="title">${title}</title>${body}</svg>`;
}
function paint(body, mode) {
  const colors = { claro: [navy, mint], escuro: [white, mint], navy: [navy, navy], turquesa: [mint, mint], preto: ['#000000', '#000000'], branco: [white, white] }[mode];
  return body.replaceAll(navy, colors[0]).replaceAll(mint, colors[1]);
}
function stamp(x, y, size, mode = 'claro') { return `<g transform="translate(${x} ${y}) scale(${size / 256})">${paint(symbol, mode)}</g>`; }
function lockup(x, y, width, mode = 'claro') { return `<g transform="translate(${x} ${y}) scale(${width / masters.horizontal.box[2]})">${paint(masters.horizontal.body, mode)}</g>`; }
async function png(file, width, density = 72) {
  const dest = file.replace(/\.svg$/, `-${width}.png`);
  await sharp(path.join(out, file), { density: 192 }).resize({ width }).withMetadata({ density }).png().toFile(path.join(out, dest));
  const meta = await sharp(path.join(out, dest)).metadata();
  assert.equal(meta.width, width);
  assert.equal(meta.density, density);
  return dest;
}
function ico(files, dest) {
  const frames = files.map(file => fs.readFileSync(path.join(out, file)));
  const sizes = files.map(file => Number(file.match(/-(\d+)\.png$/)[1]));
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  frames.forEach((frame, i) => {
    const p = 6 + i * 16;
    header[p] = sizes[i] === 256 ? 0 : sizes[i]; header[p + 1] = header[p];
    header.writeUInt16LE(1, p + 4); header.writeUInt16LE(32, p + 6);
    header.writeUInt32LE(frame.length, p + 8); header.writeUInt32LE(offset, p + 12);
    offset += frame.length;
  });
  write(dest, Buffer.concat([header, ...frames]));
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  for (const [name, master] of Object.entries(masters)) {
    for (const mode of ['claro', 'escuro', 'navy', 'turquesa', 'preto', 'branco']) {
      const file = `logos/${name}-${mode}.svg`;
      write(file, svg(paint(master.body, mode), master.box[2], master.box[3]));
      const sizes = name === 'simbolo' ? [256, 512, 1024, 2048] : [600, 1200, 2400];
      const pngs = [];
      for (const size of sizes) pngs.push(await png(file, size));
      exportsList.push({ name, mode, svg: file, png: pngs });
    }
    for (const [background, color, mode] of [['branco', white, 'claro'], ['navy', navy, 'escuro'], ['turquesa', mint, 'navy']]) {
      const file = `fundos/${name}-fundo-${background}.svg`;
      write(file, svg(`<rect width="${master.box[2]}" height="${master.box[3]}" fill="${color}"/>${paint(master.body, mode)}`, master.box[2], master.box[3]));
      await png(file, name === 'simbolo' ? 1024 : 2400);
    }
  }
  const adaptive = paint(symbol, 'navy').replaceAll(`fill="${navy}"`, `class="ink" fill="${navy}"`);
  write('web/favicon.svg', svg(adaptive + '<style>@media(prefers-color-scheme:dark){.ink{fill:#ffffff}}</style>', 256, 256));
  write('web/favicon-claro.svg', svg(paint(symbol, 'navy'), 256, 256));
  write('web/favicon-escuro.svg', svg(paint(symbol, 'branco'), 256, 256));
  const frames = [];
  for (const size of [16, 24, 32, 48, 64, 128, 256]) frames.push(await png('web/favicon-claro.svg', size));
  ico(frames.filter(file => !/-24\.|-128\./.test(file)), 'web/favicon.ico');
  const darkFrames=[];
  for (const size of [16,24,32,48,64,128,256]) darkFrames.push(await png('web/favicon-escuro.svg',size));
  ico(darkFrames.filter(file=>!/-24\.|-128\./.test(file)),'web/favicon-escuro.ico');
  for (const [name, mode, background, size] of [['app', 'escuro', navy, 204], ['maskable', 'escuro', navy, 128], ['avatar-claro', 'claro', white, 190], ['avatar-escuro', 'escuro', navy, 190]]) {
    write(`web/${name}.svg`, svg(`<rect width="256" height="256" fill="${background}"/>${stamp((256-size)/2,(256-size)/2,size,mode)}`, 256, 256));
    for (const width of name === 'app' ? [180,192,512,1024] : name === 'maskable' ? [512] : [512,1024]) await png(`web/${name}.svg`, width);
  }
  write('web/site.webmanifest', JSON.stringify({ name:'Tem Link Aqui', short_name:'Tem Link Aqui', display:'standalone', background_color:navy, theme_color:navy, icons:[{src:'app-192.png',sizes:'192x192',type:'image/png'},{src:'app-512.png',sizes:'512x512',type:'image/png'},{src:'maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]}, null, 2));
  for (const [format, width, height] of [['post',1080,1080],['story',1080,1920],['capa',1200,630],['linkedin',1584,396],['youtube',2560,1440]]) {
    for (const mode of ['claro','escuro']) {
      const background = mode === 'claro' ? white : navy;
      const logoWidth = format === 'youtube' ? 1100 : format === 'linkedin' ? 1050 : width * .8;
      const logoHeight = logoWidth / 1380 * 256;
      const artwork = `<rect width="${width}" height="${height}" fill="${background}"/>` + lockup((width-logoWidth)/2,(height-logoHeight)/2,logoWidth,mode) + `<rect x="${width*.1}" y="${height*.88}" width="${width*.8}" height="8" fill="${mint}"/>`;
      const file = `social/${format}-${mode}.svg`;
      write(file, svg(artwork,width,height));
      await png(file,width);
    }
  }
  for (const folder of ['print','sistema']) {
    fs.mkdirSync(path.join(out,folder),{recursive:true});
    for (const file of fs.readdirSync(path.join(source,folder))) fs.copyFileSync(path.join(source,folder,file),path.join(out,folder,file));
  }
  for (const file of fs.readdirSync(path.join(out,'print')).filter(file=>file.endsWith('.svg'))) {
    const dest=path.join(out,'print',file);
    const raw=fs.readFileSync(dest,'utf8').replace(/<text\b[^>]*>[\s\S]*?<\/text>/g,'');
    fs.writeFileSync(dest,raw);
    const width=Number(raw.match(/width="([\d.]+)mm"/)[1]),height=Number(raw.match(/height="([\d.]+)mm"/)[1]);
    await sharp(dest,{density:192}).resize(Math.round(width/25.4*300),Math.round(height/25.4*300)).withMetadata({density:300}).png().toFile(dest.replace(/\.svg$/,'.png'));
  }
  fs.copyFileSync(path.join(source,'mockup.png'),write('aplicacoes/mockup.png',Buffer.alloc(0)));
  fs.copyFileSync(path.join(source,'mockup.webp'),path.join(out,'aplicacoes/mockup.webp'));
  fs.copyFileSync(path.join(source,'PROMPT-MOCKUP.txt'),path.join(out,'aplicacoes/PROMPT-MOCKUP.txt'));
  fs.mkdirSync(path.join(out,'assets'),{recursive:true});
  for (const file of ['outfit.ttf','OFL-Outfit.txt']) fs.copyFileSync(path.join(__dirname,'assets',file),path.join(out,'assets',file));
  const label = {horizontal:'Logo horizontal',vertical:'Logo vertical',simbolo:'Símbolo',assinatura:'Assinatura'};
  const modes = {claro:'Colorida · fundo claro',escuro:'Colorida · fundo escuro',navy:'Uma cor · navy',turquesa:'Uma cor · turquesa',preto:'Preta',branco:'Branca'};
  const tiles = exportsList.map(item=>`<article><div class="art ${['escuro','branco'].includes(item.mode)?'dark':'light'}"><img src="${item.svg}" alt="${label[item.name]} — ${modes[item.mode]}" loading="lazy"></div><h3>${label[item.name]}</h3><p>${modes[item.mode]} · transparente</p><a download href="${item.svg}">SVG</a> ${item.png.map(file=>`<a download href="${file}">PNG ${file.match(/-(\d+)\.png$/)[1]}</a>`).join(' ')}</article>`).join('');
  const style = '@font-face{font-family:Outfit;src:url(assets/outfit.ttf)}*{box-sizing:border-box}body{margin:0;font-family:Outfit,sans-serif;color:#0a192f;background:#f5f7fa}header,main,footer{max-width:1480px;margin:auto;padding:40px clamp(20px,5vw,72px)}h1{font-size:clamp(44px,7vw,86px);line-height:1;letter-spacing:-.03em;font-weight:500;margin:24px 0}h2{font-size:clamp(30px,4vw,48px);font-weight:500;margin:64px 0 20px}h3{font-size:20px;margin:18px 0 8px}p{line-height:1.6;max-width:70ch}a{color:inherit;text-underline-offset:4px;display:inline-flex;align-items:center;min-height:44px;margin-right:12px}a:focus-visible{outline:3px solid #0a192f;outline-offset:4px}.download{background:#0a192f;color:white;padding:12px 22px;text-decoration:none}.hero{display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.hero img{width:100%;height:auto}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:36px 24px}.art{height:220px;display:flex;align-items:center;justify-content:center;padding:28px}.art img{width:100%;height:100%;object-fit:contain}.dark{background:#0a192f}.light{background:#fff}article{min-width:0}article p{margin:0 0 8px}article a{font-size:14px}nav{display:flex;flex-wrap:wrap;gap:8px 24px}.note{font-size:14px;color:#34445a}.palette{display:flex;flex-wrap:wrap;gap:16px}.palette div{padding:30px;min-width:180px}.swatch-dark{background:#0a192f;color:white}.swatch-mint{background:#4af9eb}.swatch-white{background:white}@media(max-width:900px){.grid{grid-template-columns:1fr 1fr}.hero{grid-template-columns:1fr}}@media(max-width:540px){.grid{grid-template-columns:1fr}header,main,footer{padding-top:24px;padding-bottom:24px}.art{height:240px}}';
  write('index.html',`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Tem Link Aqui — marca Confluência</title><link rel="icon" href="web/favicon.svg"><style>${style}</style></head><body><header><nav aria-label="Navegação do kit"><a href="#logos">Logos</a><a href="#digital">Ícones e redes sociais</a><a href="#producao">Produção</a><a href="manual.pdf">Manual PDF</a></nav><div class="hero"><div><h1>A nova marca<br>Tem Link Aqui.</h1><p>Confluência foi escolhida. Caminhos diferentes, interesses em comum. Aqui estão as artes oficiais em SVG e PNG, organizadas para cada fundo e tamanho.</p><a class="download" href="tem-link-aqui-confluencia-kit.zip" download>Baixar o kit completo</a></div><img src="aplicacoes/mockup.webp" alt="Confluência aplicada em camisas, boné, moletom, ecobag, caneca e papelaria" width="1536" height="1024"></div></header><main><section id="logos"><h2>Uma marca. Todas as versões.</h2><p>Os SVGs são vetores editáveis e não dependem de fontes. Os PNGs desta seção têm fundo transparente. A versão branca aparece sobre navy nesta prévia.</p><div class="grid">${tiles}</div></section><section id="digital"><h2>Pequena na aba. Presente na tela.</h2><div class="grid">${['web/favicon.svg','web/app.svg','web/avatar-claro.svg'].map(file=>`<article><div class="art light"><img src="${file}" alt="${file.includes('favicon')?'Favicon adaptativo':file.includes('app')?'Ícone de aplicativo':'Avatar em fundo branco'}"></div><a href="${file}" download>Baixar SVG</a></article>`).join('')}</div><p><a href="web/favicon.ico" download>Favicon ICO</a><a href="web/favicon.svg" download>Favicon SVG adaptativo</a><a href="web/app-180.png" download>Apple Touch 180</a><a href="web/app-512.png" download>App 512</a><a href="web/maskable-512.png" download>Maskable</a></p><p>Favicons PNG: 16, 24, 32, 48, 64, 128 e 256 px. Avatares: 512 e 1024 px. Post, story e capas para compartilhamento, LinkedIn e YouTube estão no ZIP, em claro e escuro. O manifest é referência para uma futura configuração; não ativa recursos no site.</p></section><section id="producao"><h2>Do desenho para o material.</h2><div class="palette"><div class="swatch-dark">Navy<br>#0A192F</div><div class="swatch-mint">Turquesa<br>#4AF9EB</div><div class="swatch-white">Branco<br>#FFFFFF</div></div><p><a href="print/peito-35mm.svg" download>Peito · SVG 35 mm</a><a href="print/camisa-costas-280mm.svg" download>Costas · SVG 280 mm</a><a href="print/ecobag-240mm.svg" download>Ecobag</a><a href="print/caneca-200x85mm.svg" download>Caneca</a><a href="print/cartao-frente-com-sangria.svg" download>Cartão</a></p><p>Artes vetoriais em tamanho físico e PNG a 300 ppi. RGB, sem conversão CMYK ou Pantone presumida. O fornecedor deve aprovar gabarito, área imprimível e prova de cor; bordado exige digitalização própria.</p><p class="note">A fotografia é uma simulação por IA e pode variar do desenho exato. Use os SVGs para produção.</p></section></main><footer><a href="README.md">Guia de arquivos</a><a href="manifesto-arquivos.json">Inventário e integridade</a><p class="note">Marca aprovada pelo usuário em 23/10/2026. Não houve pesquisa de registro, impressão física ou validação de bordado.</p></footer></body></html>`);
  const page = (title,body) => `<section class="page"><h1>${title}</h1>${body}</section>`;
  const pages = [
    page('Tem Link Aqui — Confluência', '<p>A marca escolhida · 23/10/2026</p><img class="mockup" src="aplicacoes/mockup.webp" alt="Aplicações da marca"><p>Simulação por IA. SVGs são a fonte de verdade.</p>'),
    page('Caminhos diferentes. Interesses em comum.', '<img class="signature" src="logos/horizontal-claro.svg" alt="Assinatura oficial"><p>Dois ramos convergem no mesmo ponto. O nome da marca continua Tem Link Aqui; Confluência identifica a direção visual escolhida.</p><div class="palette"><div class="swatch-dark">Navy #0A192F</div><div class="swatch-mint">Turquesa #4AF9EB</div><div class="swatch-white">Branco #FFFFFF</div></div><p>Lettering geométrico próprio, em contornos. Outfit é usada nas apresentações, sob SIL OFL. Tom direto, próximo e curioso. Convidar à descoberta, sem promessa de alcance ou resultado.</p>'),
    page('Clara, escura e em uma cor.', '<div class="variants"><img src="logos/horizontal-claro.svg" alt="Clara"><div class="dark"><img src="logos/horizontal-escuro.svg" alt="Escura"></div><img src="logos/horizontal-preto.svg" alt="Preta"><div class="dark"><img src="logos/horizontal-branco.svg" alt="Branca"></div></div><p>Logos horizontais e verticais, assinatura e símbolo. Fundo transparente ou aplicado em branco, navy e turquesa. Não usar navy sobre navy nem branco sobre branco. Turquesa funciona como acento; em marca pequena sobre fundo claro, preferir navy monocromático.</p>'),
    page('Ícones e presença digital.', '<div class="digital-row"><img src="web/app-512.png" alt="App"><img src="web/avatar-claro-512.png" alt="Avatar claro"><img src="web/maskable-512.png" alt="Maskable"></div><p>Favicon SVG adapta a tinta à preferência de cor do navegador. ICO possui 16/32/48/64/256 px; PNG inclui 24 e 128 px. Apple Touch 180, app 192/512/1024 e maskable 512.</p><p>Post 1080×1080, story 1080×1920, capa 1200×630, LinkedIn 1584×396 e YouTube 2560×1440, em claro e escuro. Conferir o recorte real de cada plataforma. O manifest do kit não instala uma PWA por si só.</p>'),
    page('Do vetor ao tecido e ao papel.', '<div class="print-row"><img src="print/camisa-costas-280mm.svg" alt="Costas"><img src="print/cartao-frente-com-sangria.svg" alt="Cartão"></div><p>Peito: canvas 35 mm. Costas: largura 280 mm. Ecobag: 240×240 mm. Caneca: 200×85 mm. Adesivo: 60 mm. Cartão: 90×50 mm, sangria ilustrativa de 3 mm. As medidas são estudos, sujeitos ao gabarito do fornecedor.</p><p>SVGs em RGB; PNGs de impressão em 300 ppi. Digitalização de bordado, faca, separação de tinta, CMYK e Pantone dependem de processo e prova. Nenhuma peça foi fabricada.</p>'),
    page('Preservar o que faz a marca funcionar.', '<img class="signature" src="logos/horizontal-claro.svg" alt="Logo"><p>Reservar ao menos 1/8 do canvas do símbolo em volta da marca. Símbolo a partir de 24 px para uso geral; favicon 16 px como exceção, conferido na renderização. Assinatura horizontal a partir de 160 px. Em rodapés pequenos, usar wordmark sem símbolo, a partir de 90 px.</p><p>Não esticar, girar, acrescentar efeitos ou alterar a relação símbolo/nome. Preservar o canal central e as pontas. Conferir aplicação pequena e prova têxtil. A marca não substitui ícones de ação, rede ou categoria.</p><p>O pacote separa logos, fundos, web, social, print, sistema e aplicações. Inventário com hashes SHA-256 acompanha os arquivos. Sem pesquisa jurídica, teste com público ou certificação de acessibilidade total.</p>'),
  ];
  write('manual.html',`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Manual Confluência</title><style>${style}.page{width:297mm;height:210mm;padding:16mm 19mm;break-after:page;background:#fff;overflow:hidden}.page:last-child{break-after:auto}.page h1{font-size:30pt;margin:0 0 10mm}.page p{font-size:12pt;line-height:1.5;max-width:none}.mockup{height:129mm;max-width:100%;object-fit:contain}.signature{width:220mm;max-height:45mm}.variants{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.variants img{width:100%;height:32mm;object-fit:contain}.variants .dark{padding:4mm}.digital-row{display:flex;gap:14mm;margin-bottom:8mm}.digital-row img{width:46mm;height:46mm}.print-row{display:flex;gap:12mm;align-items:center}.print-row img{max-width:112mm;max-height:95mm}.page .palette div{font-size:13pt;padding:8mm}.page .palette{margin:8mm 0}@page{size:A4 landscape;margin:0}@media print{body{background:white}header,main,footer{padding:0}}</style></head><body>${pages.join('')}</body></html>`);
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(out,'manual.html')).href);
    await page.evaluate(()=>document.fonts.ready);
    await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    assert.equal(await page.locator('.page').count(),6);
    assert.deepEqual(await page.locator('.page').evaluateAll(pages=>pages.map((el,i)=>({page:i+1,overflow:el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1})).filter(item=>item.overflow)),[]);
    await page.pdf({path:path.join(out,'manual.pdf'),printBackground:true,preferCSSPageSize:true,tagged:true});
    for (const [name,mode,width] of [['horizontal','claro',138],['horizontal','preto',138],['vertical','claro',76.8],['simbolo','claro',50]]) {
      const master=masters[name],height=width*master.box[3]/master.box[2];
      const file=`pdf/${name}-${mode}.pdf`;
      fs.mkdirSync(path.join(out,'pdf'),{recursive:true});
      await page.setContent(`<html><head><style>html,body{margin:0;padding:0}svg{display:block;width:100%;height:100%}</style></head><body>${svg(paint(master.body,mode),master.box[2],master.box[3])}</body></html>`);
      const data=await page.pdf({path:path.join(out,file),width:`${width}mm`,height:`${height}mm`,margin:{top:0,bottom:0,left:0,right:0},printBackground:true});
      assert(!/\/Subtype\s*\/Image\b/.test(data.toString('latin1')),`${file} must remain vector`);
    }
  } finally { await browser.close(); }
  const archive = path.join(__dirname,'arquivo-direcoes-anteriores');
  for (const [file,name] of [['frontend/public/logo.svg','site-logo-anterior.svg'],['frontend/src/app/icon.png','site-icon-anterior.png']]) if (!fs.existsSync(path.join(archive,name))) fs.copyFileSync(path.join(root,file),path.join(archive,name));
  fs.mkdirSync(publicBrand,{recursive:true});
  for (const item of exportsList) copyChanged(path.join(out,item.svg),path.join(publicBrand,path.basename(item.svg)));
  for (const file of ['favicon.svg','favicon.ico','app-180.png','app-192.png','app-512.png','maskable-512.png']) copyChanged(path.join(out,'web',file),path.join(publicBrand,file));
  copyChanged(path.join(out,'social/capa-claro-1200.png'),path.join(publicBrand,'capa-clara.png'));
  copyChanged(path.join(out,'social/capa-escuro-1200.png'),path.join(publicBrand,'capa-escura.png'));
  copyChanged(path.join(out,'logos/horizontal-claro.svg'),path.join(root,'frontend/public/logo.svg'));
  copyChanged(path.join(out,'web/app-512.png'),path.join(root,'frontend/src/app/icon.png'));
  copyChanged(path.join(out,'web/favicon.svg'),path.join(root,'frontend/src/app/icon1.svg'));
  const previousSvg=path.join(root,'frontend/src/app/icon.svg');
  if (fs.existsSync(previousSvg) && fs.readFileSync(previousSvg).equals(fs.readFileSync(path.join(out,'web/favicon.svg')))) fs.unlinkSync(previousSvg);
  copyChanged(path.join(out,'web/favicon.ico'),path.join(root,'frontend/src/app/favicon.ico'));
  copyChanged(path.join(out,'web/app-180.png'),path.join(root,'frontend/src/app/apple-icon.png'));
  write('README.md','# Tem Link Aqui — Confluência\n\nIdentidade aprovada pelo usuário em 23/10/2026. O nome do produto continua Tem Link Aqui.\n\n- logos/: SVG e PNG transparentes, horizontal, vertical, símbolo e assinatura; claro, escuro, navy, turquesa, preto e branco.\n- fundos/: versões sobre branco, navy e turquesa.\n- web/: favicon SVG adaptativo, versões fixas, ICO multirresolução, PNG, Apple Touch, app, avatar e maskable.\n- social/: post, story e capas de compartilhamento/LinkedIn/YouTube; claro e escuro.\n- pdf/: logos vetoriais para fornecedores, sem imagens raster embutidas.\n- print/: SVG em tamanho físico e PNG 300 ppi para camisa, ecobag, caneca, adesivo e cartão.\n- sistema/: padrão derivado da marca.\n- aplicacoes/: mockup conceitual gerado com a ferramenta nativa ImageGen, usando a logo de referência. Prompt integral incluído.\n\nPaleta: #0A192F, #4AF9EB, #FFFFFF. SVGs não dependem de fontes. Outfit da apresentação acompanha licença SIL OFL. Não há EPS/AI fictício nem imagem raster embutida nos masters. PDF é manual de apresentação.\n\nUsar -claro sobre fundo claro, -escuro sobre navy e -branco em uma tinta sobre escuro. Não escolher automaticamente a logo escura pela preferência do sistema se a superfície real continua branca. O produto permanece com o tema claro atual; fornecemos assets para ambos os temas, sem criar um tema novo na aplicação. A preferência do navegador adapta somente o favicon SVG.\n\nNo site: /logo.svg é a assinatura canônica consumida por cabeçalho, menu e renderização do kit de divulgação. Rodapés de páginas pessoais usam a assinatura sem símbolo em /brand/confluencia/assinatura-claro.svg para preservar legibilidade. App Router recebe icon.png, icon1.svg, favicon.ico e apple-icon.png. /brand/confluencia/ contém alternativas explícitas. O manifest do kit não foi integrado: não altera instalação, sessão nem comportamento do produto.\n\nPara impressão, confirmar gabarito e prova com o fornecedor. Artes em RGB; sem equivalências CMYK/Pantone presumidas. Bordado exige digitalização DST/PES por fornecedor. Mockups podem variar do vetor. Não houve prova física nem pesquisa de registro de marca.\n');
  const files = [];
  function inventory(folder) { for (const item of fs.readdirSync(folder,{withFileTypes:true})) { const file=path.join(folder,item.name); if(item.isDirectory())inventory(file);else if(!['manifesto-arquivos.json','tem-link-aqui-confluencia-kit.zip'].includes(item.name)){const data=fs.readFileSync(file);files.push({file:path.relative(out,file).replaceAll('\\','/'),bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')});} } }
  inventory(out);
  for (const item of files.filter(item=>item.file.endsWith('.svg'))) { const raw=fs.readFileSync(path.join(out,item.file),'utf8'); assert(!/<(?:\w+:)?(?:image|text|filter|mask)\b/.test(raw),item.file); }
  write('manifesto-arquivos.json',JSON.stringify({brand:'Tem Link Aqui',direction:'Confluência',approved:'2026-10-23',palette:[navy,mint,white],files},null,2));
  console.log(`${files.length} assets and documents generated; 6-page PDF checked; site logo and App Router icons installed.`);
}
main().catch(error=>{console.error(error);process.exitCode=1});
