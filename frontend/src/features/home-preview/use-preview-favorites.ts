'use client'
import { useCallback, useSyncExternalStore } from 'react'
import { previewLinks } from './preview-data'

const key = 'temlink-home-preview-favorites'
const eventName = 'temlink-home-preview-favorites-change'
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback); window.addEventListener(eventName, callback)
  return () => { window.removeEventListener('storage', callback); window.removeEventListener(eventName, callback) }
}
function snapshot() { try { return localStorage.getItem(key) ?? '[]' } catch { return '[]' } }
export function parsePreviewFavorites(value: string): string[] {
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? [...new Set(parsed.filter((slug): slug is string => typeof slug === 'string' && previewLinks.some(link => link.slug === slug)))] : [] } catch { return [] }
}
export function usePreviewFavorites() {
  const stored = useSyncExternalStore(subscribe, snapshot, () => '[]')
  const favorites = parsePreviewFavorites(stored)
  const toggle = useCallback((slug: string) => {
    const current = parsePreviewFavorites(snapshot())
    try { localStorage.setItem(key, JSON.stringify(current.includes(slug) ? current.filter(value => value !== slug) : [...current, slug])); window.dispatchEvent(new Event(eventName)); return true } catch { return false }
  }, [])
  return { favorites, toggle }
}
