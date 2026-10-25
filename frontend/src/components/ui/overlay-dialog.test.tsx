import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {OverlayDialog} from './overlay-dialog'
import {useState} from 'react'
afterEach(cleanup)
it('restaura o foco depois do commit quando o diálogo fechado continua montado',()=>{
 function Harness(){const[open,setOpen]=useState(false);return <><button id="dialog-trigger" onClick={()=>setOpen(true)}>Abrir</button><OverlayDialog open={open} title="Editar" returnFocusTo={document.getElementById('dialog-trigger')} onClose={()=>setOpen(false)}>Conteúdo</OverlayDialog></>}
 render(<Harness/>);const trigger=screen.getByRole('button',{name:'Abrir'});trigger.focus();fireEvent.click(trigger);const close=screen.getByRole('button',{name:'Fechar janela'});close.focus();fireEvent.click(close);expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(trigger)
})
it('Escape no diálogo interno não fecha a sidebar que o abriu',()=>{
 const outer=vi.fn(),inner=vi.fn();render(<OverlayDialog open title="Menu" variant="sidebar" onClose={outer}><OverlayDialog open title="Ajuda" onClose={inner}>Conteúdo</OverlayDialog></OverlayDialog>);fireEvent(screen.getByRole('dialog',{name:'Ajuda'}),new Event('cancel',{bubbles:true,cancelable:true}));expect(inner).toHaveBeenCalledOnce();expect(outer).not.toHaveBeenCalled()
})
it('preserva a proteção de fechamento durante uma operação',()=>{
 const close=vi.fn();render(<OverlayDialog open closeDisabled title="Salvando" onClose={close}>Conteúdo</OverlayDialog>);const event=new Event('cancel',{bubbles:true,cancelable:true});fireEvent(screen.getByRole('dialog',{name:'Salvando'}),event);expect(event.defaultPrevented).toBe(true);expect(close).not.toHaveBeenCalled()
})
it('mantém select nativo no ciclo de foco sem incluir controles de diálogo filho',()=>{
 render(<OverlayDialog open title="Filtros" onClose={vi.fn()}><select aria-label="Ordem"><option>Nome</option></select><OverlayDialog open title="Ajuda" onClose={vi.fn()}><button>Último interno</button></OverlayDialog></OverlayDialog>)
 const dialog=screen.getByRole('dialog',{name:'Filtros'}),first=screen.getAllByRole('button',{name:'Fechar janela'})[0],select=screen.getByRole('combobox')
 const rect=vi.spyOn(HTMLElement.prototype,'getClientRects').mockReturnValue([{width:10,height:10}] as unknown as DOMRectList)
 try {
  first.focus();fireEvent.keyDown(first,{key:'Tab',shiftKey:true});expect(document.activeElement).toBe(select)
  select.focus();fireEvent.keyDown(select,{key:'Tab'});expect(document.activeElement).toBe(first)
  expect(dialog.contains(select)).toBe(true)
 } finally {rect.mockRestore()}
})
