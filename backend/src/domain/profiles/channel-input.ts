import {z} from 'zod'
import {profileVersion} from './profile-input'
const uuid=z.string().uuid(),network=z.string().min(1).max(100).nullable()
const binding=z.object({id:uuid,networkId:network,handleId:uuid,revisionId:uuid,paused:z.boolean()}).strict()
export const channelSettingsInput=z.object({schemaVersion:z.literal(1),groups:z.array(z.object({id:uuid,channels:z.array(binding).max(8)}).strict()).max(100)}).strict().superRefine((value,ctx)=>{
 const groups=new Set(value.groups.map(group=>group.id)),ids=value.groups.flatMap(group=>group.channels.map(channel=>channel.id))
 if(groups.size!==value.groups.length||new Set(ids).size!==ids.length||ids.length>500)ctx.addIssue({code:'custom',message:'Use grupos e canais com identificadores próprios.'})
})
export const channelGroupInput=z.object({expectedVersion:profileVersion,name:z.string().trim().min(1).max(80),visible:z.boolean(),channels:z.array(z.object({id:uuid,label:z.string().trim().min(1).max(100),networkId:network,destinationRevisionId:uuid,paused:z.boolean()}).strict()).max(8)}).strict().superRefine((value,ctx)=>{
 if(new Set(value.channels.map(row=>row.id)).size!==value.channels.length)ctx.addIssue({code:'custom',message:'Não repita um identificador de canal.'})
})
export type ChannelGroupInput=z.infer<typeof channelGroupInput>
