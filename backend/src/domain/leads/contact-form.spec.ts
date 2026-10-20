import {describe,it,expect} from 'vitest'
import {parseAnswers,csvCell} from './contact-form'
const definition={purpose:'contact',enabled:true,fields:[{key:'email',required:true},{key:'message',required:false}]}
describe('F22',()=>{
 it('U01 recusa obrigatório vazio',()=>expect(()=>parseAnswers(definition,{email:''})).toThrow())
 it('U02 recusa campos desconhecidos e consentimento misturado às respostas',()=>expect(()=>parseAnswers(definition,{email:'ana@example.com',marketingOptIn:'true'})).toThrow())
 it('U03 mantém contato válido sem exigir novidades e sem acrescentar dados privados',()=>expect(parseAnswers(definition,{email:'ana@example.com',message:'Olá'})).toEqual({email:'ana@example.com',message:'Olá'}))
 it('U04 exportação protege fórmulas e aspas',()=>{expect(csvCell('=HYPERLINK("x")').slice(0,2)).toBe(String.fromCharCode(34,39));expect(csvCell('Olá, mundo')).toBe('"Olá, mundo"')})
})
