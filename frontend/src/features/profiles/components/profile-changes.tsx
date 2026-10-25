'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { emptyProfile, type ProfileContent } from '../profile-contract'
import { normalizedProfile } from '../profile-diff'
import { profileAppearance, type ProfileAppearance } from '../profile-appearance'
import styles from './profile-changes.module.css'
import {LiquidLens} from '@/components/ui/liquid-lens'

const Context = createContext<ProfileContent | undefined>(undefined)
export function ProfileChanges({ published, children }: { published: ProfileContent | null; children: ReactNode }) {
  return <Context.Provider value={normalizedProfile(published ?? emptyProfile())}>{children}</Context.Provider>
}
export function useProfileChanges() {
  const baseline = useContext(Context)
  return {
    field: <K extends keyof ProfileContent>(key: K, value: ProfileContent[K]) => baseline !== undefined && JSON.stringify(value) !== JSON.stringify(baseline[key]),
    appearance: <K extends keyof ProfileAppearance>(key: K, value: ProfileAppearance[K]) => baseline !== undefined && value !== profileAppearance(baseline.appearance)[key],
    group: (id: string, content: ProfileContent) => {
      if (!baseline) return false
      const index = content.categories.findIndex(group => group.id === id), old = baseline.categories.findIndex(group => group.id === id)
      return index !== old || JSON.stringify(content.categories[index]) !== JSON.stringify(baseline.categories[old]) || JSON.stringify(content.items.filter(item => item.categoryId === id)) !== JSON.stringify(baseline.items.filter(item => item.categoryId === id))
    },
    item: (id: string, content: ProfileContent) => {
      if (!baseline) return false
      const item = content.items.find(item => item.id === id), previous = baseline.items.find(item => item.id === id)
      const siblings = content.items.filter(row => row.categoryId === item?.categoryId), old = baseline.items.filter(row => row.categoryId === item?.categoryId)
      return JSON.stringify(item) !== JSON.stringify(previous) || siblings.findIndex(row => row.id === id) !== old.findIndex(row => row.id === id)
    },
    baseline,
  }
}
export function ChangedField({ changed, children }: { changed: boolean; children: ReactNode }) {
  return <div className={styles.field} data-unpublished={changed || undefined} title={changed ? 'Alteração não publicada' : undefined}>{changed?<LiquidLens radius={12}/>:null}{children}</div>
}
