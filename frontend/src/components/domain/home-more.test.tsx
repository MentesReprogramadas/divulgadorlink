import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomeMore } from './home-more'

describe('página seguinte da home', () => {
  it('esconde o controle sem cursor', () => {
    render(<HomeMore cursor={null} />)
    expect(screen.queryByRole('link', { name: 'Mostrar mais' })).toBeNull()
  })

  it('aponta para a mesma home com o cursor', () => {
    render(<HomeMore cursor="abc" />)
    expect(screen.getByRole('link', { name: 'Mostrar mais' }).getAttribute('href')).toBe('/?cursor=abc')
  })
})
