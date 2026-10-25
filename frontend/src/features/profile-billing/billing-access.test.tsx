import {cleanup,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {BillingAccessProvider,SubscriptionLink,paidFeature,routePaidFeature} from './billing-access'
import {billingRequest} from './billing-api'
import type {BillingState} from './billing-contract'
vi.mock('./billing-api',()=>({billingRequest:vi.fn()}))
const request=vi.mocked(billingRequest)
const state:BillingState={canCheckout:true,checkoutRequirement:null,capabilities:['profile.page'],subscription:null,operations:[]}
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('direciona recursos sem cobertura ao paywall e mantém o destino quando há acesso confirmado',async()=>{
 request.mockResolvedValue(state)
 const view=render(<BillingAccessProvider enabled canReadBilling ownerId={null}><SubscriptionLink feature="profile.analytics" href="/painel/perfil/metricas">Métricas</SubscriptionLink></BillingAccessProvider>)
 await waitFor(()=>expect(screen.getByRole('link').getAttribute('href')).toBe('/painel/assinatura?recurso=profile.analytics'))
 expect(screen.getByRole('link').textContent).toContain('Requer assinatura')
 request.mockResolvedValue({...state,capabilities:[...state.capabilities,'profile.analytics']})
 window.dispatchEvent(new Event('profile-billing-changed'))
 await waitFor(()=>expect(screen.getByRole('link').getAttribute('href')).toBe('/painel/perfil/metricas'))
 view.rerender(<BillingAccessProvider enabled canReadBilling={false} ownerId="other"><SubscriptionLink feature="profile.analytics" href="/painel/perfil/metricas">Métricas</SubscriptionLink></BillingAccessProvider>)
 expect(screen.queryByText(/Requer assinatura/)).toBeNull()
})
it('não consulta cobrança de um espaço sem permissão e descarta a cobertura do espaço anterior',async()=>{
 request.mockResolvedValue(state)
 const view=render(<BillingAccessProvider enabled canReadBilling ownerId={null}><SubscriptionLink feature="profile.analytics" href="/painel/perfil/metricas">Métricas</SubscriptionLink></BillingAccessProvider>)
 await screen.findByText(/Requer assinatura/)
 view.rerender(<BillingAccessProvider enabled canReadBilling={false} ownerId="client"><SubscriptionLink feature="profile.analytics" href="/painel/perfil/metricas">Métricas</SubscriptionLink></BillingAccessProvider>)
 expect(request).toHaveBeenCalledTimes(1)
 expect(screen.getByRole('link').getAttribute('href')).toBe('/painel/perfil/metricas')
})
it('mapeia somente destinos pagos e aceita apenas recursos conhecidos',()=>{
 expect(routePaidFeature('/painel/perfil/metricas')).toBe('profile.analytics')
 expect(routePaidFeature('/painel/perfil/campanhas/123/metricas')).toBe('profile.analytics')
 expect(routePaidFeature('/painel/perfil/endereco')).toBe('profile.subdomain')
 for(const path of ['/painel/perfil','/painel/perfil/testes','/painel/perfil/links'])expect(routePaidFeature(path)).toBeNull()
 expect(paidFeature('profile.analytics')).toBe('profile.analytics')
 expect(paidFeature('__proto__')).toBeNull()
})
