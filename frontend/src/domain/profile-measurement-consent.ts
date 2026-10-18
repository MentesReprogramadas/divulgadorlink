export const PROFILE_MEASUREMENT_CHANGED='tla-profile-measurement-changed'
export function profileMeasurementConsent(){return typeof document!=='undefined'&&document.cookie.split('; ').some(row=>row==='tla_profile_measure=v1_yes')}
export function writeProfileMeasurementConsent(enabled:boolean){
 const secure=location.protocol==='https:'?'; Secure':''
 document.cookie=`tla_profile_measure=${enabled?'v1_yes':'v1_no'}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
 window.dispatchEvent(new Event(PROFILE_MEASUREMENT_CHANGED))
}
