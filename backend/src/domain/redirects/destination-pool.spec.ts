import {expect,it} from 'vitest'
import {selectWeighted} from './destination-pool'
const rows=[{id:'a',weight:1,paused:false},{id:'b',weight:3,paused:false}]
it('F23-U01 pesos 1/3 têm sequência auditável',()=>expect(Array.from({length:8},(_,n)=>selectWeighted(rows,n)?.id)).toEqual(['a','b','b','b','a','b','b','b']))
it('F23-U02 destino pausado nunca é escolhido',()=>expect(selectWeighted([{...rows[0],paused:true},rows[1]],0)?.id).toBe('b'))
it('F23-U03 nenhum elegível não encaminha',()=>expect(selectWeighted(rows.map(r=>({...r,paused:true})),0)).toBeNull())
it('F23-U04 pesos não positivos são recusados',()=>expect(()=>selectWeighted([{weight:0,paused:false}],0)).toThrow())
