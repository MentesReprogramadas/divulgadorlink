import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {Pagination} from './pagination'
afterEach(cleanup)
it('F15-C05 compact pagination keeps thousands of pages bounded with accessible previous and next controls',()=>{
 const onPage=vi.fn();render(<Pagination page={1} pages={250} variant="compact" onPage={onPage}/>);expect(screen.getAllByRole('button')).toHaveLength(2);expect((screen.getByRole('button',{name:'Anterior'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Próxima'}));expect(onPage).toHaveBeenCalledWith(2);expect(screen.getByText('Página 1 de 250')).toBeTruthy()
})
it('F15-C05 default pagination preserves existing numbered controls',()=>{render(<Pagination page={2} pages={3} onPage={()=>undefined}/>);expect(screen.getAllByRole('button')).toHaveLength(5);expect(screen.getByRole('button',{name:'2'}).getAttribute('aria-current')).toBe('page')})
