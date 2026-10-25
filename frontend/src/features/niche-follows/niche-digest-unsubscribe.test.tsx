import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {NicheDigestUnsubscribe} from './niche-digest-unsubscribe'

const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('@/lib/api',()=>({api:request}))
afterEach(()=>{cleanup();vi.resetAllMocks()})

it('explains an invalid cancellation token in Portuguese without exposing generic validation output',async()=>{
 request.mockResolvedValueOnce({status:400,body:{message:'Validation error.'}})
 render(<NicheDigestUnsubscribe token="invalid-token"/>);fireEvent.click(screen.getByRole('button',{name:'Parar resumos'}))
 expect((await screen.findByRole('alert')).textContent).toBe('Este link de cancelamento é inválido. Use o link recebido no e-mail mais recente.')
 expect(screen.queryByText('Resumos desativados')).toBeNull()
 expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({token:'invalid-token'})
})

it('preserves the connection retry guidance and does not confirm a failed cancellation',async()=>{
 request.mockRejectedValueOnce(new Error('offline'))
 render(<NicheDigestUnsubscribe token="current-token"/>);fireEvent.click(screen.getByRole('button',{name:'Parar resumos'}))
 expect((await screen.findByRole('alert')).textContent).toBe('Sem conexão. Tente de novo.')
 expect((screen.getByRole('button',{name:'Parar resumos'}) as HTMLButtonElement).disabled).toBe(false)
 expect(screen.queryByText('Resumos desativados')).toBeNull()
})
