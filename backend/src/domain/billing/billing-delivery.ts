import { BASE_PROFILE_CAPABILITIES, type ProfileCapability } from './profile-plans'
/** Extend only after the corresponding feature has server authorization and passing acceptance tests. */
export const DELIVERED_PROFILE_CAPABILITIES: ReadonlySet<ProfileCapability> = new Set([...BASE_PROFILE_CAPABILITIES, 'profile.scheduling', 'profile.analytics', 'profile.subdomain', 'profile.richBlocks'])
