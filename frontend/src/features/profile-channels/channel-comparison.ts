import type {ChannelGroupSummary} from './channel-contract'
const describe=(groups:ChannelGroupSummary[])=>groups.map(group=>[group.name,...group.channels.map(channel=>`${channel.networkName}: ${channel.label}${channel.paused?' (pausado)':''}${channel.showLabel===false?' (texto do botão oculto)':''} · convite ${channel.sourceVersion===null?'indisponível':'v'+channel.sourceVersion}`)].join('\n')).join('\n\n')||'Sem grupos de alternativas'
export function profileChannelComparison(historical:ChannelGroupSummary[]=[],current:ChannelGroupSummary[]=[]){
 if(!historical.length&&!current.length)return[]
 const changed=JSON.stringify(historical)!==JSON.stringify(current),before=describe(historical),after=describe(current),sameText=changed&&before===after
 return[{label:'Alternativas de acesso',historical:before+(sameText?'\nConvite de origem da versão anterior.':''),current:after+(sameText?'\nConvite de origem atualizado.':''),changed}]
}
