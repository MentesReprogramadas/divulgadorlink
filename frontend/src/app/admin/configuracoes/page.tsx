import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { SettingsEditor } from './editor'

export default async function Page() {
  const role = (await cookies()).get('catalogo_role')?.value
  if (role !== 'ADMIN') notFound()
  return <SettingsEditor />
}
