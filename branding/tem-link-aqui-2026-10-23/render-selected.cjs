const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require(path.join(process.cwd(), 'frontend/node_modules/sharp'));
const base = path.join(__dirname, 'vetores-01-09-19');
const registry = JSON.parse(fs.readFileSync(path.join(base, 'proveniencia.json'), 'utf8'));

(async () => {
  const tiles = [];
  for (const [index, entry] of registry.entries()) {
    const folder = path.join(base, entry.pasta);
    await sharp(path.join(folder, 'logo-colorida.svg')).resize(1600).png().toFile(path.join(folder, 'previa.png'));
    tiles.push({ input: await sharp(path.join(folder, 'galeria.svg')).resize(561, 701).png().toBuffer(), left: index * 561, top: 45 });
    for (const size of [16, 32, 64, 512]) {
      const rendered = await sharp(path.join(folder, 'simbolo.svg')).resize(size, size, { fit: 'contain', background: '#ffffff00' }).raw().toBuffer({ resolveWithObject: true });
      assert.equal(rendered.info.width, size);
      assert.equal(rendered.info.channels, 4);
      assert(rendered.data.some((value, i) => i % 4 === 3 && value > 0), 'Empty symbol');
      tiles.push({ input: await sharp(rendered.data, { raw: rendered.info }).png().toBuffer(), left: index * 561 + (size === 512 ? 24 : 60 + [16, 32, 64].indexOf(size) * 140), top: size === 512 ? 1400 : 770 });
    }
    tiles.push({ input: await sharp(path.join(folder, 'logo-branca.svg')).resize(480, 490, { fit: 'contain', background: '#0A192F' }).flatten({ background: '#0A192F' }).png().toBuffer(), left: index * 561 + 40, top: 880 });
  }
  const headings = registry.map((entry, index) => `<text x="${index * 561 + 280}" y="40" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="26" font-weight="600" fill="#0A192F">${entry.numero} — ${entry.nome}</text>`).join('');
  tiles.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1683" height="55">${headings}</svg>`), left: 0, top: 0 });
  await sharp({ create: { width: 1683, height: 1930, channels: 3, background: '#ffffff' } }).composite(tiles).png().toFile(path.join(base, 'validacao-escalas.png'));
  await sharp(path.join(base, 'validacao-escalas.png')).extract({ left: 0, top: 0, width: 1683, height: 746 }).png().toFile(path.join(base, 'previa-tres-vetores.png'));
  console.log('3 previews, symbol rendering at 16/32/64/512px and reversed variants verified.');
})().catch(error => { console.error(error); process.exitCode = 1; });
