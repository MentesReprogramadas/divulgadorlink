export type ProfileEditorSection='overview'|'groups'|'identity'|'appearance'
export function profileEditorSection(value:string|string[]|undefined):ProfileEditorSection|undefined{
 switch(value){case 'visao-geral':return 'overview';case 'pagina':return 'identity';case 'links':return 'groups';case 'aparencia':return 'appearance';default:return undefined}
}

export const profileEditorSections: Array<{id:ProfileEditorSection;label:string;compactLabel?:string}> = [
 {id:'overview',label:'Visão geral'}, {id:'groups',label:'Grupos e links',compactLabel:'Links'}, {id:'identity',label:'Página'}, {id:'appearance',label:'Aparência'},
]
