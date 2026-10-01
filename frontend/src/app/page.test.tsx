import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomePage } from '@/components/domain/home-page'

describe('home', () => {
  it('não desenha nicho com idade na home', () => {
    render(<HomePage links={[{ id: '1', name: 'A', requiresAge: false }, { id: '2', name: 'B', requiresAge: true }]} />)
    expect(screen.queryByText('B')).toBeNull()
    expect(screen.getByText('A')).toBeTruthy()
  })
})
