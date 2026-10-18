import {expect,it} from 'vitest'
import {profileChannelComparison} from './channel-comparison'
const groups=[{id:'g',name:'Canais',channels:[{id:'i',label:'Entrar',networkName:'Site',paused:false,sourceRevisionId:'old-private-reference',sourceVersion:1}]}]
it('F37-C03 F19 explains network/pause changes and changed invitation bindings without dumping private reference IDs',()=>{
 const next=structuredClone(groups);next[0].channels[0].networkName='Telegram';next[0].channels[0].paused=true;const rows=profileChannelComparison(groups,next);expect(rows[0]).toMatchObject({changed:true});expect(rows[0].current).toContain('Telegram: Entrar (pausado)');expect(JSON.stringify(rows)).not.toContain('old-private-reference')
 const same=structuredClone(groups);same[0].channels[0].sourceRevisionId='new-private-reference';expect(profileChannelComparison(groups,same)[0].current).toContain('Convite de origem atualizado.');expect(profileChannelComparison([],[])).toEqual([])
})
