import { emptyProfile, type ProfileContent } from './profile-contract'
import { profileAppearance } from './profile-appearance'

export function normalizedProfile(value: ProfileContent): ProfileContent {
  return {
    slug: value.slug.trim().toLowerCase(), name: value.name.trim(), bio: value.bio.trim(), avatarAssetId: value.avatarAssetId,
    requiresAge: value.requiresAge, primaryItemId: value.primaryItemId, appearance: profileAppearance(value.appearance),
    categories: value.categories.map(group => ({ id: group.id, name: group.name.trim(), visible: group.visible })),
    items: value.items.map(item => ({ id: item.id, categoryId: item.categoryId, type: item.type, label: item.label.trim(), destination: item.destination.trim(), visible: item.visible })),
  }
}
export const profileKey = (value: ProfileContent) => JSON.stringify(normalizedProfile(value))
export function profileCanSave(value: ProfileContent) {
  return !!value.name.trim() && /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/i.test(value.slug.trim())
}
export const hasUnpublishedProfile = (value: ProfileContent, published: ProfileContent | null) => profileKey(value) !== profileKey(published ?? emptyProfile())
