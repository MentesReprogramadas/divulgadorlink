import {render,screen,cleanup} from '@testing-library/react'
import {afterEach,expect,it} from 'vitest'
import {ProfileCreationChoice} from './profile-creation-choice'
afterEach(cleanup)
it('F25-G01 oferece dois caminhos explícitos com ícones, descrições e recomendação sem iniciar geração',()=>{render(<ProfileCreationChoice/>);const manual=screen.getByRole('link',{name:/Criar do meu jeito/}),assistant=screen.getByRole('link',{name:/Criar com ajuda/});expect(manual.getAttribute('href')).toBe('/painel/perfil/dados');expect(assistant.getAttribute('href')).toBe('/painel/perfil/assistente');expect(manual.querySelector('svg')).toBeTruthy();expect(assistant.querySelector('svg')).toBeTruthy();expect(assistant.textContent).toContain('Recomendado');expect(screen.queryByRole('button',{name:/Gerar/})).toBeNull()})

it('F25-G02 não oferece navegação ao assistente sem o grant independente',()=>{render(<ProfileCreationChoice canUseAssistant={false}/>);expect(screen.queryByRole('link',{name:/Criar com ajuda/})).toBeNull();expect(screen.getByText('Peça acesso ao assistente')).toBeTruthy();expect(screen.getByRole('link',{name:/Criar do meu jeito/})).toBeTruthy()})
