import { useState } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { emptyProfile, type ProfileContent } from '../profile-contract'
import { ProfileGroupManager } from './profile-group-manager'
import { chooseSelect } from '@/test-select'

afterEach(cleanup)
it('F16-C06 configuring a sample requires a real destination; cancel preserves it and the client does not grant itself publication rights',()=>{
  const content:ProfileContent={...emptyProfile(),categories:[{id:'g',name:'Comunidade',visible:true}],items:[{id:'i',categoryId:'g',type:'URL',label:'Entrar no grupo',destination:'https://example.com/modelos/comunidades/entrar',visible:false,templateExample:true}]}
  const changed=editor(content);fireEvent.click(screen.getByRole('button',{name:/Abrir grupo/}));fireEvent.click(screen.getByRole('button',{name:'Configurar exemplo'}));expect((screen.getByLabelText('Link de acesso') as HTMLInputElement).value).toBe('');fireEvent.click(screen.getByRole('button',{name:'Cancelar'}));expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'Configurar exemplo'}));fireEvent.change(screen.getByLabelText('Link de acesso'),{target:{value:'https://example.org/grupo-real'}});fireEvent.click(screen.getByRole('button',{name:'Concluir link'}));expect(changed).toHaveBeenCalledTimes(1);expect(changed.mock.calls[0][0].items[0]).toMatchObject({destination:'https://example.org/grupo-real',visible:true,templateExample:true})
})
function editor(content: ProfileContent) {
  const changed = vi.fn()
  function Harness() {
    const [value, setValue] = useState(content)
    return <ProfileGroupManager content={value} catalog={[]} onChange={next => { changed(next); setValue(next) }} />
  }
  render(<Harness />)
  return changed
}
it('cancelar edição e remoção de grupo devolve o foco ao acionador sem saltar ao título', () => {
  editor({ ...emptyProfile(), categories: [{ id: 'g', name: 'Comunidade', visible: true }] })
  fireEvent.click(screen.getByRole('button', { name: 'Comunidade Abrir grupo' }))
  for (const name of ['Editar grupo', 'Remover grupo']) {
    const trigger = screen.getByRole('button', { name })
    trigger.focus(); fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name })
    screen.getByRole('button', { name: 'Fechar janela' }).focus()
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  }
})
it('canceling creation leaves no empty group; completing opens only the new group', () => {
  const changed = editor(emptyProfile())
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar grupo' }))
  expect(screen.queryByLabelText('Grupo visível')).toBeNull()
  fireEvent.change(screen.getByLabelText('Nome do grupo'), { target: { value: 'Meus projetos' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar grupo' }))
  fireEvent.change(screen.getByLabelText('Nome do grupo'), { target: { value: 'Leituras' } })
  fireEvent.click(screen.getByRole('button', { name: 'Concluir grupo' }))
  expect(changed.mock.calls[0][0].categories).toHaveLength(1)
  expect(screen.getByRole('heading', { name: 'Leituras' })).toBe(document.activeElement)
  expect(screen.getByText('Adicione o primeiro link')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar link' }))
  expect(screen.queryByLabelText('Link visível')).toBeNull()
  expect(screen.getByRole('tab',{name:'Novo'}).getAttribute('aria-selected')).toBe('true')
  expect(screen.getByRole('tab',{name:'Meus links'})).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Título do link'), { target: { value: 'Rascunho cancelado' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).toHaveBeenCalledTimes(1)
})

it('visibility actions toggle groups and ordinary links on their cards without a modal',()=>{
 const changed=editor({...emptyProfile(),categories:[{id:'g',name:'Materiais',visible:true}],items:[{id:'one',categoryId:'g',type:'URL',label:'Guia',destination:'https://example.com',visible:true}]})
 fireEvent.click(screen.getByRole('button',{name:'Ocultar grupo Materiais'}));expect(changed.mock.lastCall?.[0].categories[0].visible).toBe(false);expect(screen.queryByRole('dialog')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Mostrar grupo Materiais'}));expect(changed.mock.lastCall?.[0].categories[0].visible).toBe(true)
 fireEvent.click(screen.getByRole('button',{name:'Materiais Abrir grupo'}));fireEvent.click(screen.getByRole('button',{name:'Ocultar link Guia'}));expect(changed.mock.lastCall?.[0].items[0].visible).toBe(false);expect(screen.queryByRole('dialog')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Mostrar link Guia'}));expect(changed.mock.lastCall?.[0].items[0].visible).toBe(true)
})
it('requires confirmation to remove a group and clears its primary link without changing another group', () => {
  const content = { ...emptyProfile(), primaryItemId: 'one', categories: [{ id: 'a', name: 'A', visible: true }, { id: 'b', name: 'B', visible: true }], items: [{ id: 'one', categoryId: 'a', type: 'URL' as const, label: 'One', destination: 'https://example.com', visible: true }] }
  const changed = editor(content)
  fireEvent.click(screen.getByRole('button', { name: 'A Abrir grupo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Remover grupo' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Remover grupo' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar remoção' }))
  expect(changed.mock.calls[0][0]).toMatchObject({ categories: [{ id: 'b', name: 'B', visible: true }], items: [], primaryItemId: null })
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Adicionar grupo' }))
})

it('choosing the main button uses a modal and only applies when confirmed', async () => {
  const changed = editor({ ...emptyProfile(), categories: [{ id: 'a', name: 'A', visible: true }], items: [{ id: 'one', categoryId: 'a', type: 'URL', label: 'Meu site', destination: 'https://example.com', visible: true }] })
  expect(screen.queryByLabelText('Botão principal')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Botão principal' }))
  await chooseSelect(screen.getByLabelText('Botão principal'), 'one')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Botão principal' }))
  await chooseSelect(screen.getByLabelText('Botão principal'), 'one')
  fireEvent.click(screen.getByRole('button', { name: 'Concluir' }))
  expect(changed.mock.calls[0][0].primaryItemId).toBe('one')
  expect(screen.queryByRole('dialog', { name: 'Escolher botão principal' })).toBeNull()
})

it('moves a link from its editing form only after confirmation, preserving the main button', async () => {
  const changed = editor({ ...emptyProfile(), primaryItemId: 'one', categories: [{ id: 'a', name: 'A', visible: true }, { id: 'b', name: 'B', visible: true }], items: [{ id: 'one', categoryId: 'a', type: 'URL', label: 'Meu site', destination: 'https://example.com', visible: true }, { id: 'two', categoryId: 'b', type: 'URL', label: 'Outro', destination: 'https://example.org', visible: true }] })
  fireEvent.click(screen.getByRole('button', { name: 'A Abrir grupo' }))
  expect(screen.queryByText('Opções do grupo')).toBeNull()
  expect(screen.queryByText('Mover e remover')).toBeNull()
  expect(screen.getByRole('button', { name: 'Remover link' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Editar link' }))
  await chooseSelect(screen.getByLabelText('Grupo'), 'b')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(changed).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Editar link' }))
  await chooseSelect(screen.getByLabelText('Grupo'), 'b')
  fireEvent.click(screen.getByRole('button', { name: 'Concluir link' }))
  expect(changed.mock.calls[0][0]).toMatchObject({ primaryItemId: 'one', items: [{ id: 'two', categoryId: 'b' }, { id: 'one', categoryId: 'b' }] })
  expect(screen.getByText('Adicione o primeiro link')).toBeTruthy()
})
