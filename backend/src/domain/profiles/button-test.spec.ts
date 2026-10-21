import {expect,it} from 'vitest'
import {buttonTestInput,buttonTestResult,buttonVariant} from './button-test'
const config={blockId:'11111111-1111-4111-8111-111111111111',labels:['Conhecer','Ver projeto'] as [string,string],samplePerVariant:100,durationDays:14 as const}
it('F26-U01 atribuição é estável na mesma visita e duas variantes são possíveis',()=>{expect(buttonVariant('test','visit','secret')).toBe(buttonVariant('test','visit','secret'));expect(new Set(Array.from({length:100},(_,i)=>buttonVariant('test',String(i),'secret'))).size).toBe(2)})
it('F26-U02/U04 não escolhe por cliques brutos nem baixa amostra ou inspeção antecipada',()=>{
 expect(buttonTestResult(config,[{exposures:100,clicks:10},{exposures:100,clicks:12}],true).status).toBe('INCONCLUSIVE');expect(buttonTestResult(config,[{exposures:1000,clicks:60},{exposures:100,clicks:30}],true).winner).toBe(1);expect(buttonTestResult(config,[{exposures:100,clicks:2},{exposures:100,clicks:90}],false).winner).toBeNull();expect(buttonTestResult(config,[{exposures:1000000,clicks:500000},{exposures:1000000,clicks:510000}],true).winner).toBeNull();expect(buttonTestResult(config,[{exposures:0,clicks:0}],true).rates[0]).toBeNull();expect(buttonTestResult(config,[{exposures:100,clicks:2},{exposures:100,clicks:90}],true,true).winner).toBeNull()
})
it('F26-U03 configuração limita duração, amostra e variantes distintas',()=>{expect(()=>buttonTestInput.parse({...config,labels:['Igual','igual']})).toThrow();expect(()=>buttonTestInput.parse({...config,samplePerVariant:1})).toThrow()})
