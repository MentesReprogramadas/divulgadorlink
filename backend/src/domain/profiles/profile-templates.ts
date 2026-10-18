import { z } from 'zod'
import { appearanceInput, type ProfileAppearance } from './appearance'
import { ProfileError } from './profile'

const templateGroupInput = z.object({
  key: z.string().regex(/^[a-z-]{1,40}$/),
  name: z.string().min(1).max(80),
  links: z.array(z.object({
    key: z.string().regex(/^[a-z-]{1,40}$/),
    label: z.string().min(1).max(100),
    destination: z.string().url().regex(/^https:\/\/example\.com\/modelos\/[a-z/-]+$/),
  }).strict()).max(10),
}).strict()
export const profileTemplateInput = z.object({
  versionId: z.string().regex(/^[a-z-]+-v[1-9][0-9]*$/),
  activity: z.enum(['COMMUNITY','CREATOR','SHOP','PROFESSIONAL','EVENT']),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(160),
  appearance: appearanceInput,
  demoName: z.string().min(1).max(80),
  demoBio: z.string().max(500),
  groups: z.array(templateGroupInput).min(1).max(10),
}).strict()
export type ProfileTemplate = z.infer<typeof profileTemplateInput>
const appearance = (patch: Partial<ProfileAppearance>): ProfileAppearance => ({ background:'#f5f0e8',buttonColor:'#252b27',backgroundStyle:'solid',buttonStyle:'filled',radius:'rounded',font:'modern',alignment:'center',...patch })
const example = (activity: string, key: string, label: string) => ({ key, label, destination:'https://example.com/modelos/'+activity+'/'+key })
// These are configuration records, never alternate renderers or publication-ready identities.
const catalog=profileTemplateInput.array().parse([
  {
    versionId:'community-v1',activity:'COMMUNITY',title:'Comunidades e grupos',description:'Entrada, regras e contato organizados para sua comunidade.',
    appearance:appearance({background:'#173c32',buttonColor:'#d9efb6',radius:'pill'}),demoName:'Sua comunidade',demoBio:'Um lugar para reunir pessoas e compartilhar novidades.',
    groups:[{key:'community',name:'Comunidade',links:[example('comunidades','entrar','Entrar no grupo'),example('comunidades','regras','Regras da comunidade')]},{key:'contact',name:'Contato',links:[example('comunidades','contato','Fale com a equipe')]}],
  },
  {
    versionId:'creator-v1',activity:'CREATOR',title:'Criadores',description:'Conteúdos, projetos e redes para quem acompanha seu trabalho.',
    appearance:appearance({background:'#ece5ff',buttonColor:'#523b85',buttonStyle:'shadow'}),demoName:'Seu conteúdo',demoBio:'Compartilhe suas ideias e seus próximos projetos.',
    groups:[{key:'content',name:'Conteúdos',links:[example('criadores','novidades','Últimos conteúdos'),example('criadores','projetos','Meus projetos')]},{key:'contact',name:'Contato',links:[example('criadores','parcerias','Parcerias e contato')]}],
  },
  {
    versionId:'shop-v1',activity:'SHOP',title:'Lojas',description:'Catálogo, pedidos e atendimento em um endereço fácil de compartilhar.',
    appearance:appearance({background:'#ffddc8',buttonColor:'#803a35',buttonStyle:'shadow',font:'clean'}),demoName:'Sua loja',demoBio:'Encontre produtos e as formas de falar com nossa loja.',
    groups:[{key:'shop',name:'Comprar',links:[example('lojas','catalogo','Ver catálogo'),example('lojas','pedidos','Fazer um pedido')]},{key:'contact',name:'Atendimento',links:[example('lojas','contato','Falar com a loja')]}],
  },
  {
    versionId:'professional-v1',activity:'PROFESSIONAL',title:'Profissionais',description:'Apresente seu trabalho e facilite o primeiro contato.',
    appearance:appearance({background:'#f8f5ee',buttonColor:'#332b26',font:'classic',radius:'square',buttonStyle:'outline',alignment:'left'}),demoName:'Seu trabalho',demoBio:'Conheça meus serviços e as formas de entrar em contato.',
    groups:[{key:'work',name:'Meu trabalho',links:[example('profissionais','servicos','Conheça meus serviços'),example('profissionais','portfolio','Ver portfólio')]},{key:'contact',name:'Contato',links:[example('profissionais','conversa','Agendar uma conversa')]}],
  },
  {
    versionId:'event-v1',activity:'EVENT',title:'Eventos',description:'Inscrições, programação e informações de acesso.',
    appearance:appearance({background:'#123b63',buttonColor:'#d5edff',backgroundStyle:'gradient',radius:'pill'}),demoName:'Seu evento',demoBio:'Confira a programação e saiba como participar.',
    groups:[{key:'event',name:'Participe',links:[example('eventos','inscricao','Fazer inscrição'),example('eventos','programacao','Ver programação')]},{key:'info',name:'Informações',links:[example('eventos','acesso','Como chegar')]}],
  },
])
export function listProfileTemplates(): ProfileTemplate[] { return structuredClone(catalog) }
export function profileTemplate(versionId: string): ProfileTemplate {
  const template=catalog.find(row=>row.versionId===versionId)
  if(!template)throw new ProfileError(404,'Modelo não encontrado. Escolha uma versão disponível.')
  return structuredClone(template)
}
