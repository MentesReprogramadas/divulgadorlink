import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { FileUpload } from './file-upload'
import { ImageUpload } from './image-upload'
import { InteractionPolicy } from './interaction-policy'

afterEach(cleanup)

it('aceita escolher e arrastar arquivos pelo mesmo controle', () => {
  const onChoose=vi.fn(), file=new File(['{}'],'pagina.json',{type:'application/json'})
  render(<FileUpload label="Arquivo da página" accept=".json" onChoose={onChoose}/>)
  const input=screen.getByLabelText('Arquivo da página')
  fireEvent.change(input,{target:{files:[file]}})
  expect(onChoose).toHaveBeenLastCalledWith(file)
  fireEvent.drop(input.closest('label')!,{dataTransfer:{files:[file]}})
  expect(onChoose).toHaveBeenCalledTimes(2)
})

it('bloqueia arrastar arquivos em modo somente leitura', () => {
  const onChoose=vi.fn()
  render(<InteractionPolicy readOnly><FileUpload label="Arquivo" accept=".json" onChoose={onChoose}/></InteractionPolicy>)
  const input=screen.getByLabelText('Arquivo') as HTMLInputElement
  expect(input.disabled).toBe(true)
  fireEvent.drop(input.closest('label')!,{dataTransfer:{files:[new File(['{}'],'pagina.json')]}})
  expect(onChoose).not.toHaveBeenCalled()
})

it('preserva a prévia e a remoção de foto ao compartilhar o upload', () => {
  const remove=vi.fn()
  render(<ImageUpload label="Foto do perfil" imageUrl="/foto.webp" onChoose={vi.fn()} onRemove={remove}/>)
  expect(screen.getByRole('img',{name:'Foto atual do perfil'}).getAttribute('src')).toBe('/foto.webp')
  expect(screen.getByLabelText('Foto do perfil').getAttribute('accept')).toContain('image/webp')
  fireEvent.click(screen.getByRole('button',{name:'Remover foto'}))
  expect(remove).toHaveBeenCalledOnce()
})
