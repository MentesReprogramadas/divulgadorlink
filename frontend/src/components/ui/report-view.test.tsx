import {cleanup,fireEvent,render,screen,within} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ReportView} from './report-view'
afterEach(cleanup)
it('alterna visualização e pagina a tabela com a última página incompleta',()=>{
 const rows=Array.from({length:16},(_,index)=>({id:String(index),label:'Registro '+(index+1),value:index}))
 render(<ReportView title="Relatório de teste" rows={rows} rowKey={row=>row.id} columns={[{label:'Registro',render:row=>row.label},{label:'Valor',render:row=>row.value,numeric:true}]} chart={<p>Gráfico completo</p>}/>)
 expect(screen.getByText('Gráfico completo')).toBeTruthy();expect(screen.queryByRole('table')).toBeNull()
 fireEvent.click(screen.getByRole('tab',{name:'Tabela'}))
 expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(8)
 fireEvent.click(screen.getByRole('button',{name:'Próxima'}));expect(screen.getByText('Registro 8')).toBeTruthy()
 fireEvent.click(screen.getByRole('button',{name:'Próxima'}));expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3)
 expect((screen.getByRole('button',{name:'Próxima'}) as HTMLButtonElement).disabled).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'Anterior'}));expect(screen.getByText('Registro 8')).toBeTruthy()
 fireEvent.click(screen.getByRole('tab',{name:'Gráficos'}));expect(screen.getByText('Gráfico completo')).toBeTruthy()
})
it('não inventa gráficos para uma série inexistente',()=>{
 const {container}=render(<ReportView title="Vazio" rows={[]} rowKey={row=>String(row)} columns={[]} chart={<p>Indevido</p>}/>)
 expect(container.textContent).toBe('')
})
