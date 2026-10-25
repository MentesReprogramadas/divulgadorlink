import {afterEach,expect,it,vi} from 'vitest'
import {prepareLinkMediaFile} from './prepare-link-media'
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
it('rejects unsupported and oversized originals before decoding',async()=>{
  const decode=vi.fn();vi.stubGlobal('createImageBitmap',decode)
  await expect(prepareLinkMediaFile(new File(['<svg/>'],'a.svg',{type:'image/svg+xml'}),'image')).rejects.toThrow()
  await expect(prepareLinkMediaFile(new File([new Uint8Array(5242881)],'a.png',{type:'image/png'}),'image')).rejects.toThrow()
  expect(decode).not.toHaveBeenCalled()
})
it('preserves aspect ratio, bounds the cover and closes decoded pixels',async()=>{
  const close=vi.fn(),drawImage=vi.fn(),canvas=document.createElement('canvas')
  vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:3200,height:1600,close})))
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage} as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(function(this:HTMLCanvasElement){canvas.width=this.width;canvas.height=this.height;return 'data:image/webp;base64,cGl4ZWxz'})
  expect(await prepareLinkMediaFile(new File(['pixels'],'a.png',{type:'image/png'}),'image')).toBe('cGl4ZWxz')
  expect([canvas.width,canvas.height]).toEqual([1600,800]);expect(close).toHaveBeenCalledOnce()
})
it('closes unsupported dimensions and refuses a browser format fallback',async()=>{
  const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:9000,height:1,close})))
  const file=new File(['pixels'],'a.png',{type:'image/png'})
  await expect(prepareLinkMediaFile(file,'image')).rejects.toThrow('8192')
  vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:100,height:100,close})))
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn()} as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,cGl4ZWxz')
  await expect(prepareLinkMediaFile(file,'image')).rejects.toThrow('navegador atualizado')
  expect(close).toHaveBeenCalledTimes(2)
})
