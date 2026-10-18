export type MeasurementDescriptor={profileId:string;revisionId:number;surfaceToken:string;issuedAt:string;expiresAt:string}
export type Viewport='MOBILE'|'TABLET'|'DESKTOP'
export type InteractionReport={range:{from:string;to:string};revision:number|null;viewport:Viewport|'ALL';revisions:number[];minimumSample:number;retentionDays:number;coverage:string;summary:{available:boolean;sessions:number;pageViews:number|null;blocks:Array<{id:string;label:string;impressions:number|null;clicks:number|null;ctr:number|null}>;scrollBuckets:Array<{threshold:number;label:string;reached:number|null}>}}
export type MeasurementPreference={enabled:boolean;version:number;allowed:boolean}
export function interactionViewport(width:number):Viewport{return width<768?'MOBILE':width<1024?'TABLET':'DESKTOP'}
export function scrollReach(scrollTop:number,viewportHeight:number,pageHeight:number){return Math.min(100,Math.floor(Math.max(0,scrollTop+viewportHeight)/Math.max(1,pageHeight)*100))}
