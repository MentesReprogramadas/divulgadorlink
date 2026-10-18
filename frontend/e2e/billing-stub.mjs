import { createHmac } from 'node:crypto'
const customers=new Map(),sessions=new Map(),subscriptions=new Map(),schedules=new Map(),invoices=new Map(),idempotency=new Map(),calls=[]
let counter=0,unavailable=false
const next=prefix=>prefix+'_'+(++counter)
const price=id=>({id,object:'price',product:{id:id.includes('premium')?'prod_premium_fixture':'prod_pro_fixture',object:'product',name:'Fixture',active:true},active:true,livemode:false,unit_amount:id.includes('premium')?2490:1290,currency:'brl',recurring:{interval:'month',interval_count:1,usage_type:'licensed'}})
const list=data=>({object:'list',data,has_more:false})
function paidInvoice(sub){const item=sub.items.data[0];return{id:next('in'),object:'invoice',status:'paid',customer:sub.customer,livemode:false,parent:{type:'subscription_details',subscription_details:{subscription:sub.id}},lines:list([{id:next('il'),parent:{type:'subscription_item_details',subscription_item_details:{subscription:sub.id,proration:false}},pricing:{type:'price_details',price_details:{price:item.price.id}},period:{start:item.current_period_start,end:item.current_period_end}}])}}
/** External provider simulator; never writes application data or skips signature verification. */
export async function billingStub(req,res,raw,runtime){
  const url=new URL(req.url,'http://fixture'),path=url.pathname,method=req.method
  if(!path.startsWith('/v1/')&&!path.startsWith('/billing-fixture/'))return false
  const send=(body,status=200)=>{res.statusCode=status;res.end(JSON.stringify(body));return true}
  if(path==='/billing-fixture/state')return send({customers:[...customers.values()],sessions:[...sessions.values()],subscriptions:[...subscriptions.values()],calls})
  if(path==='/billing-fixture/renewal-failed'){
    const body=JSON.parse(raw),sub=subscriptions.get(body.subscriptionId)
    if(!sub)return send({error:'Unknown fixture subscription'},404)
    const start=Math.floor(Date.now()/1000)-5,item=sub.items.data[0]
    for(const invoice of invoices.values())if(invoice.parent.subscription_details.subscription===sub.id)for(const line of invoice.lines.data){line.period={start:start-30*86400,end:start}}
    item.current_period_start=start;item.current_period_end=start+30*86400;sub.status='past_due'
    const failed=paidInvoice(sub);failed.status='open';invoices.set(failed.id,failed)
    const stamp=Math.floor(Date.now()/1000),payload=JSON.stringify({id:next('evt'),object:'event',type:'invoice.payment_failed',created:stamp,livemode:false,data:{object:failed}})
    const signature='t='+stamp+',v1='+createHmac('sha256','whsec_local_fixture').update(stamp+'.'+payload).digest('hex')
    const result=await fetch(runtime.apiOrigin+'/api/v1/billing/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature,host:body.host},body:payload})
    return send({status:result.status})
  }
  if(path==='/billing-fixture/control'){unavailable=JSON.parse(raw).unavailable===true;return send({})}
  if(path==='/billing-fixture/pay'){
    const body=JSON.parse(raw),session=sessions.get(body.sessionId)
    if(!session)return send({error:'Unknown fixture session'},404)
    let sub=subscriptions.get(session.subscription)
    if(!sub){const now=Math.floor(Date.now()/1000)-5,id=next('sub');sub={id,object:'subscription',customer:session.customer,livemode:false,status:'active',collection_method:'charge_automatically',cancel_at_period_end:false,schedule:null,discounts:[],automatic_tax:{enabled:false},default_tax_rates:[],billing_thresholds:null,pause_collection:null,items:list([{id:next('si'),quantity:1,price:{id:session.fixturePrice},current_period_start:now,current_period_end:now+30*86400}])};subscriptions.set(id,sub);session.subscription=id;session.status='complete';const invoice=paidInvoice(sub);invoices.set(invoice.id,invoice)}
    const payload=JSON.stringify({id:body.eventId??next('evt'),object:'event',type:'checkout.session.completed',created:Math.floor(Date.now()/1000),livemode:false,data:{object:session}})
    const stamp=Math.floor(Date.now()/1000),signature='t='+stamp+',v1='+createHmac('sha256','whsec_local_fixture').update(stamp+'.'+payload).digest('hex')
    const result=await fetch(runtime.apiOrigin+'/api/v1/billing/stripe/webhook',{method:'POST',headers:{'content-type':'application/json','stripe-signature':signature,host:body.host},body:payload})
    return send({status:result.status,subscriptionId:sub.id})
  }
  if(path==='/billing-fixture/advance'){
    const body=JSON.parse(raw),sub=subscriptions.get(body.subscriptionId),schedule=schedules.get(sub?.schedule)
    if(!sub||!schedule)return send({error:'Unknown fixture schedule'},404)
    const item=sub.items.data[0];item.price={id:schedule.phases[1].items[0].price};item.current_period_start=Math.floor(Date.now()/1000)-5;item.current_period_end=item.current_period_start+30*86400;sub.schedule=null
    const invoice=paidInvoice(sub);invoices.set(invoice.id,invoice);return send({})
  }
  calls.push({method,path,body:raw,key:req.headers['idempotency-key']??null})
  if(unavailable)return send({error:{type:'api_error',message:'Fixture provider unavailable'}},503)
  const key=req.headers['idempotency-key'],previous=key?idempotency.get(method+path+key):null
  if(previous){if(previous.raw!==raw)return send({error:{type:'idempotency_error',message:'Different parameters'}},400);return send(previous.body)}
  const params=new URLSearchParams(raw);let result
  if(method==='GET'&&path.startsWith('/v1/prices/'))result=price(path.split('/').at(-1))
  if(method==='POST'&&path==='/v1/customers'){result={id:next('cus'),object:'customer',livemode:false};customers.set(result.id,result)}
  if(method==='POST'&&path==='/v1/checkout/sessions'){const id=next('cs');result={id,object:'checkout.session',customer:params.get('customer'),mode:'subscription',status:'open',livemode:false,subscription:null,url:'https://checkout.stripe.com/c/pay/'+id,expires_at:Number(params.get('expires_at')),fixturePrice:params.get('line_items[0][price]'),success_url:params.get('success_url')};sessions.set(id,result)}
  if(method==='GET'&&path==='/v1/checkout/sessions')result=list([...sessions.values()].filter(row=>row.subscription===url.searchParams.get('subscription')))
  if(path.startsWith('/v1/checkout/sessions/')){const id=path.split('/')[4],session=sessions.get(id);if(session){if(method==='POST'&&path.endsWith('/expire'))session.status='expired';result=session}}
  if(path.startsWith('/v1/subscriptions/')){const sub=subscriptions.get(path.split('/').at(-1));if(sub){if(method==='POST')sub.cancel_at_period_end=params.get('cancel_at_period_end')==='true';if(method==='DELETE')sub.status='canceled';result=sub}}
  if(path==='/v1/invoices')result=list([...invoices.values()].filter(row=>row.parent.subscription_details.subscription===url.searchParams.get('subscription')))
  if(path.startsWith('/v1/invoices/'))result=invoices.get(path.split('/').at(-1))
  if(path==='/v1/subscription_schedules'&&method==='POST'){const sub=subscriptions.get(params.get('from_subscription'));if(sub){const item=sub.items.data[0];result={id:next('sub_sched'),object:'subscription_schedule',subscription:sub.id,customer:sub.customer,current_phase:{start_date:item.current_period_start,end_date:item.current_period_end},phases:[]};sub.schedule=result.id;schedules.set(result.id,result)}}
  if(path.startsWith('/v1/subscription_schedules/')){const schedule=schedules.get(path.split('/')[3]);if(schedule){if(method==='POST'&&path.endsWith('/release')){subscriptions.get(schedule.subscription).schedule=null}else if(method==='POST'){schedule.phases=[0,1].map(index=>({start_date:Number(params.get('phases['+index+'][start_date]')),items:[{price:params.get('phases['+index+'][items][0][price]')}]}))}result=schedule}}
  if(!result)return send({error:{type:'invalid_request_error',message:'Unsupported fixture request '+path}},404)
  if(key&&method!=='GET')idempotency.set(method+path+key,{raw,body:structuredClone(result)})
  return send(result)
}
