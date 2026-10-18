import {tenantHost,forward} from '@/lib/upstream'
const policy={'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow','referrer-policy':'no-referrer'}
export async function GET(request:Request,{params}:{params:Promise<{slug:string;id:string}>}){
 const {slug,id}=await params
 if(!/^[a-z0-9-]{3,40}$/.test(slug)||!/^[a-f0-9-]{36}$/i.test(id))return new Response(null,{status:404,headers:policy})
 let restricted=false
 try{
  const result=await forward({method:request.method,path:'/api/v1/profiles/'+slug+'/channels/'+id+'/resolve'+new URL(request.url).search,host:tenantHost(request.headers.get('host')??'localhost'),cookie:request.headers.get('cookie')??'',timeoutMs:12000}),location=result.headers.location
  if(result.status===302&&typeof location==='string'){
   const destination=new URL(location)
   if(destination.protocol==='https:'&&!destination.username&&!destination.password&&(!destination.port||destination.port==='443'))return new Response(null,{status:302,headers:{...policy,location}})
  }
  if(result.status===200)restricted=JSON.parse(result.body.toString()).restricted===true
 }catch{/* Keep the public recovery state free of upstream/private details. */}
 return new Response(null,{status:303,headers:{...policy,location:'/p/'+slug+'/canais/estado'+(restricted?'?idade=1':'')}})
}
export const HEAD=GET
