import { Glyph } from '@/components/ui/facet-badge'
import { markFor } from '@/domain/marks'

export const waveFacetPaths: Readonly<Record<string, string>> = {
  Todos: 'M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M11.5 4.5 9.2 9.2 4.5 11.5 6.8 6.8Z',
  'Viagens e aventura': 'M1 13 5.5 3l3 6L11 5l4 8ZM4 6.5l1.5 1L7 6.5',
  Tecnologia: markFor('niche', 'tecnologia-internet')!.icon,
  Música: markFor('niche', 'musicas')!.icon,
  Jogos: markFor('niche', 'jogos')!.icon,
  Gastronomia: 'M3 1v5m2-5v5M2 4h4M4 6v9M12 1c-2 2-2 6 0 7h1V1ZM13 8v7',
  Fotografia: 'M1.5 5h3l1-2h5l1 2h3v8h-13ZM10.5 9a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0M12 7h.1',
  'Educação e leitura': markFor('niche', 'educacao-cursos')!.icon,
  Comunidade: 'M1 2h9v6H5l-3 2V8H1ZM6 10h5l3 3v-3h1V5h-3',
  Canal: 'M8 6v9M5 15h6M8 3h.01M5.5 5a3.5 3.5 0 0 1 0 5M10.5 5a3.5 3.5 0 0 0 0 5M3 2.5a7 7 0 0 0 0 10M13 2.5a7 7 0 0 1 0 10',
  Conteúdo: 'M2 3h10v11H2ZM12 6h3v8h-3M4 5h6M4 8h2v3H4ZM8 8h2M8 11h2',
}

export function WaveFacetIcon({ value, size = 16 }: { value: string; size?: number }) {
  const path = waveFacetPaths[value]
  return path ? <Glyph d={path} size={size} /> : null
}
