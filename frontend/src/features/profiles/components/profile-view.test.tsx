import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ProfileView } from './profile-view'
import { emptyProfile } from '../profile-contract'
afterEach(cleanup)
it('F09-C02/T05 o mesmo renderer da prévia e página pública filtra filhos e grupos ocultos', () => {
  render(<ProfileView content={{ ...emptyProfile(), name: 'Ana', bio: 'Meus projetos', categories: [{ id: 'a', name: 'Trabalho', visible: true }, { id: 'b', name: 'GrupoSecreto', visible: false }], primaryItemId: 'hidden', items: [
    { id: '1', categoryId: 'a', type: 'URL', destination: 'https://example.com/', label: 'Site', visible: true },
    { id: 'hidden', categoryId: 'a', type: 'URL', destination: 'https://secret.test/', label: 'OcultoSentinela', visible: false },
    { id: 'child', categoryId: 'b', type: 'URL', destination: 'https://private.test/', label: 'FilhoSecreto', visible: true },
  ] }} />)
  expect(screen.getByRole('heading', { name: 'Ana' })).toBeTruthy()
  expect(screen.getAllByRole('link')).toHaveLength(1)
  expect(document.body.innerHTML).not.toMatch(/Secreto|Sentinela|secret.test|private.test/)
})
it('F09-C01 vazio orienta sem inventar destino', () => { render(<ProfileView content={emptyProfile()} />); expect(screen.getByText('Nenhum link visível.')).toBeTruthy(); expect(screen.queryAllByRole('link')).toHaveLength(0) })
