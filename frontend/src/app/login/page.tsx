import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/forms/login-form'
import { isSignedIn } from '@/domain/account-nav'

export default async function Page() {
  const role = (await cookies()).get('catalogo_role')?.value
  if (isSignedIn(role)) redirect('/painel')
  return <main className="auth-page"><h1 className="entry-title">Entrar</h1><p className="auth-lead">Use o e-mail e a senha da sua conta.</p><LoginForm /><p className="auth-switch"><a href="/esqueci-senha">Esqueci a senha</a></p><p className="auth-switch">Ainda não tem conta? <a href="/cadastro">Criar conta</a></p></main>
}
