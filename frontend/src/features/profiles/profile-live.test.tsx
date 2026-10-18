import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ProfileLive } from './profile-live'
import { emptyProfile, type PublicProfile } from './profile-contract'
const {request}=vi.hoisted(()=>({request:vi.fn()}))
vi.mock('./profile-api',()=>({publicProfileRequest:request}))
afterEach(()=>{cleanup();vi.useRealTimers();vi.resetAllMocks()})
const initial:PublicProfile={...emptyProfile(),slug:'pagina',name:'Eventos',restricted:false,publishedRevisionId:1,serverNow:'2026-10-17T12:00:00.000Z',nextBoundary:'2026-10-17T12:00:05.000Z',categories:[{id:'g',name:'Materiais',visible:true}],items:[{id:'i',categoryId:'g',type:'URL',label:'Evento atual',destination:'https://example.com/atual',visible:true}]}
it('F14-C03 hides clickable content at a server-derived boundary and never uses the browser wall clock to grant access',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2040-01-01Z'))
  let resolve!:(value:PublicProfile)=>void;request.mockImplementation(()=>new Promise<PublicProfile>(done=>{resolve=done}))
  render(<ProfileLive initial={initial} slug="pagina"/>);expect(screen.getByRole('link',{name:/Evento atual/})).toBeTruthy()
  await act(()=>vi.advanceTimersByTimeAsync(4000));expect(request).toHaveBeenCalledWith('pagina');expect(screen.queryByRole('link',{name:/Evento atual/})).toBeNull();expect(screen.getByRole('article').getAttribute('aria-busy')).toBe('true')
  await act(async()=>resolve({...initial,items:[],nextBoundary:null}));expect(screen.queryByRole('link',{name:/Evento atual/})).toBeNull();expect(screen.getByRole('article').getAttribute('aria-busy')).toBeNull()
})
it('F14-C04 network failure keeps stale links disabled; retry only displays the new authoritative projection',async()=>{
  vi.useFakeTimers();request.mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce({...initial,items:[],nextBoundary:null})
  render(<ProfileLive initial={initial} slug="pagina"/>);await act(()=>vi.advanceTimersByTimeAsync(4000));expect(screen.getByRole('alert').textContent).toContain('Sem conexão');expect(screen.queryByRole('link',{name:/Evento atual/})).toBeNull()
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Tentar de novo'})));expect(screen.queryByRole('alert')).toBeNull();expect(screen.queryByRole('link',{name:/Evento atual/})).toBeNull()
})
