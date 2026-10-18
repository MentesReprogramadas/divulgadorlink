// @vitest-environment node
import { afterEach,expect,it,vi } from 'vitest'
import { generateQr } from './generate-qr'
import { stableQrTarget } from './qr-target'
afterEach(()=>vi.restoreAllMocks())
const target=stableQrTarget('https://temlinkaqui.com',{kind:'PROFILE',path:'/p/pagina-publicada'})
it('F13-I01/T01 exports actual PNG and SVG with correct MIME, size and stable safe payload without external calls',async()=>{
  const network=vi.spyOn(globalThis,'fetch').mockRejectedValue(new Error('No external service allowed'))
  const png=await generateQr(target,'png',512),svg=await generateQr(target,'svg',1024)
  expect(png.url).toBe(target.url);expect(png.blob.type).toBe('image/png')
  const bytes=new Uint8Array(await png.blob.arrayBuffer());expect([...bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10])
  const header=new DataView(bytes.buffer);expect(header.getUint32(16)).toBe(512);expect(header.getUint32(20)).toBe(512)
  const xml=await svg.blob.text();expect(svg.blob.type).toBe('image/svg+xml');expect(xml).toContain('<svg');expect(xml).toContain('width="1024"');expect(xml).toContain('height="1024"');expect(xml).not.toMatch(/<script|foreignObject|onload=|private@example/)
  expect(network).not.toHaveBeenCalled()
})
it('F13-I03 repeat generation is deterministic and never puts untrusted labels or temporary destinations in the file name',async()=>{
  const first=await generateQr({...target,name:'../private@example.test'},'png',256),second=await generateQr(target,'png',256)
  expect(first.filename).toBe('temlinkaqui-pagina-pagina-publicada-256.png');expect(first.preview).toBe(second.preview)
  await expect(generateQr({...target,url:target.url+'?token=private'},'png',512)).rejects.toThrow()
  await expect(generateQr(target,'html',512)).rejects.toThrow();await expect(generateQr(target,'png',-1)).rejects.toThrow()
})
