import {expect,it} from 'vitest'
import {canMeasureProfile,interactionIdentity,profileInteractionInput,summarizeProfileInteraction,type InteractionEvent} from './profile-interaction'
const block='12345678-1234-4234-8234-123456789abc',profileId='22345678-1234-4234-8234-123456789abc'
const event=(patch:Partial<InteractionEvent>={}):InteractionEvent=>({eventId:'32345678-1234-4234-8234-123456789abc',tenantId:'tenant',profileId,revisionId:2,blockId:null,kind:'PAGE',viewportBucket:'MOBILE',scrollBucket:null,sessionKey:'session-a',day:'2026-10-18',...patch})
const context={revisionId:2,viewportBucket:'MOBILE' as const,minimumSample:1},blocks=[{id:block,label:'Aulas'}]
it('F31-U01 repeated IDs and repeated daily interactions do not inflate page/button counts',()=>{
 const rows=[event(),event(),event({eventId:'b',kind:'IMPRESSION',blockId:block}),event({eventId:'c',kind:'IMPRESSION',blockId:block}),event({eventId:'d',kind:'CLICK',blockId:block})]
 expect(interactionIdentity(rows[2])).toBe(interactionIdentity(rows[3]));expect(interactionIdentity(rows[0])).not.toBe(interactionIdentity(rows[4]))
 const report=summarizeProfileInteraction(rows,blocks,context);expect(report).toMatchObject({available:true,sessions:1,pageViews:1,blocks:[{id:block,impressions:1,clicks:1,ctr:100}]})
})
it('F31-U02/T05 scroll reach is a distinct signal, never a button click or proven reading',()=>{
 const report=summarizeProfileInteraction([event(),event({eventId:'scroll',kind:'SCROLL',scrollBucket:50})],blocks,context)
 expect(report.scrollBuckets).toContainEqual({threshold:50,label:'50% da página alcançada',reached:1});expect(report.blocks[0].clicks).toBe(0);expect(report.blocks[0].ctr).toBeNull();expect(report).not.toHaveProperty('readers')
})
it('F31-U03/T02 payload accepts only identifiers and closed categories; typed values and personal data are rejected',()=>{
 const input={eventId:event().eventId,profileId,revisionId:2,blockId:block,kind:'CLICK',viewportBucket:'MOBILE',scrollBucket:null,surfaceToken:'signed-fixture'}
 expect(profileInteractionInput.safeParse(input).success).toBe(true)
 for(const extra of [{text:'private visitor input'},{email:'private@example.test'},{url:'https://private.test'},{x:10},{tenantId:'forged'}])expect(profileInteractionInput.safeParse({...input,...extra}).success).toBe(false)
 for(const patch of [{scrollBucket:50},{blockId:null},{viewportBucket:'390x844'},{revisionId:0}])expect(profileInteractionInput.safeParse({...input,...patch}).success).toBe(false)
})
it('F31-U04/T01 revisions and viewport contexts stay separate, including dedupe identities',()=>{
 const first=event(),otherRevision=event({eventId:'v3',revisionId:3}),otherViewport=event({eventId:'desktop',viewportBucket:'DESKTOP'})
 expect(interactionIdentity(first)).not.toBe(interactionIdentity(otherRevision));expect(interactionIdentity(first)).not.toBe(interactionIdentity(otherViewport))
 expect(summarizeProfileInteraction([first,otherRevision,otherViewport],blocks,context)).toMatchObject({sessions:1,pageViews:1})
 expect(summarizeProfileInteraction([first],blocks,{...context,revisionId:4})).toMatchObject({available:false,sessions:0,pageViews:null})
})
it('F31-T03 measurement requires its own explicit preference; denial, bots, privacy signals and privileged/preview contexts stay uncounted',()=>{
 expect(canMeasureProfile({consent:'v1_yes',userAgent:'Mozilla/5.0'})).toBe(true)
 for(const input of [{},{consent:'marketing'},{consent:'denied'},{consent:'v0_yes'},...([{dnt:'1'},{gpc:'1'},{userAgent:'HeadlessChrome'},{testTraffic:'1'},{owner:true},{admin:true},{support:true}].map(patch=>({consent:'v1_yes',...patch})))])expect(canMeasureProfile(input)).toBe(false)
})
it('F31-T04 empty or insufficient measurement produces unavailable values, not fictitious zero metrics',()=>{
 const report=summarizeProfileInteraction([event()],blocks,{revisionId:2,viewportBucket:'ALL'})
 expect(report).toMatchObject({available:false,sessions:1,pageViews:null,blocks:[{id:block,impressions:null,clicks:null,ctr:null}]})
 expect(summarizeProfileInteraction([],blocks,context).blocks[0]).toMatchObject({impressions:null,clicks:null})
})
