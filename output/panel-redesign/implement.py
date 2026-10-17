from pathlib import Path
r=Path(__file__).resolve().parents[2]
p=r/'frontend/src/features/account/components/area-frame.tsx'
s=p.read_text(encoding='utf-8').replace('import Link from "next/link";\n','').replace('import { AdminNav } from "@/components/domain/admin-nav";','import { WorkspaceNavigation } from "./workspace-navigation";\nimport styles from "./workspace.module.css";')
a=s.index('export function PanelNav(');b=s.index('export function usePanelSession()',a)
s=s[:a]+'''export function PanelNav({ role }: { role: string }) {
  return <WorkspaceNavigation area="panel" role={role} />;
}

'''+s[b:]
s=s.replace('''<main className="panel-page">
        <PanelTop session={session} title={title} create={create} />
        {admin ? <AdminNav /> : <PanelNav role={session.role} />}
        <div className="panel-stage">{children}</div>
      </main>''','''<main className={styles.shell}>
        <aside className={styles.sidebar}>
          <p className={styles.sidebarTitle}>{admin ? "Administração" : "Meu espaço"}<small>Tem Link Aqui</small></p>
          <div className={styles.desktopMenu}><WorkspaceNavigation area={admin ? "admin" : "panel"} role={session.role} /></div>
          <details className={styles.mobileMenu} key={path}><summary>{admin ? "Menu da administração" : "Menu do painel"}</summary><WorkspaceNavigation area={admin ? "admin" : "panel"} role={session.role} /></details>
        </aside>
        <div className={styles.content}>
          <PanelTop session={session} title={title} create={create} />
          <div className={styles.stage}>{children}</div>
        </div>
      </main>''')
s=s.replace('''  return (
    <>
      <div className="panel-bar">
        <h1 className="entry-title">{title}</h1>''','''  const path = usePathname();
  const current = workspaceHeading(path);
  return (
    <>
      <header className={styles.top}>
        <div><p className={styles.eyebrow}>{title}</p><h1>{current.title}</h1><p className={styles.pageHint}>{current.hint}</p></div>''')
s=s.replace('''      </div>
    </>
  );
}

export function AdminHeading''','''      </header>
    </>
  );
}

function workspaceHeading(path: string): { title: string; hint: string } {
  const titles: Record<string, [string, string]> = {
    "/painel": ["Painel", "Tudo o que você precisa para cuidar dos seus links."],
    "/painel/links": ["Meus links", "Encontre um link e escolha o próximo passo."],
    "/painel/pedidos": ["Meus pedidos", "Pagamentos e destaques, em um só lugar."],
    "/painel/perfil": ["Meu perfil", "Organize sua página e publique quando estiver pronta."],
    "/painel/convites": ["Convites permanentes", "Um endereço fixo. O destino você atualiza."],
    "/painel/favoritos": ["Favoritos", "Seus links salvos, organizados por você."],
    "/painel/lembretes": ["Lembretes", "Escolha quais avisos quer receber."],
    "/painel/conta": ["Minha conta", "Seus dados, acesso e preferências."],
    "/admin/visao": ["Admin", "Uma visão clara da operação e dos próximos passos."],
    "/admin/moderacao": ["Moderação", "Confira cada envio antes de decidir."],
    "/admin/denuncias": ["Denúncias", "Analise os relatos e acompanhe as decisões."],
    "/admin/disponibilidade": ["Correções de links", "Confira os convites corrigidos pelos responsáveis."],
    "/admin/planos": ["Planos de destaque", "Organize as ofertas disponíveis no checkout."],
    "/admin/estornos": ["Estornos", "Acompanhe as devoluções e tentativas pendentes."],
    "/admin/integracoes": ["Integrações", "Conexões e avisos da operação."],
    "/admin/configuracoes": ["Configurações", "Ajuste as opções e o conteúdo do catálogo."],
  };
  const value = titles[path];
  if (value) return { title: value[0], hint: value[1] };
  return { title: path.includes("/novo") ? "Novo link" : "Gerenciar link", hint: "Confira os dados e conclua sua tarefa." };
}

export function AdminHeading''')
p.write_text(s,encoding='utf-8')
p=r/'frontend/src/components/domain/admin-nav.tsx';p.write_text('''import { WorkspaceNavigation } from '@/features/account/components/workspace-navigation'

export function AdminNav() { return <WorkspaceNavigation area="admin" /> }
''',encoding='utf-8')
