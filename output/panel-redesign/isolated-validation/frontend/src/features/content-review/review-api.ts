import { api } from '@/lib/api'
import type { ContentReview } from './review-contract'
export async function sendContentAppeal(id: string, text: string): Promise<ContentReview> {
  const response = await api<{ review: ContentReview; message?: string }>('/v1/me/content-reviews/' + encodeURIComponent(id) + '/appeal', { method: 'POST', body: JSON.stringify({ text }) })
  if (response.status !== 200) throw new Error(response.body.message ?? 'Não foi possível enviar a contestação.')
  return response.body.review
}
