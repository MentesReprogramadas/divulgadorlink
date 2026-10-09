export function HomeMore({ cursor }: { cursor: string | null }) {
  if (!cursor) return null
  return <a href={`/?cursor=${encodeURIComponent(cursor)}`}>Mostrar mais</a>
}
