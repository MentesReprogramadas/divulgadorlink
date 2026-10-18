import type {FastifyInstance} from 'fastify'
import type {PrismaClient} from '@prisma/client'
import {z,ZodError} from 'zod'
import {cityById,discoveryFields,discoveryLanguages,findCities} from '@/domain/catalog/discovery-metadata'
import {editDiscoveryMetadata,readDiscoveryMetadata,DiscoveryError} from '@/use-cases/@Links/edit-discovery-metadata'
import {prisma} from '@/lib/prisma'
import {verifyJWT} from '@/http/middlewares/verify-jwt'
import {resolveTenant,normalizeTenantHost} from '@/http/tenant'
import {ResourceNotFoundError} from '@/use-cases/errors/resource-not-found-error'
import {buildError} from '@/http/errors'
let testDb:PrismaClient|null=null
export function setDiscoveryDbForTest(db:PrismaClient|null){if(process.env.NODE_ENV==='test')testDb=db}
export async function discoveryRoutes(app:FastifyInstance){
 app.get('/catalog/discovery-options',async(q,r)=>{
  r.header('cache-control','no-store')
  try{
   await resolveTenant(normalizeTenantHost(q.headers.host??''))
   const query=z.object({q:z.string().trim().max(80).optional(),cityId:z.string().regex(/^\d{7}$/).optional()}).strict().parse(q.query)
   if(query.cityId&&!cityById(query.cityId))return r.code(400).send(buildError({code:'validation',message:'Escolha uma cidade da lista.',request_id:q.id}))
   return {cities:findCities(query.q??''),selectedCity:cityById(query.cityId),languages:discoveryLanguages,modalities:[{code:'ONLINE',name:'Online'},{code:'PRESENTIAL',name:'Presencial'}]}
  }catch(error){
   if(error instanceof ZodError)return r.code(400).send(buildError({code:'validation',message:'Confira o nome da cidade.',request_id:q.id}))
   if(error instanceof ResourceNotFoundError)return r.code(404).send(buildError({code:'not_found',message:'Recurso não encontrado.',request_id:q.id}))
   throw error
  }
 })
 app.patch('/links/:id/discovery',{onRequest:[verifyJWT]},async(q,r)=>{
  r.header('cache-control','private, no-store')
  try{
   const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''))
   if(q.user.tenantId!==tenant.id)throw new DiscoveryError(403,'Acesso negado.')
   const body=z.object({...discoveryFields,expectedVersion:z.number().int().min(0).max(2147483646)}).strict().parse(q.body)
   const {id}=z.object({id:z.string().min(1).max(128)}).parse(q.params)
   return await editDiscoveryMetadata(testDb??prisma,{tenantId:tenant.id,ownerId:q.user.sub},id,body,body.expectedVersion,q.id)
  }catch(error){
   if(error instanceof ZodError)return r.code(400).send(buildError({code:'validation',message:'Confira a cidade, o idioma e o formato.',request_id:q.id}))
   if(error instanceof ResourceNotFoundError)return r.code(404).send(buildError({code:'not_found',message:'Link não encontrado.',request_id:q.id}))
   if(error instanceof DiscoveryError)return r.code(error.status).send(buildError({code:error.status===409?'conflict':error.status===404?'not_found':'forbidden',message:error.message,request_id:q.id}))
   throw error
  }
 })
 app.get('/links/:id/discovery',{onRequest:[verifyJWT]},async(q,r)=>{
  r.header('cache-control','private, no-store')
  try{
   const tenant=await resolveTenant(normalizeTenantHost(q.headers.host??''))
   if(q.user.tenantId!==tenant.id)throw new DiscoveryError(403,'Acesso negado.')
   const {id}=z.object({id:z.string().min(1).max(128)}).parse(q.params)
   return await readDiscoveryMetadata(testDb??prisma,{tenantId:tenant.id,ownerId:q.user.sub},id)
  }catch(error){
   if(error instanceof ZodError)return r.code(400).send(buildError({code:'validation',message:'Link inválido.',request_id:q.id}))
   if(error instanceof ResourceNotFoundError)return r.code(404).send(buildError({code:'not_found',message:'Link não encontrado.',request_id:q.id}))
   if(error instanceof DiscoveryError)return r.code(error.status).send(buildError({code:error.status===409?'conflict':error.status===404?'not_found':'forbidden',message:error.message,request_id:q.id}))
   throw error
  }
 })
}
