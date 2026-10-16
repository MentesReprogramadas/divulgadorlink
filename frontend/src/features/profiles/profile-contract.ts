export type ProfileContent = {
  slug: string; name: string; bio: string; avatarAssetId: string | null; requiresAge: boolean; primaryItemId: string | null
  categories: Array<{ id: string; name: string; visible: boolean }>
  items: Array<{ id: string; categoryId: string; type: 'URL' | 'CATALOG' | 'SOCIAL'; label: string; destination: string; visible: boolean }>
}
export type ProfileDraft = ProfileContent & { version: number }
export type ProfileState = { draft: ProfileDraft | null; publishedVersion: number | null }
export type PublicProfile = { restricted: true } | (ProfileContent & { restricted: false; publishedRevisionId: number })
export const emptyProfile = (): ProfileDraft => ({ slug: '', name: '', bio: '', avatarAssetId: null, requiresAge: false, primaryItemId: null, categories: [], items: [], version: 0 })
