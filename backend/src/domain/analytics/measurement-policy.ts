/** Shared privacy/automation exclusions; each feature still owns its consent purpose. */
export function measurementTrafficAllowed(input:{userAgent?:string;testTraffic?:string;dnt?:string;gpc?:string}){
 return input.testTraffic!=='1'&&input.dnt!=='1'&&input.gpc!=='1'&&!/bot|crawler|spider|headless|playwright|curl|wget|python|postman|facebookexternalhit|meta-externalagent|meta-externalfetcher/i.test(input.userAgent??'')&&!/^WhatsApp[ /]/i.test(input.userAgent??'')
}
