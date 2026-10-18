export type ChecklistState='COMPLETE'|'PENDING'|'SUGGESTED'|'REQUESTED'|'IN_REVIEW'|'REJECTED'
export type ChecklistStep={id:'account'|'identity'|'links'|'publication'|'presentation'|'preview'|'share';required:boolean;state:ChecklistState;title:string;description:string;actionLabel:string;actionPath:string|null;actionKind:'NAVIGATE'|'PREVIEW'|'PUBLISH'|'COPY'}
export type ProfileChecklist={profileVersion:number;canPublish:boolean;requiresFinalValidation:true;reasons:string[];publicPath:string|null;progress:{completed:number;total:number};steps:ChecklistStep[]}
