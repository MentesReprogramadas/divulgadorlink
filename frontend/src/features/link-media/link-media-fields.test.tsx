import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { LinkMediaFields, type LinkMediaDraft } from './link-media-fields'
vi.mock('./prepare-link-media', () => ({ prepareLinkMediaFile: vi.fn(async () => 'cGl4ZWxz') }))
afterEach(cleanup)
function Fields() { const [value,setValue]=useState<LinkMediaDraft>({}); return <LinkMediaFields value={value} onChange={setValue}/> }
it('chooses, previews and removes optional image without inventing a photo', async () => {
  render(<Fields />)
  expect(screen.queryByRole('img')).toBeNull()
  fireEvent.change(screen.getByLabelText('Imagem do link (opcional)'), {target:{files:[new File(['pixels'],'image.png',{type:'image/png'})]}})
  await waitFor(()=>expect(screen.getByRole('img',{name:'Prévia da imagem escolhida'})).toBeTruthy())
  fireEvent.change(screen.getByLabelText('Descrição da imagem'),{target:{value:'Pessoas conversando'}})
  fireEvent.click(screen.getByRole('button',{name:'Remover imagem escolhida'}))
  expect(screen.queryByRole('img')).toBeNull()
})
