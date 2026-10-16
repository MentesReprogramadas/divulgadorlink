"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { AdminNav } from "@/components/domain/admin-nav";
import { panelGate } from "@/domain/panel-gate";
import { clearSession, readSession, SESSION_EVENT, type Session } from "@/domain/session";
import { api, currentSession } from "@/lib/api";

const AreaSession = createContext<Session | null>(null);

export function useAreaSession(): Session | null {
  return useContext(AreaSession);
}

export function PanelNav({ role }: { role: string }) {
  const path = usePathname();
  const items = [
    { id: "geral", href: "/painel", label: "Visão geral" },
    { id: "links", href: "/painel/links", label: "Links" },
    { id: "pedidos", href: "/painel/pedidos", label: "Pedidos" },
    { id: "lembretes", href: "/painel/lembretes", label: "Lembretes" },
    { id: "conta", href: "/painel/conta", label: "Conta" },
    ...(role === "ADMIN" ? [{ id: "admin", href: "/admin/visao", label: "Admin" }] : []),
  ];
  function current(href: string): boolean {
    if (href === "/painel") return path === "/painel";
    return path === href || path.startsWith(`${href}/`);
  }
  return (
    <nav className="panel-nav" aria-label="Áreas do painel">
      {items.map((item) => (
        <Link key={item.id} href={item.href} aria-current={current(item.href) ? "page" : undefined}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
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
  async function logout() {
    await api("/v1/auth/logout", { method: "POST" });
    clearSession();
    window.location.href = "/painel";
  }
  return (
    <main className="auth-page">
      <h1 className="entry-title">Conta suspensa</h1>
      <p className="auth-lead">Você não pode enviar links, comprar destaque nem alterar a conta.</p>
      {reason ? (
        <>
          <h2>Motivo</h2>
          <p>{reason}</p>
        </>
      ) : null}
      <p className="auth-switch">
        <button type="button" className="quiet-button" onClick={() => void logout()}>Sair</button>
      </p>
    </main>
  );
}

function VerifyRedirect() {
  useLayoutEffect(() => {
    window.location.replace("/painel/verificar");
  }, []);
  return (
    <main className="auth-page">
      <p role="status">Carregando</p>
    </main>
  );
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
  const gate = panelGate(session, path);
  if (!ready) {
    if (path === "/painel/verificar") {
      return (
        <main className="auth-page">
          <p role="status">Carregando</p>
        </main>
      );
    }
    return (
      <main className="panel-page">
        <div className="panel-bar">
          <h1 className="entry-title">{title}</h1>
        </div>
        <div className="panel-nav" />
        <div className="panel-stage">
          <p role="status" aria-label="Carregando">Carregando</p>
        </div>
      </main>
    );
  }
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
  if (!session || (admin && session.role !== "ADMIN")) {
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
  return (
    <AreaSession.Provider value={session}>
      <main className="panel-page">
        <PanelTop session={session} title={title} create={create} />
        {admin ? <AdminNav /> : <PanelNav role={session.role} />}
        <div className="panel-stage">{children}</div>
      </main>
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
    return (
      <main className="panel-page">
        <p role="status" aria-label="Carregando">
          Carregando
        </p>
      </main>
    );
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
  title = "Painel",
  create = true,
}: {
  session: Session;
  title?: string;
  create?: boolean;
}) {
  async function logout() {
    await api("/v1/auth/logout", { method: "POST" });
    clearSession();
    window.location.href = "/painel";
  }
  return (
    <>
      <div className="panel-bar">
        <h1 className="entry-title">{title}</h1>
        <div className="page-header-actions">
          {create ? (
            <ButtonLink href="/painel/links/novo">Novo link</ButtonLink>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void logout()}
          >
            Sair
          </Button>
        </div>
      </div>
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
