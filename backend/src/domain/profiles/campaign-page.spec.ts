import {interactionIdentity,type InteractionEvent} from '@/domain/analytics/profile-interaction'
import {signProfileInteraction,readProfileInteraction,signCampaignInteraction,readCampaignInteraction} from '@/lib/profile-interaction-token'
import {expect,it} from 'vitest'
import {campaignContent,campaignIsPublished} from './campaign-page'
import type {ProfileContent} from './profile'
const group='11111111-1111-4111-8111-111111111111',first='22222222-2222-4222-8222-222222222222',second='33333333-3333-4333-8333-333333333333'
const source:ProfileContent={slug:'pagina-ana',name:'Ana',bio:'Ciência',avatarAssetId:null,requiresAge:false,primaryItemId:first,categories:[{id:group,name:'Projetos',visible:true}],items:[{id:first,categoryId:group,type:'URL',label:'Primeiro',destination:'https://example.com/a',visible:true},{id:second,categoryId:group,type:'URL',label:'Segundo',destination:'https://example.com/b',visible:true}]}
it('F15-U01/T01 copying selection never mutates the source and preserves authoring order',()=>{const before=structuredClone(source),value=campaignContent(source,[second,first]);value.name='Campanha alterada';expect(source).toEqual(before);expect(value.items.map(row=>row.id)).toEqual([first,second])})
it('F15-T03 raw destinations copy while catalog references remain IDs',()=>{const catalog={...source,items:[{...source.items[0],type:'CATALOG' as const,destination:'catalog-id'}]};expect(campaignContent(catalog,[first]).items[0].destination).toBe('catalog-id');expect(campaignContent(source,[second]).items[0].destination).toBe(source.items[1].destination)})
it('F15-U01 selecting foreign, hidden or repeated links is rejected instead of inventing content',()=>{expect(()=>campaignContent(source,['44444444-4444-4444-8444-444444444444'])).toThrow();expect(()=>campaignContent({...source,items:source.items.map(row=>({...row,visible:false}))},[first])).toThrow();expect(()=>campaignContent(source,[first,first])).toThrow()})

it('F15-U02 archived or incomplete publications cannot serve active content',()=>{
 expect(campaignIsPublished({state:'PUBLISHED',publication:source,publishedVersion:1})).toBe(true)
 for(const state of ['DRAFT','ARCHIVED'])expect(campaignIsPublished({state,publication:source,publishedVersion:1})).toBe(false)
 expect(campaignIsPublished({state:'PUBLISHED',publication:null,publishedVersion:1})).toBe(false)
})
it('F15-U03 context identity includes campaign and UTC day, independent from private display name',()=>{
 const event:InteractionEvent={eventId:first,tenantId:'tenant-a',profileId:group,revisionId:1,day:'2026-10-19',sessionKey:'session',viewportBucket:'MOBILE',kind:'PAGE',blockId:null,scrollBucket:null}
 expect(interactionIdentity(event)).not.toBe(interactionIdentity({...event,campaignId:first}));expect(interactionIdentity({...event,campaignId:first})).not.toBe(interactionIdentity({...event,campaignId:second}));expect(interactionIdentity({...event,campaignId:first})).not.toBe(interactionIdentity({...event,campaignId:first,day:'2026-10-20'}))
})
it('F15-U03 campaign tokens cannot be replayed as profile, tenant, revision or sibling campaign tokens',()=>{
 const context={tenantId:'tenant-a',profileId:group,revisionId:1,campaignId:first},secret='fixture-secret',now=new Date('2026-10-19T12:00:00Z'),token=signCampaignInteraction(context,secret,now)
 expect(readCampaignInteraction(token,context,secret,now)).toBe(true);expect(readProfileInteraction(token,context,secret,now)).toBe(false);expect(readCampaignInteraction(token,{...context,campaignId:second},secret,now)).toBe(false);expect(readCampaignInteraction(token,{...context,revisionId:2},secret,now)).toBe(false);expect(readCampaignInteraction(token,{...context,tenantId:'tenant-b'},secret,now)).toBe(false);expect(readCampaignInteraction(signProfileInteraction({tenantId:context.tenantId,profileId:group,revisionId:1},secret,now),context,secret,now)).toBe(false)
})
