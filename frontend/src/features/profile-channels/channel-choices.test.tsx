import {cleanup,render,screen} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ChannelChoices} from './channel-choices'
const channel={id:'tg',label:'Avisos da comunidade',network:{name:'Telegram',slug:'telegram'},href:'/p/comunidade/canais/tg?token=bound-fixture'}
afterEach(cleanup)
it('F37-C01/T01/T04 labels identify the network separately and the native choice is keyboard focusable',()=>{
 render(<ChannelChoices group={{id:'g',name:'Escolha um canal',channels:[channel]}}/>);const link=screen.getByRole('link',{name:'Telegram: Avisos da comunidade'});expect(link.getAttribute('href')).toBe(channel.href);expect(link.textContent).toContain('Telegram Avisos da comunidade');link.focus();expect(document.activeElement).toBe(link);expect(screen.queryByText(/conteúdo e participantes podem variar/i)).toBeNull()
})
it('hides only the custom title when disabled, retaining the network, icon, destination and stable block',()=>{
 render(<ChannelChoices group={{id:'g',name:'Comunidade',channels:[{...channel,showLabel:false}]}}/>);const link=screen.getByRole('link',{name:'Telegram'});expect(link.textContent).not.toContain(channel.label);expect(link.getAttribute('href')).toBe(channel.href);expect(link.getAttribute('data-profile-block-id')).toBe(channel.id)
})
it('F37-C02/T03/T06 an empty public block is readable and no hidden source or equivalence claim is serialized',()=>{
 const group={id:'g',name:'Escolha um canal',channels:[],privateSource:{label:'F37-PRIVATE-SECRET',destination:'https://secret.example/draft'}};render(<ChannelChoices group={group}/>);expect(screen.getByText('Não há canais disponíveis agora.')).toBeTruthy();expect(screen.queryByRole('link')).toBeNull();expect(document.body.innerHTML).not.toMatch(/F37-PRIVATE-SECRET|secret.example|mesmos participantes/)
})
