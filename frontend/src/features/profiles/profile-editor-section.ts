export type ProfileEditorSection='groups'|'identity'|'appearance'
export function profileEditorSection(value:string|string[]|undefined):ProfileEditorSection|undefined{
 switch(value){case 'pagina':return 'identity';case 'links':return 'groups';case 'aparencia':return 'appearance';default:return undefined}
}
