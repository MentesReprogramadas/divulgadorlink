import {z} from 'zod'
export const contactFields={name:{label:'Nome',max:120},email:{label:'E-mail',max:254},phone:{label:'Telefone',max:30},company:{label:'Empresa',max:160},message:{label:'Mensagem',max:2000}} as const
export const contactTitles={contact:'Fale comigo',quote:'Peça um orçamento',waitlist:'Entre na lista de interesse'} as const
export const contactDefinition=z.object({enabled:z.boolean(),purpose:z.enum(['contact','quote','waitlist']),marketingAllowed:z.boolean().default(false),fields:z.array(z.object({key:z.enum(['name','email','phone','company','message']),required:z.boolean()}).strict()).min(1).max(5)}).strict().superRefine((d,c)=>{if(new Set(d.fields.map(f=>f.key)).size!==d.fields.length)c.addIssue({code:'custom',message:'Não repita campos.'});if(!d.fields.some(f=>['email','phone'].includes(f.key)&&f.required))c.addIssue({code:'custom',message:'Peça ao menos e-mail ou telefone obrigatório.'})})
export type ContactDefinition=z.infer<typeof contactDefinition>
export const defaultContact:ContactDefinition={enabled:false,purpose:'contact',marketingAllowed:false,fields:[{key:'name',required:false},{key:'email',required:true},{key:'message',required:false}]}
export function parseAnswers(definition:ContactDefinition|unknown,answers:unknown){
 const d=contactDefinition.parse(definition),shape:Record<string,z.ZodType<string|undefined>>={}
 for(const f of d.fields){let value=z.string().trim().max(contactFields[f.key].max);if(f.required)value=value.min(1);let checked:z.ZodType<string|undefined>=value;if(f.key==='email')checked=value.refine(v=>!v||z.string().email().safeParse(v).success,'Confira o e-mail.');if(f.key==='phone')checked=value.refine(v=>!v||/^\+?[\d ()-]{8,30}$/.test(v),'Confira o telefone.');shape[f.key]=f.required?checked:checked.optional()}
 return z.object(shape).strict().parse(answers) as Record<string,string>
}
export function csvCell(value:string){const clean=value.replaceAll(String.fromCharCode(0),'');return '"'+(/^[\s]*[=+@-]|^[\t\r\n]/.test(clean)?"'":'')+clean.replaceAll('"','""')+'"'}
