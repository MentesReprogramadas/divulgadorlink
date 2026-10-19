export type PublicChannel={id:string;label:string;network:{name:string;slug:string};href:string;showLabel?:boolean}
export type PublicChannelGroup={id:string;name:string;channels:PublicChannel[]}
export type ChannelGroupSummary={id:string;name:string;channels:Array<{id:string;label:string;showLabel?:boolean;status?:string;available?:boolean;networkName:string;paused:boolean;sourceRevisionId:string;sourceVersion:number|null}>}
export type ChannelNetworkOption={id:string;name:string;slug:string}
export type PrivateChannel={id:string;label:string;networkId:string|null;destinationRevisionId:string;paused:boolean;showLabel?:boolean;available:boolean;destinationLabel:string;destinationUrl?:string;handleId?:string;status?:string;network:{name:string;slug:string}|null}
export type ChannelGroupDraft={id:string;name:string;visible:boolean;channels:PrivateChannel[]}
export type ChannelGroupsResponse={profileVersion:number;publishedVersion:number|null;networks:ChannelNetworkOption[];groups:ChannelGroupDraft[]}
export type ChannelDestination={id:string;handleId:string;label:string;destinationUrl:string;requiresAge:boolean;networks:ChannelNetworkOption[]}
export type ChannelDestinationPage={items:ChannelDestination[];nextCursor:string|null}
export type ChannelScreenEntry={kind:'NEW'}|{kind:'EDIT';id:string}

export type ChannelSource=ChannelDestination&{status:string;available:boolean}
