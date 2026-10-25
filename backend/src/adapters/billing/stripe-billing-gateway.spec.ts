import { createServer, type IncomingHttpHeaders } from 'node:http'
import Stripe from 'stripe-billing'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { StripeBillingGateway } from './stripe-billing-gateway'
import { BASE_PROFILE_CAPABILITIES, PROFILE_CAPABILITIES, profileCapabilities } from '@/domain/billing/profile-plans'

type Seen = { method: string; path: string; body: URLSearchParams; query: URLSearchParams; headers: IncomingHttpHeaders }
const replies = new Map<string, unknown>(), seen: Seen[] = []
let client: Stripe.Stripe, gateway: StripeBillingGateway
// The actual SDK connects only to this disposable local server, using a noncredential fixture key.
const server = createServer((request, response) => {
  const chunks: Buffer[] = []
  request.on('data', chunk => chunks.push(Buffer.from(chunk)))
  request.on('end', () => {
    const url = new URL(request.url!, 'http://fixture'), method = request.method!
    seen.push({ method, path: url.pathname, query: url.searchParams, body: new URLSearchParams(Buffer.concat(chunks).toString()), headers: request.headers })
    response.setHeader('content-type', 'application/json')
    response.setHeader('request-id', 'req_fixture')
    const body = replies.get(method + ' ' + url.pathname)
    if (!body) {
      response.statusCode = 503
      response.end(JSON.stringify({ error: { type: 'api_error', message: 'Do not expose private@example.test' } }))
      return
    }
    response.end(JSON.stringify(body))
  })
})
const start = Math.floor(Date.now() / 1000) - 60, end = start + 30 * 86400
function subscription(status = 'active') {
  return { id: 'sub_fixture', object: 'subscription', customer: 'cus_fixture', status, livemode: false, collection_method: 'charge_automatically', default_tax_rates: [], billing_thresholds: null, pause_collection: null, cancel_at_period_end: false, schedule: null, discounts: [], automatic_tax: { enabled: false }, items: { data: [{ id: 'si_fixture', quantity: 1, price: { id: 'price_fixture' }, current_period_start: start, current_period_end: end }], has_more: false } }
}
function invoice(customer = 'cus_fixture', until = end) {
  return { id: 'in_fixture', object: 'invoice', status: 'paid', customer, livemode: false, parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_fixture' } }, lines: { data: [{ id: 'il_fixture', parent: { type: 'subscription_item_details', subscription_item_details: { subscription: 'sub_fixture', proration: false } }, pricing: { type: 'price_details', price_details: { price: 'price_fixture' } }, period: { start, end: until } }], has_more: false } }
}
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing local fixture server')
  client = new Stripe('sk_test_fixture', { host: '127.0.0.1', protocol: 'http', port: address.port, timeout: 1000, maxNetworkRetries: 0 })
  gateway = new StripeBillingGateway(client, 'whsec_fixture', false)
})
beforeEach(() => { replies.clear(); seen.length = 0 })
afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) })

it('F11-A07 Checkout expiration and unpaid cancellation use provider APIs without invoice or proration',async()=>{
  replies.set('GET /v1/checkout/sessions/cs_fixture',{id:'cs_fixture',object:'checkout.session',customer:'cus_fixture',mode:'subscription',status:'open',subscription:null,livemode:false,expires_at:end})
  expect(await gateway.checkout('cs_fixture')).toMatchObject({id:'cs_fixture',status:'OPEN',subscriptionId:null})
  replies.set('POST /v1/checkout/sessions/cs_fixture/expire',{id:'cs_fixture',object:'checkout.session',status:'expired'})
  await gateway.expireCheckout('cs_fixture','expire-fixture')
  replies.set('DELETE /v1/subscriptions/sub_fixture',{id:'sub_fixture',object:'subscription',status:'canceled'})
  await gateway.cancelUnpaid('sub_fixture','cancel-unpaid-fixture')
  const cancel=seen.find(row=>row.method==='DELETE')!
  expect(cancel.query.get('invoice_now')).toBe('false');expect(cancel.query.get('prorate')).toBe('false')
  expect(cancel.headers['idempotency-key']).toBe('cancel-unpaid-fixture')
})

