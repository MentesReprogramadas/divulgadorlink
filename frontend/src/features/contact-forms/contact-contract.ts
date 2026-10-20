export const contactFields={name:'Nome',email:'E-mail',phone:'Telefone',company:'Empresa',message:'Mensagem'} as const
export const contactTitles={contact:'Fale comigo',quote:'Peça um orçamento',waitlist:'Entre na lista de interesse'} as const
export type ContactDefinition={enabled:boolean;purpose:keyof typeof contactTitles;marketingAllowed:boolean;fields:Array<{key:keyof typeof contactFields;required:boolean}>}
export type ContactFormDescriptor={revisionId:string;definition:ContactDefinition}
export type ContactSettings={version:number;definition:ContactDefinition}
export type ContactSubmission={id:string;answers:Record<string,string>;marketingOptIn:boolean;createdAt:string;expiresAt:string}
export const defaultContact:ContactDefinition={enabled:false,purpose:'contact',marketingAllowed:false,fields:[{key:'name',required:false},{key:'email',required:true},{key:'message',required:false}]}
