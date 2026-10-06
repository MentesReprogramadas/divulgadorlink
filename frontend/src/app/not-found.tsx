import type { Metadata } from 'next'
import { privateMetadata } from '@/domain/crawler-policy'

export const metadata: Metadata = privateMetadata

export default function NotFound() {
  return <main><h1>Não encontrado</h1></main>
}
