import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { PlanEditor } from './editor'

export default async function Page() {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN') notFound()
  return <><h2 className="panel-section-title">Planos de destaque</h2><p className="panel-section-description">Organize a apresentação dos planos e os preços por duração.</p><PlanEditor /></>
}
