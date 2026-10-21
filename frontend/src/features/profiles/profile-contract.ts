import type {EventBlock} from '@/features/profile-events/event-contract'
import type { ContentReview } from '@/features/content-review/review-contract'
import type { ProfileAppearance } from './profile-appearance'
import type { ProfileSchedule } from './profile-schedule'
import type {PublicChannelGroup,ChannelGroupSummary} from '@/features/profile-channels/channel-contract'
export type ProfileLocale='pt-BR'|'en'|'es'
export type ProfileTranslations={primaryLocale:ProfileLocale;entries:Array<{locale:ProfileLocale;name?:string;bio?:string;categories:Record<string,string>;items:Record<string,string>}>}
export type ButtonTestConfig={blockId:string;labels:[string,string];samplePerVariant:number;durationDays:7|14|28}
export type ProfileContent = {
  buttonTest?:ButtonTestConfig|null
  translations?:ProfileTranslations
  appearance?: ProfileAppearance
  slug: string; name: string; bio: string; avatarAssetId: string | null; requiresAge: boolean; primaryItemId: string | null
  categories: Array<{ id: string; name: string; visible: boolean }>
  items: Array<{ id: string; categoryId: string; type: 'URL' | 'CATALOG' | 'SOCIAL'; label: string; destination: string; visible: boolean; event?:EventBlock; schedule?: ProfileSchedule | null; templateExample?: boolean }>
}
export type ProfileDraft = ProfileContent & { version: number }
export type ProfilePresentation=ProfileContent&{locale?:ProfileLocale;fallbackLocale?:ProfileLocale;availableLocales?:ProfileLocale[];translationFallbacks?:{name:boolean;bio:boolean;categories:string[];items:string[]};serverNow?:string;contactForm?:import('@/features/contact-forms/contact-contract').ContactFormDescriptor|null;channelGroups?:PublicChannelGroup[]}
export type ProfileRevision = { id: string; version: number; createdAt: string; current: boolean; imported: boolean; summary: { name: string; groups: number; links: number } }
export type ProfileRevisionDetail = { id: string; version: number; content: ProfileContent; photoAvailable: boolean;channelGroups?:ChannelGroupSummary[] }
export type ProfileState = { access?:{role:'EDITOR'|'VIEWER'}; scheduling?: { allowed: boolean; serverNow: string }; review?: ContentReview | null; draft: ProfileDraft | null; publishedVersion: number | null; publishedContent?: ProfileContent | null;channelGroups?:ChannelGroupSummary[];channelChanges?:boolean }
export type PublicProfile = { restricted: true } | (ProfilePresentation & { restricted: false; measurement?:import('@/features/profile-interaction/interaction-contract').MeasurementDescriptor; publishedRevisionId: number; serverNow?: string; nextBoundary?: string | null; previewAt?: string; previewBounds?: { before: string | null; after: string | null } })
export const emptyProfile = (): ProfileDraft => ({ slug: '', name: '', bio: '', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [], items: [], version: 0 })
