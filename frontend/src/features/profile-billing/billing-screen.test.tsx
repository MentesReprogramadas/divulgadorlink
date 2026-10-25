import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { BillingScreen } from './billing-screen'
import { safeBillingCheckout, type BillingState, type ProfilePlan } from './billing-contract'
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('./billing-api',()=>({billingRequest:request}))
afterEach(()=>{cleanup();vi.resetAllMocks();window.history.replaceState({},'','/')})
const capabilities=[{key:'profile.page',label:'Sua página',delivered:true}]
const plans:ProfilePlan[]=[{tier:'FREE',title:'Gratuito',versionId:null,amountCents:0,currency:'BRL',interval:'month',available:true,capabilities},{tier:'PRO',title:'Pro',versionId:'pro-version',amountCents:1290,currency:'BRL',interval:'month',available:true,capabilities}]
const state:BillingState={canCheckout:true,checkoutRequirement:null,capabilities:['profile.page'],subscription:null,operations:[]}
function prepare(value:BillingState=state){request.mockImplementation(async(path:string)=>path==='/profile-plans'?{plans}:path==='/me/subscription'?value:{})}
it('F11-C01 returning from payment never activates a plan or submits another checkout',async()=>{
  window.history.replaceState({},'','/painel/assinatura?checkout=returned');prepare();render(<BillingScreen/>)
  await screen.findByRole('article',{name:'Gratuito'})
  expect(screen.getByText(/retornar não ativa o plano/)).toBeTruthy()
  expect(request.mock.calls.every(([,init])=>!init)).toBe(true)
})
it('F11-C02 explicit confirmation and a single pending request protect recurring checkout',async()=>{
  prepare();render(<BillingScreen/>);fireEvent.click(await screen.findByRole('button',{name:'Assinar plano'}))
  expect(request.mock.calls.some(([path])=>path.includes('checkout'))).toBe(false)
  let resolve!:(value:unknown)=>void
  request.mockImplementation((path:string)=>path==='/subscriptions/checkout'?new Promise(done=>{resolve=done}):Promise.resolve(path==='/profile-plans'?{plans}:state))
  const submit=screen.getByRole('button',{name:'Ir para pagamento'});fireEvent.click(submit);fireEvent.click(submit)
  expect(request.mock.calls.filter(([path])=>path==='/subscriptions/checkout')).toHaveLength(1)
  const init=request.mock.calls.find(([path])=>path==='/subscriptions/checkout')![1]
  expect(JSON.parse(init.body)).toEqual({planVersionId:'pro-version',returnPath:'/painel/assinatura'})
  expect(init.headers['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/)
  request.mockImplementation(async(path:string)=>path.includes('billing-operations')?{id:'op',kind:'CHECKOUT',state:'FAILED',checkoutUrl:null,message:'Falha confirmada.'}:path==='/profile-plans'?{plans}:state)
  resolve({operationId:'op'});await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull())
  expect((await screen.findByRole('alert')).textContent).toContain('Falha confirmada.')
})
it('F11-C03 cancel uses the server version, keeps access language and does not change the page content',async()=>{
  prepare({...state,subscription:{id:'sub',planVersionId:'pro-version',canChange:true,tier:'PRO',title:'Pro',status:'ACTIVE',version:7,periodStart:'2026-10-01T00:00:00Z',periodEnd:'2026-11-01T00:00:00Z',paidThrough:'2026-11-01T00:00:00Z',cancelAtPeriodEnd:false,reviewReason:null,resumeCheckoutUrl:null,hasPaidAccess:true,nextPlan:null}})
  render(<BillingScreen/>);fireEvent.click(await screen.findByRole('button',{name:'Cancelar renovação'}));expect(screen.getByRole('dialog').textContent).toContain('página gratuita é preservada')
  request.mockRejectedValue(new Error('A assinatura mudou. Atualize antes de continuar.'))
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}))
  expect((await screen.findByRole('alert')).textContent).toContain('mudou')
  expect(JSON.parse(request.mock.calls.find(([path])=>path==='/me/subscription/cancel')![1].body)).toEqual({expectedVersion:7})
})
it('F11-C04 unavailable plans remain informative and cannot start billing',async()=>{
  request.mockImplementation(async(path:string)=>path==='/profile-plans'?{plans:plans.map(plan=>plan.tier==='FREE'?plan:{...plan,available:false,amountCents:null})}:state)
  render(<BillingScreen/>);await screen.findByRole('heading',{name:'Sua página continua gratuita'})
  expect(screen.queryByRole('button',{name:'Assinar plano'})).toBeNull()
  expect(screen.queryByText('Em preparação')).toBeNull()
})
it('F11-C05 redirects accept only hosted Stripe Checkout addresses',()=>{
  expect(safeBillingCheckout('https://checkout.stripe.com/c/pay/cs_fixture')).toContain('cs_fixture')
  for(const url of ['javascript:alert(1)','https://checkout.stripe.com.evil.test/c/pay/one','https://user@checkout.stripe.com/c/pay/one','http://checkout.stripe.com/c/pay/one','https://checkout.stripe.com/other'])expect(()=>safeBillingCheckout(url)).toThrow()
})
it('destaca o plano disponível que inclui o recurso solicitado e mostra o resumo antes de cobrar',async()=>{
 const catalog=[...plans,{...plans[1],tier:'PREMIUM' as const,title:'Premium',versionId:'premium',amountCents:2490,capabilities:[...capabilities,{key:'profile.subdomain',label:'Subdomínio próprio',delivered:true}]}]
 request.mockImplementation(async(path:string)=>path==='/profile-plans'?{plans:catalog}:state)
 render(<BillingScreen requiredFeature="profile.subdomain"/>);await screen.findByRole('heading',{name:'Subdomínio próprio'})
 expect(screen.getByRole('article',{name:'Premium'}).getAttribute('data-highlighted')).toBe('true')
 expect(screen.getByRole('article',{name:'Pro'}).hasAttribute('data-highlighted')).toBe(false)
 fireEvent.click(screen.getAllByRole('button',{name:'Assinar plano'})[1])
 expect(screen.getByRole('region',{name:'Resumo da assinatura'}).textContent).toContain('24,90')
 expect(screen.getByRole('region',{name:'Como funciona a assinatura'}).textContent).toContain('mensal e recorrente')
 expect(request.mock.calls.every(([,init])=>!init)).toBe(true)
})
it('não destaca nem promete contratar um recurso sem plano disponível',async()=>{
 prepare();render(<BillingScreen requiredFeature="profile.richBlocks"/>);
  await screen.findByText(/Este recurso não está disponível para contratação/)
 expect(screen.getAllByRole('article').some(article=>article.hasAttribute('data-highlighted'))).toBe(false)
})
it('sem página mostra somente a criação e preserva o cancelamento de uma assinatura existente',async()=>{
 prepare({...state,canCheckout:false,checkoutRequirement:'CREATE_PAGE'});const view=render(<BillingScreen requiredFeature="profile.subdomain"/>);
 await screen.findByRole('heading',{name:'Primeiro, crie sua página'})
 expect(screen.getByRole('link',{name:'Criar minha página'}).getAttribute('href')).toBe('/painel/perfil')
 expect(screen.queryByRole('article')).toBeNull();expect(screen.queryByText(/preparação|Preço ainda/)).toBeNull();view.unmount()
 prepare({...state,canCheckout:false,checkoutRequirement:'CREATE_PAGE',subscription:{id:'sub',planVersionId:'pro-version',canChange:false,tier:'PRO',title:'Pro',status:'ACTIVE',version:1,periodStart:null,periodEnd:null,paidThrough:null,cancelAtPeriodEnd:false,reviewReason:null,resumeCheckoutUrl:null,hasPaidAccess:true,nextPlan:null}})
 render(<BillingScreen/>);expect(await screen.findByRole('button',{name:'Cancelar renovação'})).toBeTruthy()
})
