"use client";
import {MediaKitPreview} from '@/features/media-kit/media-kit-preview'
import {CampaignPreview} from '@/features/profile-campaigns/campaign-preview'

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { ButtonLink } from "@/components/ui/button";
import { ActionIcon } from "@/components/ui/action-icon";
import { WorkspaceActions } from "@/components/layout/workspace-controls";
import { WorkspaceNavigation } from "./workspace-navigation";
import styles from "./workspace.module.css";
import { workspaceHeading } from "./workspace-heading";
import { WorkspacePending } from "./workspace-pending";
import { ProfilePreviewSkeleton } from '@/features/profiles/components/profile-preview-skeleton';
import { VerificationPageSkeleton } from "./verification-skeleton";
import { panelGate } from "@/domain/panel-gate";
import { readSession, SESSION_EVENT, type Session } from "@/domain/session";
import { currentSession } from "@/lib/api";
import {useWorkspaceAccess,workspaceVisible,workspaceSection,WorkspaceBanner,selectWorkspace,hasWorkspaceAdmin,WorkspaceIdentity} from '@/features/workspace-team/workspace-access';
import {Button} from '@/components/ui/button';
import {InteractionPolicy} from '@/components/ui/interaction-policy';
import {WorkspaceHome} from '@/features/workspace-team/workspace-home';
import {BillingAccessProvider} from '@/features/profile-billing/billing-access';
import {LiquidLens} from '@/components/ui/liquid-lens';

const AreaSession = createContext<Session | null>(null);

export function useAreaSession(): Session | null {
  return useContext(AreaSession);
}

export function PanelNav({ role }: { role: string }) {
  return <WorkspaceNavigation area="panel" role={role} />;
}

