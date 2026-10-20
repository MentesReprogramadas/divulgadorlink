import {z,ZodError} from 'zod'
import type {FastifyInstance,FastifyRequest,FastifyReply} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {prisma} from '@/lib/prisma'
import {readAccessUser} from '@/http/middlewares/verify-jwt'
import {normalizeTenantHost,resolveTenant} from '@/http/tenant'
import {buildError} from '@/http/errors'
import {ProfileError} from '@/domain/profiles/profile'
import type {ProfileActor} from '@/domain/access/profile-access'
import {suggestionInput,suggestionApplyInput} from '@/domain/profiles/profile-suggestion'
import type {ProfileSuggestionPort} from '@/use-cases/@Profiles/profile-suggestion-port'
import {profileSuggestionRuntime} from '@/use-cases/@Profiles/profile-suggestion-runtime'
import {publicContentValidationPorts,type PublicContentValidationPorts} from '@/use-cases/public-content-validation-ports'
import * as suggestions from '@/repositories/profile-suggestions'
import {applyProfileSuggestion} from '@/repositories/profiles-repository'
let testDb:PrismaClient|null=null,testPort:ProfileSuggestionPort|null=null,testValidation:PublicContentValidationPorts|null=null
export function setSuggestionsForTest(db:PrismaClient|null,port:ProfileSuggestionPort|null=null,validation:PublicContentValidationPorts|null=null){if(process.env.NODE_ENV==='test'){testDb=db;testPort=port;testValidation=validation}}
async function run(q:FastifyRequest,r:FastifyReply,work:(db:PrismaClient,a:ProfileActor,port:ProfileSuggestionPort|null,validation:PublicContentValidationPorts)=>Promise<unknown>){
 r.header('cache-control','private, no-store').header('x-content-type-options','nosniff')
 try{const user=await readAccessUser(q);if(!user||user.typ!=='access')throw new ProfileError(401,'Entre para usar o assistente.');const host=normalizeTenantHost(q.headers.host??''),tenant=await resolveTenant(host);if(user.tenantId!==tenant.id)throw new ProfileError(403,'Acesso negado.');if(q.headers['x-profile-id'])throw new ProfileError(403,'O assistente não está disponível em compartilhamentos antigos de página.');return await work(testDb??prisma,{tenantId:tenant.id,ownerId:user.sub,age:q.cookies.age==='yes',auditActorId:q.workspaceActor?.id},testDb?testPort:profileSuggestionRuntime(host),testValidation??publicContentValidationPorts(host))}
 catch(e){if(e instanceof ZodError)return r.code(400).send(buildError({code:'validation',message:'Confira os dados e os campos selecionados.',request_id:q.id}));if(e instanceof ProfileError)return r.code(e.status).send(buildError({code:e.status===409?'conflict':e.status===429?'rate_limited':e.status===503?'provider_error':e.status===401?'unauthenticated':e.status===403?'forbidden':e.status===404?'not_found':'validation',message:e.message,request_id:q.id}));throw new Error('Não foi possível processar a sugestão.')}
}
const params=z.object({id:z.string().uuid()}).strict()
export async function suggestionRoutes(app:FastifyInstance){
 app.get('/me/profile/suggestions',(q,r)=>run(q,r,(db,a,port)=>suggestions.listSuggestions(db,a,Boolean(port))))
 app.post('/me/profile/suggestions',(q,r)=>run(q,r,(db,a,port,validation)=>suggestions.generateSuggestion(db,a,suggestionInput.parse(q.body),port,validation)))
 app.get('/me/profile/suggestions/:id',(q,r)=>run(q,r,(db,a)=>suggestions.readSuggestion(db,a,params.parse(q.params).id)))
 app.delete('/me/profile/suggestions/:id',(q,r)=>run(q,r,(db,a)=>suggestions.discardSuggestion(db,a,params.parse(q.params).id)))
 app.post('/me/profile/suggestions/:id/preview',(q,r)=>run(q,r,(db,a)=>suggestions.previewSuggestion(db,a,params.parse(q.params).id,suggestionApplyInput.parse(q.body))))
 app.post('/me/profile/suggestions/:id/apply',(q,r)=>run(q,r,async(db,a,_port,validation)=>{const id=params.parse(q.params).id,input=suggestionApplyInput.parse(q.body);await suggestions.validateSuggestionApplication(db,a,id,validation);return applyProfileSuggestion(db,a,id,input)}))
}
