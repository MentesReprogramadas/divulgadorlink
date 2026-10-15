import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { OfficeBoard } from './office'

export default async function Page() {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN') notFound()
  return <><h2 className="panel-section-title">Visão da operação</h2><p className="panel-section-description">Acompanhe o catálogo, o tráfego e os resultados por área.</p><OfficeBoard /></>
}
