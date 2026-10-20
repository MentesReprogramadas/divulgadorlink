export type PoolDestination={revisionId:string;weight:number;paused:boolean;label:string;eligible:boolean;destinationUrl:string}
export type DestinationPool={version:number;enabled:boolean;destinations:PoolDestination[];eligibleCount:number;metrics:Array<{revisionId:string;clicks:number}>;stablePath:string}
export type PoolDraft=Array<{revisionId:string;weight:number;paused:boolean}>
