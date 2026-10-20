import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { SettingsEditor } from './editor'
import { FacetSummaries } from './facet-summaries'
import { WorkspaceSection } from '@/components/layout/workspace-section'

export default async function Page() {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN' && !(await cookies()).get('workspaceOwner')?.value) notFound()
  return (
    <>
      <WorkspaceSection title="Exibição do catálogo"><SettingsEditor /></WorkspaceSection>
      <FacetSummaries />
    </>
  )
}
