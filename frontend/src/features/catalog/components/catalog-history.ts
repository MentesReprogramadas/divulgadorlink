type CatalogHistory = { path: string; pages: number; scrollY: number }

export function readCatalogHistory(path: string): CatalogHistory | null {
  try {
    const value: unknown = window.history.state?.tlaCatalog
    if (!value || typeof value !== 'object') return null
    const saved = value as Record<string, unknown>
    if (saved.path !== path || typeof saved.pages !== 'number' || !Number.isInteger(saved.pages) || saved.pages < 1 || saved.pages > 50 || typeof saved.scrollY !== 'number' || !Number.isFinite(saved.scrollY) || saved.scrollY < 0) return null
    return { path, pages: saved.pages, scrollY: saved.scrollY }
  } catch { return null }
}

export function saveCatalogHistory(path: string, pages: number, scrollY: number) {
  try {
    if (window.location.pathname + window.location.search !== path) return
    // shortcut: replay at most 50 pages, use server navigation if the catalogue needs deeper history.
    if (pages > 50) return
    window.history.replaceState({ ...window.history.state, tlaCatalog: { path, pages, scrollY } }, '')
  } catch { /* History is optional; failed persistence must not block browsing. */ }
}
