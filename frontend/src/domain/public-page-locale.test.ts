import {expect,it} from 'vitest'
import {browserPageLocale,pageText} from './public-page-locale'
it('respeita preferência e qualidade do navegador, variantes regionais e idiomas não suportados',()=>{
 expect(browserPageLocale('fr;q=1,es-AR;q=.9,en-US;q=.8')).toBe('es')
 expect(browserPageLocale('en;q=0,pt-PT;q=.5')).toBe('pt-BR')
 expect(browserPageLocale('fr,de')).toBeUndefined()
 expect(browserPageLocale(null)).toBeUndefined()
 expect(browserPageLocale('en;q=invalid,es')).toBe('es')
})
it('traduz controles e validação sem traduzir conteúdo do cliente',()=>{
 expect(pageText('en','Enviar contato')).toBe('Send contact')
 expect(pageText('es','Use até 120 caracteres.')).toBe('Usa hasta 120 caracteres.')
 expect(pageText('en','Minha descrição')).toBe('Minha descrição')
})
