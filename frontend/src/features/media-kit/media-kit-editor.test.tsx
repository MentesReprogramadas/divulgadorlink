import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MediaKitEditor} from './media-kit-editor'
import {emptyMediaContent,type MediaState} from './media-kit-contract'
import {useState} from 'react'
afterEach(cleanup)
const state:MediaState={draft:emptyMediaContent(),version:0,publishedVersion:null,hasPublishedProfile:true,publicPath:'/p/ana/midia-kit',changed:true,contacts:[],links:[{id:'link',name:'Projeto'}]}
function Fixture(){const [draft,setDraft]=useState(emptyMediaContent());return <MediaKitEditor draft={draft} state={state} pending={false} error="" returnFocusTo={null} onChange={setDraft} onSave={vi.fn()} onClose={vi.fn()}/>}
it('F21-C03 adding/removing a metric never submits or skips the current step',()=>{render(<Fixture/>);fireEvent.click(screen.getByRole('button',{name:'Continuar'}));fireEvent.click(screen.getByRole('button',{name:'Adicionar métrica medida'}));expect(screen.getByLabelText('De')).toBeTruthy();expect(screen.queryByLabelText('Quantidade de seguidores')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Remover métrica'}));expect(screen.getByRole('button',{name:'Adicionar métrica medida'})).toBeTruthy();expect(screen.queryByText('Seguidores informados por você. Estes números não são verificados pela plataforma.')).toBeNull()})
