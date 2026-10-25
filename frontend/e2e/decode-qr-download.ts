import {buffer} from 'node:stream/consumers'
import jsQR from 'jsqr'
import {expect,type Page,type Download} from '@playwright/test'
export async function decodeQrDownload(page:Page,download:Download){
  const bytes=await buffer(await download.createReadStream()),mime=download.suggestedFilename().endsWith('.svg')?'image/svg+xml':'image/png'
  if(mime==='image/svg+xml'){expect(bytes.toString('utf8')).toContain('<svg');expect(bytes.toString('utf8')).not.toMatch(/<script|foreignObject|onload=/)}else expect([...bytes.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10])
  // Rasterize the actual downloaded file, then use an independent decoder. No image mocks.
  const pixels=await page.evaluate(async({base64,mime})=>{
    const image=new Image();image.src='data:'+mime+';base64,'+base64;await image.decode()
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight
    const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable')
    context.drawImage(image,0,0);return{width:canvas.width,height:canvas.height,data:Array.from(context.getImageData(0,0,canvas.width,canvas.height).data)}
  },{base64:bytes.toString('base64'),mime})
  const result=jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height,{inversionAttempts:'dontInvert'})
  expect(result,'Exported QR must be readable').not.toBeNull()
  return{payload:result!.data,width:pixels.width,height:pixels.height,bytes,mime,name:download.suggestedFilename()}
}
