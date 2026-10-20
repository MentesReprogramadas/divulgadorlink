import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { OfficeBoard } from './office'

export default async function Page() {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN' && !(await cookies()).get('workspaceOwner')?.value) notFound()
  return <OfficeBoard />
}
