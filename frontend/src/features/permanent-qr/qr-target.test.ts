import { expect,it } from 'vitest'
import { qrExportOptions,stableQrTarget } from './qr-target'
it('F13-U01/T01 encodes only the trusted published page or permanent handle, never a temporary invite',()=>{
  expect(stableQrTarget('https://temlinkaqui.com',{kind:'PROFILE',path:'/p/minha-pagina'})).toEqual({kind:'PROFILE',url:'https://temlinkaqui.com/p/minha-pagina',name:'minha-pagina'})
  const id='254943b4-384e-4644-83fe-5fc14638a66e'
  expect(stableQrTarget('http://profiles.localhost:3200',{kind:'REDIRECT',path:'/r/'+id}).url).toBe('http://profiles.localhost:3200/r/'+id)
  for(const path of ['https://t.me/temporario','//evil.test/p/alguem','/painel/perfil/previa','/p/nome?token=segredo','/p/nome#oculto','/p/../admin','/p/%2fprivado','/r/not-a-handle'])expect(()=>stableQrTarget('https://temlinkaqui.com',{kind:'PROFILE',path})).toThrow()
})
it('F13-U02 rejects hostile origins, credentials, tracking and insecure nonlocal HTTP',()=>{
  for(const origin of ['javascript:alert(1)','https://user:secret@temlinkaqui.com','https://temlinkaqui.com/path','https://temlinkaqui.com?token=x','http://temlinkaqui.com','https://temlinkaqui.com\n'])expect(()=>stableQrTarget(origin,{kind:'PROFILE',path:'/p/pagina'})).toThrow()
})
it('F13-U03 validates exact export formats and sizes before invoking the renderer',()=>{
  expect(qrExportOptions('png',512)).toEqual({format:'png',size:512,mime:'image/png'})
  expect(qrExportOptions('svg',1024)).toEqual({format:'svg',size:1024,mime:'image/svg+xml'})
  for(const size of [0,-1,255,512.5,Infinity,'512',4096])expect(()=>qrExportOptions('png',size)).toThrow()
  for(const format of ['jpg','html','PNG','image/png',null])expect(()=>qrExportOptions(format,512)).toThrow()
})
it('F13-U04/T02 destination edits cannot affect the permanent handle payload or introduce contact data',()=>{
  const source={kind:'REDIRECT' as const,path:'/r/254943b4-384e-4644-83fe-5fc14638a66e'}
  const first=stableQrTarget('https://temlinkaqui.com',{...source,destination:'https://t.me/primeiro',email:'sentinela@privado.test'} as typeof source)
  const next=stableQrTarget('https://temlinkaqui.com',{...source,destination:'https://t.me/segundo'} as typeof source)
  expect(next).toEqual(first);expect(JSON.stringify(first)).not.toContain('privado');expect(JSON.stringify(first)).not.toContain('t.me')
})
