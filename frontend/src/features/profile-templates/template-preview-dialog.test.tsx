import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {TemplatePreviewDialog} from './template-preview-dialog'
import {defaultAppearance} from '@/features/profiles/profile-appearance'
import type {ProfileTemplate} from './template-contract'
afterEach(cleanup)
const template:ProfileTemplate={versionId:'creator-v1',activity:'CREATOR',title:'Criadores',description:'Conteúdos e contato',appearance:defaultAppearance,demoName:'Seu conteúdo',demoBio:'Demonstração fictícia',groups:[{key:'content',name:'Conteúdos',links:[{key:'videos',label:'Ver conteúdos',destination:'https://example.com/modelos/criadores/videos'}]}]}
it('F16-C01/T01/T04 requires viewing the demonstration before applying; preserve is default and replacement needs explicit confirmation',()=>{
  const apply=vi.fn();render(<TemplatePreviewDialog template={template} configured unpublished pending={false} error="" onApply={apply} onClose={vi.fn()}/>)
  expect(screen.getByRole('img',{name:/Prévia fictícia do modelo Criadores/})).toBeTruthy();expect(screen.queryByRole('button',{name:'Aplicar ao rascunho'})).toBeNull();expect(apply).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Continuar'}));expect((screen.getByLabelText('Manter meus grupos e links') as HTMLInputElement).checked).toBe(true)
  fireEvent.click(screen.getByLabelText('Manter meus grupos e links'));expect(screen.getByRole('button',{name:'Aplicar ao rascunho'}).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByLabelText('Confirmo a substituição dos grupos e links'));fireEvent.click(screen.getByRole('button',{name:'Aplicar ao rascunho'}));expect(apply).toHaveBeenCalledWith(false,true)
})
it('F16-C02 API failure preserves replacement choices and pending state disables changes, close and duplicate submission',()=>{
  const apply=vi.fn(),close=vi.fn(),view=render(<TemplatePreviewDialog template={template} configured unpublished pending={false} error="" onApply={apply} onClose={close}/>)
  fireEvent.click(screen.getByRole('button',{name:'Continuar'}));fireEvent.click(screen.getByLabelText('Manter meus grupos e links'));fireEvent.click(screen.getByLabelText('Confirmo a substituição dos grupos e links'))
  view.rerender(<TemplatePreviewDialog template={template} configured unpublished pending={false} error="Sem conexão. Suas escolhas foram mantidas." onApply={apply} onClose={close}/>)
  expect(screen.getByRole('alert').textContent).toContain('Sem conexão');expect((screen.getByLabelText('Confirmo a substituição dos grupos e links') as HTMLInputElement).checked).toBe(true)
  view.rerender(<TemplatePreviewDialog template={template} configured unpublished pending error="" onApply={apply} onClose={close}/>)
  expect(screen.getByRole('button',{name:'Aplicar ao rascunho'}).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button',{name:'Aplicar ao rascunho'}));fireEvent.click(screen.getByRole('button',{name:'Fechar janela'}));expect(apply).not.toHaveBeenCalled();expect(close).not.toHaveBeenCalled()
})
