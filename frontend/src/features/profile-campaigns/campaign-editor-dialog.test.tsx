import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CampaignEditorDialog} from './campaign-editor-dialog'
afterEach(cleanup)
it('source preview keeps form and step mounted and never submits on open or return',()=>{
 const source={slug:'ana',name:'Ana',bio:'Descrição da página',avatarAssetId:null,requiresAge:false,primaryItemId:null,categories:[],items:[]};const save=vi.fn();render(<CampaignEditorDialog draft={{id:null,name:'Minha campanha',slug:'campanha',sourceRevisionId:'source',sourceVersion:1,source,selected:[],expectedVersion:0}} revisions={[]} pending={false} error="" returnFocusTo={null} onChange={()=>{}} onSource={()=>{}} onSave={save} onClose={()=>{}}/>);fireEvent.click(screen.getByRole('button',{name:'Ver prévia da publicação'}));expect(screen.getByRole('heading',{name:'Ana'})).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'Voltar à configuração'}));expect((screen.getByLabelText('Nome para organizar a campanha') as HTMLInputElement).value).toBe('Minha campanha');expect(screen.getByRole('button',{name:'Continuar'})).toBeTruthy();expect(save).not.toHaveBeenCalled()
})