it.each(['checkout.stripe.com','checkout.contavera.com'])('F11-A01 actual SDK sends subscription Checkout with one Price, no manual payment methods or PaymentIntent, and stable idempotency tracking (%s)', async (host) => {
  replies.set('POST /v1/customers', { id: 'cus_fixture', object: 'customer', livemode: false })
  expect(await gateway.createCustomer('account-fixture')).toBe('cus_fixture')
  replies.set('POST /v1/checkout/sessions', { id: 'cs_fixture', object: 'checkout.session', customer: 'cus_fixture', mode: 'subscription', livemode: false, url: 'https://'+host+'/c/pay/cs_fixture', expires_at: end })
  const input = { customerId: 'cus_fixture', priceId: 'price_fixture', referenceId: 'internal-reference', successUrl: 'https://fixture.test/painel/assinatura', cancelUrl: 'https://fixture.test/painel/assinatura', idempotencyKey: 'random-operation-fixture', expiresAt: new Date(Date.now()+3600000) }
  expect((await gateway.createCheckout(input)).url).toBe('https://'+host+'/c/pay/cs_fixture')
  await gateway.createCheckout(input)
  const [first, repeated] = seen.filter(row => row.path === '/v1/checkout/sessions')
  expect(first.body.get('mode')).toBe('subscription')
  expect(first.body.get('line_items[0][price]')).toBe('price_fixture')
  expect([...first.body.keys()].some(key => key.startsWith('payment_method_types'))).toBe(false)
  expect(first.body.get('automatic_tax[enabled]')).toBeNull()
  expect(first.body.get('integration_identifier')).toMatch(/^temlink-profile-[a-z]{8}$/)
  expect(first.body.toString()).toBe(repeated.body.toString())
  expect(first.headers['idempotency-key']).toBe(input.idempotencyKey)
  expect(first.headers['stripe-version']).toBe('2026-09-30.endive')
  expect(seen.some(row => row.path.includes('payment_intents'))).toBe(false)
})

