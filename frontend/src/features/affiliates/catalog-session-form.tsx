'use client'

import { useRef, useState, type FormEvent } from 'react'
import { ActionIcon } from '@/components/ui/action-icon'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Stepper } from '@/components/ui/stepper'
import { affiliateRequest, type CatalogSession } from './contracts'
import styles from './affiliates.module.css'

export function CatalogSessionForm({ session, saved, pending }: { session?: CatalogSession; saved: () => Promise<void>; pending: (value: boolean) => void }) {
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [cookie, setCookie] = useState(''), [csrf, setCsrf] = useState('')
  const [accountLabel, setAccountLabel] = useState(session?.mode === 'OWN' ? session.accountLabel : '')
  const [tag, setTag] = useState(session?.mode === 'OWN' ? session.tag : ''), [profile, setProfile] = useState(session?.mode === 'OWN' ? session.profile : '')
  const lock = useRef(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 0) { setStep(1); return }
    if (lock.current) return
    lock.current = true; setBusy(true); pending(true); setError('')
    try { await affiliateRequest('/catalog/session', 'POST', { cookie, csrf, accountLabel, tag, profile }); setCookie(''); setCsrf(''); await saved() }
    catch (reason) { setCookie(''); setCsrf(''); setError(reason instanceof Error ? reason.message : 'Não foi possível salvar. Copie a sessão novamente e tente outra vez.') }
    finally { lock.current = false; setBusy(false); pending(false) }
  }
  return <form className={styles.form} onSubmit={event => void submit(event)}>
    <Stepper steps={['Identificar conta', 'Configurar sessão']} current={step} onBack={setStep} disabled={busy} />
    <p>Use sua própria conta autorizada no programa de afiliados. A conexão OAuth do catálogo não autoriza o gerador.</p>
    {step === 0 ? <><p>Abra o <a href="https://www.mercadolivre.com.br/afiliados/linkbuilder" target="_blank" rel="noopener noreferrer">gerador oficial do Mercado Livre (nova aba)</a> e gere um link de exemplo na sua conta. Use o endereço completo para identificar etiqueta e perfil. Essa identificação é feita uma vez; depois você poderá gerar novos links por produto aqui.</p><Field label="Nome da conta de afiliados" hint="Um nome para identificar a conta neste painel."><Input required maxLength={80} value={accountLabel} onChange={event => setAccountLabel(event.target.value)} autoComplete="off" /></Field><Field label="Etiqueta de afiliado (tag)" hint="No link completo gerado na sua conta, copie o valor de matt_word= até o próximo &. Ex.: matt_word=minha-tag, etiqueta minha-tag."><Input required maxLength={80} value={tag} onChange={event => setTag(event.target.value)} autoComplete="off" /></Field><Field label="Perfil de afiliado" hint="No mesmo link completo, copie o texto depois de /social/ e antes de ?. Ex.: /social/meuperfil?..., perfil meuperfil."><Input required maxLength={80} value={profile} onChange={event => setProfile(event.target.value)} autoComplete="off" /></Field></> : <>
      <p>Conta: <strong>{accountLabel}</strong> · etiqueta {tag} · perfil {profile}</p>
      <details><summary>Como obter Cookie e token CSRF na minha conta</summary><ol><li>Entre na sua conta de afiliados no Mercado Livre e abra o gerador oficial de links.</li><li>Abra as ferramentas do navegador, aba Rede (Network), e gere um link de um anúncio autorizado.</li><li>Na requisição <code>createLink</code>, abra os cabeçalhos da requisição. Copie o valor completo de <code>Cookie</code> e de <code>x-csrf-token</code> nos campos abaixo.</li></ol><p>Copie somente da sua conta. Esses valores dão acesso à sessão: não compartilhe capturas, não cole em conversas. A sessão pode expirar; nesse caso, configure novamente.</p></details>
      <Field label="Cookie da sessão"><Input type="password" required value={cookie} onChange={event => setCookie(event.target.value)} autoComplete="new-password" spellCheck={false} maxLength={24000} /></Field>
      <Field label="Token CSRF (x-csrf-token)"><Input type="password" required value={csrf} onChange={event => setCsrf(event.target.value)} autoComplete="new-password" spellCheck={false} maxLength={512} /></Field>
      <p>Os segredos ficam protegidos no servidor e não são exibidos novamente. Salvar configura a sessão; a validade e a atribuição serão conferidas ao gerar um link. Somente novos links usarão esta conta. Ofertas e histórico existentes permanecem.</p>
    </>}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    <Button type="submit" loading={busy}><ActionIcon name={step === 0 ? 'next' : 'save'} />{step === 0 ? 'Continuar para sessão' : 'Salvar sessão de afiliados'}</Button>
  </form>
}
