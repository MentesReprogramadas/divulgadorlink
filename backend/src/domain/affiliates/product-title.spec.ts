import { expect, it } from 'vitest'
import { compactAffiliateTitle } from './product-title'

it.each([
  ['Árvore 1200 Galhos Verde Galhos','Árvore 1200 Galhos Verde'],
  ['Mesa 50 cm x 70 cm 50cm','Mesa 50 cm x 70 cm'],
  ['Ração 2,5 kg 2,5kg Racao','Ração 2,5 kg'],
  ['Samsung Galaxy A15 128 GB Samsung Galaxy A15','Samsung Galaxy A15 128 GB'],
  ['Kit 2 Peças e 2 Unidades Kit Peças','Kit 2 Peças e 2 Unidades'],
  ['Papai Noel Papai Noel 40 cm','Papai Noel 40 cm'],
])('compacta %s preservando fatos e é idempotente',(source,expected)=>{
  expect(compactAffiliateTitle(source)).toBe(expected)
  expect(compactAffiliateTitle(expected)).toBe(expected)
})
it('não omite negações e exceções para caber no limite visual',()=>{
  for(const source of ['Câmera digital sem WiFi','Câmera não acompanha cartão','Somente capa de câmera','Câmera without WiFi'])expect(compactAffiliateTitle(source)).toBe(source)
})
it('encurta um título qualificado longo mantendo a restrição inteira',()=>{
  const source='Câmera Câmera Digital Digital WiFi WiFi de Segurança Segurança HD 1080p sem cartão de memória'
  const result=compactAffiliateTitle(source)
  expect(result.length).toBeLessThanOrEqual(60)
  expect(result).toContain('1080p')
  expect(result).toMatch(/sem cartão de memória$/)
  expect(result.match(/Câmera/gi)).toHaveLength(1)
  expect(compactAffiliateTitle(result)).toBe(result)
})