it('F11-A02 Price/product readiness and failures use actual SDK responses without exposing provider errors', async () => {
  replies.set('GET /v1/prices/price_fixture', { id: 'price_fixture', object: 'price', product: { id: 'prod_fixture', object: 'product', name: 'Pro', active: true }, active: true, livemode: false, unit_amount: 1290, currency: 'brl', recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' } })
  expect(await gateway.price('price_fixture')).toMatchObject({ productId: 'prod_fixture', active: true, amountCents: 1290, currency: 'BRL', interval: 'month', usageType: 'licensed' })
  await expect(gateway.price('price_unavailable')).rejects.toMatchObject({ code: 'UNAVAILABLE', message: 'Serviço de assinatura indisponível.' })
})

it('F11-A03 canonical state requires a matching paid invoice, customer, price and subscription line; status alone is insufficient', async () => {
  replies.set('GET /v1/subscriptions/sub_fixture', subscription())
  replies.set('GET /v1/invoices', { object: 'list', data: [invoice()], has_more: false })
  expect(await gateway.subscription('sub_fixture')).toMatchObject({ status: 'ACTIVE', priceId: 'price_fixture', paidThrough: new Date(end * 1000) })
  replies.set('GET /v1/invoices', { object: 'list', data: [invoice('cus_other')], has_more: false })
  expect((await gateway.subscription('sub_fixture')).paidThrough).toBeNull()
  replies.set('GET /v1/invoices', { object: 'list', data: [], has_more: false })
  expect((await gateway.subscription('sub_fixture')).paidThrough).toBeNull()
  expect(seen.find(row => row.path === '/v1/invoices')?.query.get('subscription')).toBe('sub_fixture')
})

it('F11-A04 signed old invoice events resolve current provider objects instead of granting from payload or metadata', async () => {
  const payload = JSON.stringify({ id: 'evt_fixture', object: 'event', type: 'invoice.paid', created: Math.floor(Date.now() / 1000), livemode: false, data: { object: { id: 'in_fixture', customer: 'cus_fixture', status: 'paid', metadata: { ownerId: 'foreign-owner', email: 'private@example.test' } } } })
  const signature = client.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' })
  const reference = gateway.verifyEvent(Buffer.from(payload), signature)!
  expect(JSON.stringify(reference)).not.toMatch(/foreign-owner|private@example|metadata|paidThrough/)
  replies.set('GET /v1/invoices/in_fixture', invoice())
  replies.set('GET /v1/subscriptions/sub_fixture', subscription('past_due'))
  replies.set('GET /v1/invoices', { object: 'list', data: [invoice('cus_fixture', start - 1)], has_more: false })
  const current = (await gateway.subscriptionFromEvent(reference))!
  expect(current.status).toBe('PAST_DUE')
  expect(profileCapabilities({ ...current, capabilities: [...BASE_PROFILE_CAPABILITIES, 'profile.analytics'] }, new Set(PROFILE_CAPABILITIES), new Date())).toEqual(BASE_PROFILE_CAPABILITIES)
  expect(() => gateway.verifyEvent(Buffer.from(payload + ' '), signature)).toThrow()
  expect(() => gateway.verifyEvent(Buffer.from(payload), 't=1,v1=bad')).toThrow()
})

it('F11-A05 cancellation and plan change use the period boundary without immediate proration', async () => {
  replies.set('GET /v1/subscriptions/sub_fixture', subscription())
  replies.set('POST /v1/subscriptions/sub_fixture', subscription())
  await gateway.cancelAtPeriodEnd('sub_fixture', 'cancel-fixture')
  expect(seen.at(-1)?.body.get('cancel_at_period_end')).toBe('true')
  expect(seen.at(-1)?.body.get('proration_behavior')).toBe('none')
  replies.set('POST /v1/subscription_schedules', { id: 'sub_sched_fixture', current_phase: { start_date: start, end_date: end } })
  replies.set('POST /v1/subscription_schedules/sub_sched_fixture', { id: 'sub_sched_fixture' })
  await gateway.changeAtPeriodEnd({ subscriptionId: 'sub_fixture', currentPriceId: 'price_fixture', nextPriceId: 'price_next', expectedPeriodEnd: new Date(end * 1000), idempotencyKey: 'change-fixture' })
  const changed = seen.at(-1)!
  expect(changed.body.get('phases[0][end_date]')).toBe(String(end))
  expect(changed.body.get('phases[1][start_date]')).toBe(String(end))
  expect(changed.body.get('phases[1][items][0][price]')).toBe('price_next')
  expect(changed.body.get('proration_behavior')).toBe('none')
  expect(changed.headers['idempotency-key']).toBe('change-fixture')
})

it('F11-A06 unexpected customer, destination or environment references fail closed', async () => {
  replies.set('POST /v1/checkout/sessions', { id: 'cs_fixture', object: 'checkout.session', customer: 'cus_other', mode: 'subscription', livemode: false, url: 'https://evil.test', expires_at: end })
  await expect(gateway.createCheckout({ customerId: 'cus_fixture', priceId: 'price_fixture', referenceId: 'internal', successUrl: 'https://fixture.test', cancelUrl: 'https://fixture.test', idempotencyKey: 'op', expiresAt: new Date(end * 1000) })).rejects.toMatchObject({ code: 'UNSUPPORTED' })
  const payload = JSON.stringify({ id: 'evt_fixture', type: 'customer.subscription.updated', created: Math.floor(Date.now() / 1000), livemode: true, data: { object: { id: 'sub_fixture', customer: 'cus_fixture' } } })
  expect(() => gateway.verifyEvent(Buffer.from(payload), client.webhooks.generateTestHeaderString({ payload, secret: 'whsec_fixture' }))).toThrow()
})
