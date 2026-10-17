import { chooseSelect } from '@/test-select'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { LinkList, type PanelLink } from './panel-links'

afterEach(cleanup)
const links: PanelLink[] = [
  { id: 'a', name: 'Estudos', description: 'Livros e leitura', status: 'PUBLISHED', network: { name: 'WhatsApp' } },
  { id: 'b', name: 'Notícias', status: 'DRAFT', network: { name: 'Telegram' } },
]
it('combina busca, rede e situação e permite recuperar a lista ao limpar filtros', async () => {
  render(<LinkList links={links} stats={{}} banned={false} />)
  fireEvent.change(screen.getByLabelText('Buscar nos meus links'), { target: { value: 'leitura' } })
  expect(screen.getByRole('heading', { name: 'Estudos' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Notícias' })).toBeNull()
  await chooseSelect(screen.getByLabelText('Rede'), 'Telegram')
  expect(screen.getByText('Nenhum link neste filtro')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
  expect(screen.getAllByRole('article')).toHaveLength(2)
  await chooseSelect(screen.getByLabelText('Situação do link'), 'draft')
  expect(screen.getByRole('heading', { name: 'Notícias' })).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Estudos' })).toBeNull()
})
it('ordena por cliques reais e não oferece edição ou destaque para conta suspensa', async () => {
  render(<LinkList links={links} stats={{ a: { impressions: 4, clicks: 1, ctr: 25 }, b: { impressions: 5, clicks: 3, ctr: 60 } }} banned />)
  await chooseSelect(screen.getByLabelText('Ordenar por'), 'clicks')
  expect(screen.getAllByRole('article')[0]?.textContent).toContain('Notícias')
  expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Destacar' })).toBeNull()
})
