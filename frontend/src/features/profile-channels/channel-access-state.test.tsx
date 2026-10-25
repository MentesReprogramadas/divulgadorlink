import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ChannelAccessState } from './channel-access-state'
import { PersonalPageBrand } from '@/features/profiles/components/personal-page-brand'

afterEach(cleanup)

it('o estado de canal usa a marca para fundo escuro sem trocar a assinatura padrão da página pessoal', () => {
  const { rerender } = render(<ChannelAccessState slug="comunidade" ageRequired={false} />)
  expect(screen.getByRole('img', { name: 'Tem Link Aqui' }).getAttribute('src')).toBe('/brand/ondas-logo.svg')
  expect(screen.getByRole('link', { name: 'Voltar à página' }).getAttribute('href')).toBe('/p/comunidade')

  rerender(<PersonalPageBrand />)
  expect(screen.getByRole('img', { name: 'Tem Link Aqui' }).getAttribute('src')).toBe('/brand/confluencia/assinatura-claro.svg')
})
