export type OwnershipVerification={status:'VERIFIED';scope:string;method:'DNS_TXT';domain:string;destinationUrl:string;verifiedAt:string;expiresAt:string}
export type OwnershipState={supported:boolean;recordName:string|null;revisionId:string|null;verification:OwnershipVerification|null}
export type OwnershipChallenge={id:string;recordName:string;content:string;expiresAt:string}