export function usePanelSession() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  useLayoutEffect(() => {
    const cached = readSession();
    if (!cached) return;
    setSession(cached);
    setReady(true);
  }, []);
  useEffect(() => {
    let cancelled = false;
    void currentSession().then((current) => {
      if (cancelled) return;
      setSession(current);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    function apply() {
      const cached = readSession();
      if (cached) setSession(cached);
    }
    window.addEventListener(SESSION_EVENT, apply);
    return () => window.removeEventListener(SESSION_EVENT, apply);
  }, []);
  return { ready, session };
}

export function SuspendedAccount({ reason }: { reason?: string }) {
  return (
    <main className="auth-page">
      <h1 className="entry-title">Conta suspensa</h1>
      <section className={styles.suspension} aria-label="Situação da conta"><LiquidLens radius={20}/><p className="auth-lead">Você não pode enviar links, comprar destaque nem alterar a conta.</p>{reason ? (
        <>
          <h2>Motivo</h2>
          <p>{reason}</p>
        </>
      ) : null}</section>
    </main>
  );
}

function VerifyRedirect() {
  useLayoutEffect(() => {
    window.location.replace("/painel/verificar");
  }, []);
  return <VerificationPageSkeleton />;
}

export function AreaFrame({
  title,
  create = false,
  admin = false,
  children,
}: {
  title: string;
  create?: boolean;
  admin?: boolean;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const { ready, session } = usePanelSession();
  const access=useWorkspaceAccess(ready&&session?.status==='ACTIVE'&&session.canSubmit);
  const gate = panelGate(session, path);
  const mediaPreview=path==='/painel/perfil/midia-kit/previa';
  if(!ready&&mediaPreview)return <MediaKitPreview pendingOnly/>;
  const sharedPreview=/^\/painel\/equipe\/[^/]+\/previa$/.test(path);
  if(!ready&&sharedPreview)return <ProfilePreviewSkeleton/>;
  const campaignPreview=/^\/painel\/perfil\/campanhas\/[^/]+\/previa$/.test(path);
  if(!ready&&campaignPreview)return <CampaignPreview id={path.split('/')[4]} pendingOnly/>;
  if (!ready && path === "/painel/perfil/previa") return <ProfilePreviewSkeleton />;
  if (!ready) return path === "/painel/verificar" ? <VerificationPageSkeleton /> : <WorkspacePending path={path} title={title} admin={admin} create={create} />;
  if (gate === "redirect-verify") {
    return <VerifyRedirect />;
  }
  if (gate === "verify" && session) {
    return <AreaSession.Provider value={session}>{children}</AreaSession.Provider>;
  }
  if (session?.status === "BANNED") {
    return (
      <AreaSession.Provider value={session}>
        <SuspendedAccount reason={session.banReason} />
      </AreaSession.Provider>
    );
  }
  if (!session || (admin && session.role !== "ADMIN" && access.ready && !hasWorkspaceAdmin(access.context))) {
    if (admin) return <main className="panel-page"><p>Área restrita.</p></main>;
    return (
      <main className="auth-page">
        <h1 className="entry-title">Entrar</h1>
        <p className="auth-lead">Use o e-mail e a senha da sua conta.</p>
        <LoginForm returnTo={path} />
        <p className="auth-switch">Ainda não tem conta? <a href="/cadastro">Criar conta</a></p>
      </main>
    );
  }
  if(!access.ready){if(access.error)return <main className="panel-page"><p role="alert">{access.error}</p><Button onClick={()=>void selectWorkspace(null)}>Voltar ao meu espaço</Button></main>;if(sharedPreview||path==='/painel/perfil/previa')return <ProfilePreviewSkeleton/>;return <WorkspacePending path={path} title={title} admin={admin} create={create}/>}
  const home=Boolean(access.context?.ownerId&&(path==='/painel'||path==='/painel/visao'));
  const readonly=Boolean(access.context?.ownerId&&!home&&!access.context.grants?.[workspaceSection(path)]?.write);
  if(readonly&&(/\/(?:novo|editar|destaque|contestar|importar|aparencia|dados)$/.test(path)||path==='/painel/perfil/links'))return <main className="panel-page"><h1>Acesso somente de leitura</h1><WorkspaceBanner context={access.context!}/></main>;
  if(!workspaceVisible(access.context,path))return <main className="panel-page"><h1>Sem acesso a esta seção</h1><WorkspaceBanner context={access.context!}/></main>;
  if (path === "/painel/perfil/previa"||campaignPreview||sharedPreview||mediaPreview) return <AreaSession.Provider value={session}>{children}</AreaSession.Provider>;
  return (
    <AreaSession.Provider value={session}>
      <BillingAccessProvider enabled={!admin} canReadBilling={!access.context?.ownerId||access.context.grants?.billing?.read===true} ownerId={access.context?.ownerId??null}>
      <main className={styles.shell}>
        <aside className={styles.sidebar}>
          <LiquidLens radius={20}/>
          <div className={styles.desktopMenu}><WorkspaceNavigation area={admin ? "admin" : "panel"} role={session.role} /></div>
        </aside>
        <div className={styles.content}>
          <PanelTop session={session} title={title} create={create&&!home} />
          <div className={styles.stage}><WorkspaceIdentity.Provider value={access.context}>{access.context?.ownerId?<WorkspaceBanner context={access.context}/>:null}{home?<WorkspaceHome context={access.context!}/>:readonly?<><p role="status">Somente leitura neste espaço.</p><InteractionPolicy readOnly>{children}</InteractionPolicy></>:children}</WorkspaceIdentity.Provider></div>
        </div>
      </main>
      </BillingAccessProvider>
    </AreaSession.Provider>
  );
}

export function PanelGate({
  children,
}: {
  children: (session: Session) => React.ReactNode;
}) {
  const { ready, session } = usePanelSession();
  if (!ready)
    return <WorkspacePending path="/painel" />;
  if (!session)
    return (
      <main className="auth-page">
        <h1 className="entry-title">Entrar</h1>
        <p className="auth-lead">Use o e-mail e a senha da sua conta.</p>
        <LoginForm />
        <p className="auth-switch">
          Ainda não tem conta? <a href="/cadastro">Criar conta</a>
        </p>
      </main>
    );
  return <>{children(session)}</>;
}

export function PanelTop({
  create = true,
}: {
  session: Session;
  title?: string;
  create?: boolean;
}) {
  const path = usePathname();
  const current = workspaceHeading(path);
  return (
    <>
      <header className={styles.top}>
        <div><h1>{current.title}</h1></div>
      </header>
      {create && (path === "/painel" || path === "/painel/visao") ? <WorkspaceActions><ButtonLink href="/painel/links/novo"><ActionIcon name="createLink" />Novo link</ButtonLink><ButtonLink variant="secondary" href="/painel/links"><ActionIcon name="link" />Gerenciar links</ButtonLink></WorkspaceActions> : null}
    </>
  );
}


export function AdminHeading({ title }: { title: string }) {
  const { session } = usePanelSession();
  if (!session) {
    return (
      <div className="panel-bar">
        <h1 className="entry-title">{title}</h1>
      </div>
    );
  }
  return <PanelTop session={session} title={title} create={false} />;
}
