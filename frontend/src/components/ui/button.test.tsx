import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button, ButtonLink } from './button'
import { Badge } from './badge'
import { Field, Input } from './input'
import { Pagination } from './pagination'

describe('controles', () => {
  it('renderiza botão, link de ação, campo e paginação', () => {
    render(
      <>
        <Button variant="primary">Salvar</Button>
        <ButtonLink href="/painel/links/novo">Novo link</ButtonLink>
        <Field label="Nome"><Input aria-label="Nome" /></Field>
        <Badge>Publicado</Badge>
        <Pagination page={1} pages={2} onPage={() => undefined} />
      </>,
    )
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Novo link' }).getAttribute('href')).toBe('/painel/links/novo')
    expect(screen.getByLabelText('Nome')).toBeTruthy()
    expect(screen.getByText('Publicado')).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Paginação' })).toBeTruthy()
  })
})
