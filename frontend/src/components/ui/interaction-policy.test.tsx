import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {InteractionPolicy} from './interaction-policy'
import {Button} from './button'
import {Input} from './input'
afterEach(cleanup)
it('read-only disables writes while keeping explicitly classified reading actions available',()=>{
 const write=vi.fn(),read=vi.fn();render(<InteractionPolicy readOnly><Button onClick={write}>Salvar</Button><Button readOnlyAllowed onClick={read}>Consultar</Button><Input type="checkbox" disabled={false} aria-label="Alterar preferência"/></InteractionPolicy>);fireEvent.click(screen.getByRole('button',{name:'Salvar'}));fireEvent.click(screen.getByRole('button',{name:'Consultar'}));expect(write).not.toHaveBeenCalled();expect(read).toHaveBeenCalledOnce();expect((screen.getByLabelText('Alterar preferência') as HTMLInputElement).disabled).toBe(true)
})
