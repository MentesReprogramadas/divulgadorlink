import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { ConnectionCard } from './connection-card'

vi.mock('@/components/ui/liquid-lens',()=>({LiquidLens:()=>null}))
afterEach(cleanup)
const instance={id:'one',name:'Principal 01',enabled:true,configured:true}
const actions=()=>({onConnect:vi.fn(),onRefresh:vi.fn(),onEdit:vi.fn(),onToggle:vi.fn(),onViewSegments:vi.fn()})
it('conta conectada oferece o próximo uso sem oferecer outro QR',()=>{
  const callbacks=actions()
  render(<ConnectionCard instance={instance} state="open" segmentCount={1} busy={false} {...callbacks}/> )
  expect(screen.getByRole('status').textContent).toBe('Conectada')
  expect(screen.queryByRole('button',{name:/Conectar WhatsApp|Abrir QR/})).toBeNull()
  // JSDOM does not compute native closed-details visibility; the browser check covers it.
  expect(screen.getByRole('button',{name:'Pausar conta'}).closest('details')?.open).toBe(false)
  fireEvent.click(screen.getByRole('button',{name:'Ver segmentações'}))
  expect(callbacks.onViewSegments).toHaveBeenCalledOnce()
})
it('conectar depende de estado conhecido, e pausa exige ativar antes',()=>{
  const callbacks=actions(),{rerender}=render(<ConnectionCard instance={instance} state="checking" segmentCount={0} busy={false} {...callbacks}/> )
  expect(screen.getByRole('button',{name:'Conferindo…'}).hasAttribute('disabled')).toBe(true)
  expect(screen.queryByRole('button',{name:'Conectar WhatsApp'})).toBeNull()
  rerender(<ConnectionCard instance={instance} state="close" segmentCount={0} busy={false} {...callbacks}/>)
  fireEvent.click(screen.getByRole('button',{name:'Conectar WhatsApp'}));expect(callbacks.onConnect).toHaveBeenCalledOnce()
  rerender(<ConnectionCard instance={{...instance,enabled:false}} state="open" segmentCount={0} busy={false} {...callbacks}/>)
  fireEvent.click(screen.getByRole('button',{name:'Ativar conta'}));expect(callbacks.onToggle).toHaveBeenCalledOnce()
})
it('menu recolhe e devolve foco ao disparador ao editar',()=>{
  const callbacks=actions()
  render(<ConnectionCard instance={instance} state="open" segmentCount={0} busy={false} {...callbacks}/>)
  const summary=screen.getByText('Mais opções').closest('summary')!,details=summary.parentElement as HTMLDetailsElement
  details.open=true
  fireEvent.click(screen.getByRole('button',{name:'Editar dados'}))
  expect(details.open).toBe(false)
  expect(callbacks.onEdit).toHaveBeenCalledWith(summary)
  expect(document.activeElement).toBe(summary)
})
