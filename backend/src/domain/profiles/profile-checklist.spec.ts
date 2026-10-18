import {randomUUID} from 'node:crypto'
import {expect,it} from 'vitest'
import {buildProfileChecklist,type ChecklistFacts} from './profile-checklist'
import {normalizeProfileDestinations,assertProfilePublicationPresence} from '@/use-cases/@Profiles/publication-structure'
const group=randomUUID(),block=randomUUID()
const facts=(patch:Partial<ChecklistFacts>={}):ChecklistFacts=>({draft:{slug:'ana-projetos',name:'Projetos da Ana',bio:'',avatarAssetId:null,requiresAge:false,primaryItemId:null,version:1,categories:[{id:group,name:'Projetos',visible:true}],items:[{id:block,categoryId:group,type:'URL',label:'Meu site',destination:'https://example.com/',visible:true}]},publishedVersion:null,publishedSlug:null,review:null,canSubmit:true,publicationIssue:null,milestones:{previewRequested:false,linkCopied:false},...patch})
it('F34-U01/T01/T04 missing optional photo, bio and preview never block requesting publication',()=>{
 const result=buildProfileChecklist(facts());expect(result.canPublish).toBe(true);expect(result.progress).toEqual({completed:3,total:4});expect(result.steps.filter(step=>step.required).map(step=>step.id)).toEqual(['account','identity','links','publication']);expect(result.steps.find(step=>step.id==='presentation')).toMatchObject({required:false,state:'SUGGESTED'})
})
it('F34-U02 unsafe destinations use the same structural guard as actual publication, without probing network',()=>{
 const content=facts().draft!;for(const destination of ['http://example.com','https://127.0.0.1/private','https://user:secret@example.com','https://example.com:8443'])expect(()=>normalizeProfileDestinations({...content,items:[{...content.items[0],destination}]})).toThrow('Use destinos HTTPS públicos')
 expect(normalizeProfileDestinations(content).items[0].destination).toBe('https://example.com/')
 expect(()=>assertProfilePublicationPresence({...content,items:[]})).toThrow('Inclua pelo menos um link visível')
})
it('F34-U03/T02 a saved invalid edit updates readiness and version instead of retaining prior completion',()=>{
 const before=buildProfileChecklist(facts({publishedVersion:1,publishedSlug:'ana-projetos'}));expect(before.steps.find(step=>step.id==='publication')).toMatchObject({state:'COMPLETE'})
 const initial=facts();const after=buildProfileChecklist({...initial,draft:{...initial.draft!,version:2},publishedVersion:1,publishedSlug:'ana-projetos',publicationIssue:'Use destinos HTTPS públicos.'});expect(after).toMatchObject({profileVersion:2,canPublish:false});expect(after.steps.find(step=>step.id==='links')).toMatchObject({state:'PENDING',required:true});expect(after.reasons).toContain('Use destinos HTTPS públicos.')
})
it('F34-U04/T05 requesting preview is not a completed device test, and copying never proves a delivered share',()=>{
 const result=buildProfileChecklist(facts({publishedVersion:1,publishedSlug:'ana-projetos',milestones:{previewRequested:true,linkCopied:true}}));expect(result.steps.find(step=>step.id==='preview')).toMatchObject({required:false,state:'REQUESTED'});expect(result.steps.find(step=>step.id==='preview')?.description).toContain('não comprova');expect(result.steps.find(step=>step.id==='share')?.description).toContain('não confirma');expect(JSON.stringify(result)).not.toMatch(/testado em todos|compartilhamento confirmado|enviado com sucesso/i)
})
it('F34-T03 saved facts reconstruct progress, while absence and moderation still have their real status',()=>{
 expect(buildProfileChecklist(facts({draft:null,canSubmit:false}))).toMatchObject({profileVersion:0,canPublish:false,progress:{completed:0,total:4}})
 for(const [status,state] of [['PENDING','IN_REVIEW'],['REJECTED','REJECTED']] as const){const result=buildProfileChecklist(facts({review:{status,version:1}}));expect(result.canPublish).toBe(false);expect(result.steps.find(step=>step.id==='publication')).toMatchObject({state})}
 const input=facts({publishedVersion:1,publishedSlug:'ana-projetos'});expect(buildProfileChecklist(structuredClone(input))).toEqual(buildProfileChecklist(input));expect(buildProfileChecklist(input).progress).toEqual({completed:4,total:4})
})
