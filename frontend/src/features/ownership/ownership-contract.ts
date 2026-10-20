export type OwnershipVerification={status:'VERIFIED';scope:string;method:'HTTPS_FILE';domain:string;destinationUrl:string;verifiedAt:string;expiresAt:string}
export type OwnershipState={supported:boolean;fileUrl:string|null;revisionId:string|null;verification:OwnershipVerification|null}
export type OwnershipChallenge={id:string;fileUrl:string;content:string;expiresAt:string}
