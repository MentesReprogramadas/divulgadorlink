import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { SkeletonField, SkeletonRegion } from './skeleton'

afterEach(cleanup)
it('anuncia somente o carregamento e impede interação com campos provisórios', () => {
  render(<SkeletonRegion><SkeletonField label="Título do link" hint="Nome do conteúdo." /><SkeletonField multiline /></SkeletonRegion>)
  expect(screen.getByRole('status', { name: 'Carregando' })).toBeTruthy()
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(document.querySelector('[inert]')).toBeTruthy()
  for (const field of document.querySelectorAll('input, textarea')) expect((field as HTMLInputElement).disabled).toBe(true)
})
