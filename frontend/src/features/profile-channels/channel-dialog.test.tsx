import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {ChannelDialog} from './channel-dialog'
const {create,read}=vi.hoisted(()=>({create:vi.fn(),read:vi.fn()}))
vi.mock('./use-channel-source',()=>({useChannelSource:()=>({create,read})}))
afterEach(()=>{cleanup();vi.resetAllMocks()})
it('a new title-free access needs only its address and uses the server-validated network as its management label',async()=>{
 const network={id:'telegram',name:'Telegram',slug:'telegram'},onSave=vi.fn()
 create.mockResolvedValue({id:'revision',handleId:'handle',label:'Acesso à comunidade',destinationUrl:'https://t.me/community',requiresAge:false,status:'APPROVED',available:true,networks:[network]})
 render(<ChannelDialog initial={{id:'new',label:'',networkId:null,destinationRevisionId:'',paused:false,showLabel:false,available:false,destinationLabel:'Novo acesso',network:null}} destinations={[]} networks={[network]} sourcePending={false} sourceError="" hasMore={false} trigger={document.body} onRefresh={()=>{}} onLoadMore={()=>{}} onClose={()=>{}} onSave={onSave}/> )
 expect(screen.queryByRole('textbox',{name:'Título'})).toBeNull();expect(screen.queryByLabelText('Pausar convite')).toBeNull();expect((screen.getByRole('switch') as HTMLInputElement).checked).toBe(false)
 fireEvent.change(screen.getByRole('textbox',{name:'Link'}),{target:{value:'https://t.me/community'}});fireEvent.submit(screen.getByRole('form',{name:'Configurar convite'}))
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith(expect.objectContaining({label:'Telegram',showLabel:false,networkId:'telegram',destinationRevisionId:'revision'})))
})
it('shows a required title only when enabled and retains it through toggling',()=>{
 render(<ChannelDialog initial={{id:'new',label:'',networkId:null,destinationRevisionId:'',paused:false,showLabel:false,available:false,destinationLabel:'Novo convite',network:null}} destinations={[]} networks={[]} sourcePending={false} sourceError="" hasMore={false} onRefresh={()=>{}} onLoadMore={()=>{}} onClose={()=>{}} onSave={()=>{}}/> )
 const toggle=screen.getByRole('switch',{name:'Mostrar título'});fireEvent.click(toggle)
 const title=screen.getByRole('textbox',{name:'Título'}) as HTMLInputElement;expect(title.required).toBe(true);fireEvent.change(title,{target:{value:'Receber avisos'}});fireEvent.click(toggle);expect(screen.queryByRole('textbox',{name:'Título'})).toBeNull();fireEvent.click(toggle);expect((screen.getByRole('textbox',{name:'Título'}) as HTMLInputElement).value).toBe('Receber avisos')
})
