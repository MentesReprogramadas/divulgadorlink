import {test,expect} from '@playwright/test'

test('convite inicia no HTML de produção antes dos bundles React e usa um único CSRF',async({page})=>{
  const slug='early-natal',requests:Array<{kind:string;body:Record<string,unknown>}>=[]
  await page.context().addCookies([{name:'tla_consent',value:'denied',domain:'localhost',path:'/'}])
  await page.route('**/_next/static/**/*.js',route=>route.abort())
  await page.route('**/bff/v1/auth/csrf',route=>{requests.push({kind:'csrf',body:{}});return route.fulfill({json:{csrfToken:'b'.repeat(64)},headers:{'set-cookie':'csrf='+ 'b'.repeat(64)+'; Path=/; SameSite=Lax'}})})
  await page.route('**/bff/v1/public/affiliates/'+slug+'/visit',route=>{requests.push({kind:'visit',body:route.request().postDataJSON()});return route.fulfill({json:{recorded:true}})})
  await page.route('**/bff/v1/public/affiliates/'+slug+'/join',route=>{requests.push({kind:'join',body:route.request().postDataJSON()});expect(route.request().headers()['x-csrf-token']).toBe('b'.repeat(64));return route.fulfill({json:{url:'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'}})})
  await page.route('https://chat.whatsapp.com/**',route=>route.fulfill({body:'Destino isolado, sem ingresso'}))
  await page.goto('/ofertas/entrar/'+slug,{waitUntil:'commit'})
  await page.waitForURL('https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
  expect(requests.filter(r=>r.kind==='csrf')).toHaveLength(1)
  expect(requests.filter(r=>r.kind==='visit')).toHaveLength(1)
  expect(requests.filter(r=>r.kind==='join')).toEqual([{kind:'join',body:{source:'AUTOMATIC',eventId:expect.any(String)}}])
})

test('erro do convite antecipado passa ao React e permite retry manual sem duplicar visita',async({page})=>{
  const slug='early-retry'
  let joins=0,visits=0,csrf=0
  const sources:string[]=[]
  await page.context().addCookies([{name:'tla_consent',value:'denied',domain:'localhost',path:'/'}])
  await page.route('**/bff/v1/auth/csrf',route=>{csrf++;return route.fulfill({json:{csrfToken:'c'.repeat(64)},headers:{'set-cookie':'csrf='+ 'c'.repeat(64)+'; Path=/; SameSite=Lax'}})})
  await page.route('**/bff/v1/public/affiliates/'+slug+'/visit',route=>{visits++;return route.fulfill({json:{recorded:true}})})
  await page.route('**/bff/v1/public/affiliates/'+slug+'/join',route=>{joins++;sources.push(route.request().postDataJSON().source);return joins===1?route.fulfill({status:503,json:{message:'Não foi possível conferir o grupo agora.'}}):route.fulfill({json:{url:'https://chat.whatsapp.com/AbCdEf0123456789AbCdEf'}})})
  await page.route('https://chat.whatsapp.com/**',route=>route.fulfill({body:'Destino isolado, sem ingresso'}))
  await page.goto('/ofertas/entrar/'+slug)
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Não foi possível conferir o grupo agora.')
  expect(joins).toBe(1);expect(visits).toBe(1);expect(csrf).toBe(1)
  await page.getByRole('button',{name:'Tentar novamente',exact:true}).click()
  await page.waitForURL('https://chat.whatsapp.com/AbCdEf0123456789AbCdEf')
  expect(sources).toEqual(['AUTOMATIC','BUTTON']);expect(visits).toBe(1);expect(csrf).toBe(1)
})
