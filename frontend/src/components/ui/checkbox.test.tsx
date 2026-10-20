import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {Checkbox} from './checkbox'
import {InteractionPolicy} from './interaction-policy'
afterEach(cleanup)
it('mantém semântica nativa sem os estilos de campo de texto',()=>{const change=vi.fn();render(<label><Checkbox onChange={change}/>Receber contato</label>);const input=screen.getByRole('checkbox',{name:'Receber contato'}) as HTMLInputElement;expect(input.classList.contains('field')).toBe(false);fireEvent.click(input);expect(input.checked).toBe(true);expect(change).toHaveBeenCalledOnce()})
it('respeita a política de somente leitura',()=>{render(<InteractionPolicy readOnly><Checkbox aria-label="Alterar"/></InteractionPolicy>);expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true)})
