/** Shared action inventory: editor and its loading composition keep the same labels/geometry. */
export const profileEditorActions=[
 {id:'import',label:'Importar links',icon:'importLinks',requiresDraft:true,variant:'secondary'},
 {id:'templates',label:'Modelos',icon:'templates',requiresDraft:true,variant:'secondary'},
 {id:'history',label:'Histórico',icon:'history',requiresDraft:false,variant:'secondary'},
 {id:'metrics',label:'Métricas',icon:'interaction',requiresDraft:true,variant:'secondary'},
 {id:'checklist',label:'Checklist',icon:'checklist',requiresDraft:false,variant:'secondary'},
 {id:'preview',label:'Ver prévia',icon:'preview',requiresDraft:true,variant:'primary'},
] as const
