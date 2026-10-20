export type SavedFavorite = { id: string; linkId: string; collectionIds?: string[]; position?: number } & (
  { available: false } | { available: true; name: string; description: string; href: string; niche?: { name: string; slug: string }; network?: { name: string; slug: string } }
)
export type Collection = { id: string; name: string; version: number; visibility?:string; slug?:string|null; publication?:{title:string;description:string;curator:string;requiresAge:boolean}|null; publishedRevision?:number|null }
export type FavoritePage = { items: SavedFavorite[]; nextCursor: string | null }
export type CollectionPage = { items: Collection[]; nextCursor: string | null }
export type CollectionDetail = FavoritePage & { collection: Collection }
