import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {profileInput} from './profile-input'
import {ProfileError} from './profile'
import {assertPublicHttps} from '@/adapters/http/safe-fetch'
import {appearanceInput} from './appearance'

const backup=z.object({schemaVersion:z.literal(1),profile:z.object({slug:z.string(),name:z.string(),bio:z.string(),requiresAge:z.boolean(),primaryItemId:z.string().uuid().nullable(),appearance:appearanceInput.optional()}).strict(),categories:z.array(z.object({id:z.string().uuid(),name:z.string(),visible:z.boolean()}).strict()).max(100),items:z.array(z.object({id:z.string().uuid(),categoryId:z.string().uuid(),type:z.enum(['URL','SOCIAL','CATALOG']),label:z.string(),destination:z.string(),visible:z.boolean(),schedule:z.unknown().optional()}).strict()).max(500),exportedAt:z.string().datetime(),revision:z.enum(['draft','published']),channelGroups:z.array(z.unknown()).max(100),assetsManifest:z.array(z.unknown()).max(10),omissions:z.array(z.string()).max(100)}).strict()

/** Import content only. IDs, media, ACL and publication state never come from a file. */
export function readProfileBackup(value:unknown,currentSlug?:string){
 const source=backup.parse(value)
 const validated=profileInput.parse({...source.profile,slug:currentSlug||source.profile.slug,avatarAssetId:null,categories:source.categories,items:source.items})
 for(const item of validated.items)if(item.type!=='CATALOG')try{assertPublicHttps(item.destination)}catch{throw new ProfileError(422,'O arquivo contém um destino inseguro. Use links HTTPS públicos, sem credenciais.')}
 const groups=new Map(validated.categories.map(row=>[row.id,randomUUID()])),items=new Map(validated.items.map(row=>[row.id,randomUUID()]))
 return profileInput.parse({...validated,primaryItemId:validated.primaryItemId?items.get(validated.primaryItemId):null,categories:validated.categories.map(row=>({...row,id:groups.get(row.id)!})),items:validated.items.map(row=>({...row,id:items.get(row.id)!,categoryId:groups.get(row.categoryId)!}))})
}
