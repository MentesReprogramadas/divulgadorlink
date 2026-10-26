import {OpenAiSearchContext} from '../src/adapters/search/openai-search-context'
import {composeSearchForTest} from '../src/http/controllers/@Search/routes'

// Only synthetic E2E phrases replace the provider; the real adapter validates its HTTP contract.
export function composeSearchContextE2e(){
 if(process.env.E2E_SEARCH_EMBEDDING!=='1')return
 const fixtures:Record<string,{query:string;niches:string[];networks:string[];mode:'facet'|'semantic'}>={
  'quero garimpar precinhos para minha casa nos grupos do zap':{query:'ofertas para casa',niches:['oportunidades-casa'],networks:['whatsapp'],mode:'facet'},
  'busco entretenimento reservado para maiores no mensageiro azul':{query:'conteúdo adulto',niches:['adulto'],networks:['telegram'],mode:'facet'},
  'quero aprender funções puras no mensageiro azul':{query:'programação funcional',niches:['tecnologia-internet'],networks:['telegram'],mode:'semantic'},
 }
 const interpreter=new OpenAiSearchContext('e2e-search-context',async(_url,options)=>{
  const body=JSON.parse(String(options?.body))
  const input=JSON.parse(body.messages[1].content)
  const context=fixtures[input.query]
  if(!context)return new Response('',{status:503})
  return Response.json({choices:[{message:{content:JSON.stringify(context)}}]})
 })
 composeSearchForTest({interpret:input=>interpreter.interpret(input)})
}
