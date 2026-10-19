import { cleanup, render, screen, within } from '@testing-library/react'
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
  expect(within(screen.getByRole('article')).getAllByRole('link')).toHaveLength(1)
  expect(document.body.innerHTML).not.toMatch(/Secreto|Sentinela|secret.test|private.test/)
})
it('F09-C01 vazio orienta sem inventar destino', () => { render(<ProfileView content={emptyProfile()} />); expect(screen.getByText('Nenhum link visível.')).toBeTruthy(); expect(within(screen.getByRole('article')).queryAllByRole('link')).toHaveLength(0) })

it('marca permanece visível e não integra os links pessoais', () => { render(<ProfileView content={emptyProfile()} />); expect(screen.getByRole('link', { name: 'Criado por Tem Link Aqui' }).getAttribute('href')).toBe('/divulgar') })

it('mixed groups keep ordinary labels and ordering while hiding only the channel custom text',()=>{
 render(<ProfileView content={{...emptyProfile(),name:'Comunidade',categories:[{id:'g',name:'Participe',visible:true}],items:[{id:'guide',categoryId:'g',type:'URL',destination:'https://example.com/guia',label:'Guia completo',visible:true},{id:'tg',categoryId:'g',type:'URL',destination:'https://t.me/community',label:'Receber avisos',visible:true}],channelGroups:[{id:'g',name:'Participe',channels:[{id:'tg',label:'Receber avisos',network:{name:'Telegram',slug:'telegram'},href:'/p/comunidade/canais/tg?token=fixture',showLabel:false}]}]}}/> )
 const links=within(screen.getByRole('region',{name:'Participe'})).getAllByRole('link')
 expect(links[0].textContent).toContain('Guia completo');expect(links[1].getAttribute('aria-label')).toBe('Telegram');expect(links[1].textContent).not.toContain('Receber avisos');expect(links[1].getAttribute('href')).toContain('/canais/tg?token=')
})
