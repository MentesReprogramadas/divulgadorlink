import { Button } from '@/components/ui/button'

export function HomeMore({ cursor, loading = false, onLoad }: { cursor: string | null; loading?: boolean; onLoad: () => void }) {
  if (!cursor) return null
  return <Button type="button" variant="secondary" loading={loading} onClick={onLoad} aria-controls="home-catalog-results">{loading ? 'Carregando links…' : 'Mostrar mais'}</Button>
}
