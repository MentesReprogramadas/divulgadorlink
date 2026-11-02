import {expect,it} from 'vitest'
import {petProductCategory,petDiscoveryTerms,interleavePetCategories} from './pet-products'
it.each([
 ['Areia Higiênica Pipicat Classic para Gatos 12kg','LITTER'],
 ['Kit Luva + Escova Lava Pelos com Dispenser de Shampoo para Pets','HYGIENE'],
 ['Kit 2 Arranhadores de Papelão para Gatos Varottoagro','SCRATCHING'],
 ['Comedouro lento com dispenser de ração para cachorro','FEEDING'],
 ['Brinquedo mordedor para cachorro sabor ração','TOYS'],
 ['Ração seca para cães adultos 10kg','FOOD'],
 ['Cama para gato','REST'],['Peitoral para cachorro','WALKING'],
 ['Antipulgas para gatos','HEALTH'],['Produto para pets','OTHER'],
])('classifica %s', (title,category)=>expect(petProductCategory(title)).toBe(category))
it('mantém espécies específicas e preserva nichos sem misturar gatos e cães',()=>{
 expect(petDiscoveryTerms('Gatos',[]).every(t=>t.includes('gatos'))).toBe(true)
 expect(petDiscoveryTerms('Cachorros',[]).every(t=>t.includes('cachorros'))).toBe(true)
 expect(petDiscoveryTerms('Aquários',[])).toEqual([])
 expect(petDiscoveryTerms('Ração para gatos',[])).toEqual([])
 for(const name of ['Antipulgas para gatos','Camas para gatos','Coleiras para cachorro','Higiene para pets','Alimentação para gatos','Acessórios para pets'])expect(petDiscoveryTerms(name,[])).toEqual([])
 expect(petDiscoveryTerms('Pets',['Ração'])).toContain('Comedouro para pets')
})
it('intercala categorias da lista preservando a ordem dentro de cada categoria',()=>{
 const products=[{title:'Ração para gato 1'},{title:'Ração para gato 2'},{title:'Comedouro para pets 1'},{title:'Comedouro para pets 2'},{title:'Areia Pipicat 12kg'},{title:'Brinquedo para gato'}]
 expect(interleavePetCategories(products).map(p=>p.title)).toEqual(['Ração para gato 1','Comedouro para pets 1','Areia Pipicat 12kg','Brinquedo para gato','Ração para gato 2','Comedouro para pets 2'])
 expect(interleavePetCategories([])).toEqual([])
})
