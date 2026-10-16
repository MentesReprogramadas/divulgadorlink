import type { LinkContext } from '@/components/domain/link-meta'
export type RelatedItem = { id: string; name: string; description: string; sponsored: boolean; surfaceToken: string; impressions?: number } & LinkContext
export type RelatedPage = { items: RelatedItem[]; nextCursor: string | null; showImpressions: boolean }
