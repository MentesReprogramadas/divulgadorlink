import {expect,it} from 'vitest'
import {profileEditorSection} from './profile-editor-section'

it.each([
 ['visao-geral','overview'],['pagina','identity'],['apresentacao','identity'],
 ['links','groups'],['aparencia','appearance'],['busca','search'],
 ['formulario','contact'],['descoberta','discovery'],['inexistente',undefined],
] as const)('interpreta a seção %s sem quebrar os endereços anteriores',(input,section)=>{
 expect(profileEditorSection(input)).toBe(section)
})

it('ignora seção ausente ou parâmetros repetidos',()=>{
 expect(profileEditorSection(undefined)).toBeUndefined()
 expect(profileEditorSection(['busca','formulario'])).toBeUndefined()
})
