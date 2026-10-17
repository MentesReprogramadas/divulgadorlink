import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { SettingsEditor } from './editor'
import { FacetSummaries } from './facet-summaries'

export default async function Page() {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN') notFound()
  return (
    <>
      <h2 className="panel-section-title">Configurações</h2>
      <p className="panel-section-description">Gerencie as opções do site e os textos que orientam o catálogo.</p>
      <SettingsEditor />
      <FacetSummaries />
    </>
  )
}
