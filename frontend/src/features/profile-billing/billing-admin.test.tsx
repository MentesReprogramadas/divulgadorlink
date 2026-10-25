import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,expect,it,vi } from 'vitest'
import { BillingAdmin,type BillingAdminState } from './billing-admin'
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('./billing-api',()=>({billingRequest:request}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
const data:BillingAdminState={settings:{enabled:false,fiscalReviewed:false,publicOrigin:'https://fixture.test',livemode:false,version:3},providerConfigured:false,webhookReady:false,salesEnabled:false,plans:[],capabilities:[...['profile.page','profile.categories','profile.appearance','profile.history'].map(key=>({key,label:key,delivered:true})),{key:'profile.analytics',label:'Estatísticas dos botões',delivered:false}],failedOperations:[],failedEvents:[],reviews:[]}
it('F11-C06 no setup silently enables sales, and a server fiscal rejection keeps the form and version',async()=>{
  request.mockResolvedValue(data);render(<BillingAdmin/>);await screen.findByText('Vendas desativadas');expect(request).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button',{name:'Configurar vendas'}));const enable=screen.getByLabelText('Permitir novas assinaturas, quando todas as condições estiverem prontas.');expect((enable as HTMLInputElement).checked).toBe(false)
  fireEvent.click(enable);request.mockRejectedValueOnce(new Error('Revise a configuração fiscal.'));fireEvent.click(screen.getByRole('button',{name:'Salvar configuração'}));expect((await screen.findByRole('alert')).textContent).toContain('fiscal')
  const init=request.mock.calls.at(-1)![1];expect(JSON.parse(init.body)).toEqual({publicOrigin:'https://fixture.test',enabled:true,fiscalReviewed:false,expectedVersion:3});expect(screen.getByRole('dialog')).toBeTruthy()
})
it('F11-C07 plan authoring starts only on action and requires an additional capability before saving',async()=>{
  request.mockResolvedValue(data);render(<BillingAdmin/>);await screen.findByText('Vendas desativadas');expect(screen.queryByLabelText('Código do preço na Stripe')).toBeNull()
  fireEvent.click(screen.getAllByRole('button',{name:'Configurar plano'})[0]);fireEvent.change(screen.getByLabelText('Valor mensal em reais'),{target:{value:'12.90'}});fireEvent.change(screen.getByLabelText('Código do preço na Stripe'),{target:{value:'price_fixture'}});fireEvent.click(screen.getByRole('button',{name:'Continuar'}));fireEvent.click(screen.getByRole('button',{name:'Salvar configuração'}))
  expect((await screen.findByRole('alert')).textContent).toContain('pelo menos um recurso adicional');expect(request.mock.calls.filter(([,init])=>init)).toHaveLength(0)
  fireEvent.click(screen.getByLabelText('Estatísticas dos botões · indisponível neste ambiente'));request.mockRejectedValueOnce(new Error('Recursos ainda indisponíveis.'));fireEvent.click(screen.getByRole('button',{name:'Salvar configuração'}));expect((await screen.findByRole('alert')).textContent).toContain('indisponíveis')
  expect(JSON.parse(request.mock.calls.at(-1)![1].body)).toMatchObject({amountCents:1290,expectedVersion:0,enabled:false,tier:'PRO',providerPriceId:'price_fixture'})
})
it('F11-C08 failure recovery is explicit and limited to cancellation and canonical confirmation',async()=>{
  request.mockResolvedValue({...data,failedOperations:[{id:'cancel-fixture',kind:'CANCEL',lastError:'UNAVAILABLE',attempts:10,createdAt:'2026-10-17T00:00:00Z'},{id:'checkout-fixture',kind:'CHECKOUT',lastError:'PRECONDITION',attempts:1,createdAt:'2026-10-17T00:00:00Z'}]});render(<BillingAdmin/>);fireEvent.click(await screen.findByRole('button',{name:'Tentar cancelamento novamente'}));expect(request.mock.calls.find(([path])=>path.endsWith('/retry'))?.[0]).toBe('/admin/profile-billing/operations/cancel-fixture/retry');expect(request.mock.calls.some(([path])=>path.includes('checkout-fixture/retry'))).toBe(false)
})
