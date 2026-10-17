from pathlib import Path
r=Path(__file__).resolve().parents[2];p=r/'frontend/src/components/domain/panel.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('import { api } from "@/lib/api";','''import { api } from "@/lib/api";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { orderStatusLabel } from "@/domain/labels";
import { WorkspaceSection, ComparisonBars } from "@/components/layout/workspace-section";
import styles from "@/features/account/components/dashboard.module.css";''')
a=s.index('const DESK =');b=s.index('type OrderCache',a);s=s[:a]+s[b:]
a=s.index('export function UserDesk()');b=s.index('export function LinksArea(',a)
s=s[:a]+'''export function UserDesk() {
  const { links, stats, error, ready } = useMyLinks();
  const [orders, setOrders] = useState<PanelOrder[] | null>(null);
  const [orderError, setOrderError] = useState(false);
  useEffect(() => {
    let current = true;
    void api<{ orders?: PanelOrder[] }>("/v1/orders/mine").then(result => {
      if (!current) return;
      if (result.status !== 200) { setOrderError(true); return; }
      setOrders(result.body.orders ?? []);
    }).catch(() => { if (current) setOrderError(true); });
    return () => { current = false; };
  }, []);
  const known = links.flatMap(link => stats[link.id] ? [{ link, numbers: stats[link.id]! }] : []);
  const waiting = links.some(link => stats[link.id] === undefined);
  const unavailable = links.some(link => stats[link.id] === null);
  const impressions = known.reduce((sum, row) => sum + row.numbers.impressions, 0);
  const clicks = known.reduce((sum, row) => sum + row.numbers.clicks, 0);
  const ranked = known.filter(row => row.numbers.clicks > 0).sort((a,b) => b.numbers.clicks-a.numbers.clicks).slice(0,5);
  const stuck = links.filter(needsWork);
  const paidCents = orders?.filter(order => order.status === "PAID" || order.status === "PAID_LATE").reduce((sum,order) => sum + order.amountCents,0);
  return <div className={styles.dashboard}>
    <ConfirmedToast />
    <div className={styles.intro}><div><h2>Seu resumo</h2><p>Acompanhe seus links e veja o próximo passo.</p></div><ButtonLink variant="secondary" href="/painel/links">Gerenciar links</ButtonLink></div>
    {!ready ? <p role="status">Carregando seu resumo…</p> : error ? <p role="alert">{error}</p> : <>
      <dl className={styles.metrics} aria-label="Métricas">
        <div><dt>Links publicados</dt><dd>{amount(count(links,"PUBLISHED"))}</dd><small>{pieces(links.length,"link no total","links no total")}</small></div>
        <div><dt>Em revisão</dt><dd>{amount(count(links,"PENDING_MODERATION"))}</dd><small>{pieces(count(links,"PRE_REJECTED"),"rejeitado","rejeitados")}</small></div>
        <div><dt>Cliques nos links</dt><dd>{known.length ? amount(clicks) : waiting || unavailable ? "—" : "0"}</dd><small>{waiting ? "Ainda contando alguns links" : unavailable ? "Contagem parcial: alguns dados indisponíveis" : `${pieces(impressions,"impressão","impressões")} · ${rate(clicks,impressions)}`}</small></div>
        <div><dt>Total pago</dt><dd>{paidCents === undefined ? "—" : formatCents(paidCents)}</dd><small>{orderError ? "Pedidos indisponíveis" : orders ? pieces(orders.filter(order => order.status === "PENDING_PAYMENT").length,"pagamento pendente","pagamentos pendentes") : "Carregando pedidos"}</small></div>
      </dl>
      <div className={styles.columns}>
        <WorkspaceSection title="Precisa de atenção" action={<a href="/painel/links">Ver todos</a>}>
          {stuck.length ? <ul className={styles.tasks}>{stuck.slice(0,4).map(link => <li key={link.id}><a href={`/painel/links/${link.id}/editar`}>{link.name}</a><span>{link.pendingText ? "Texto novo em revisão" : linkStatusLabel(link.status)}</span></li>)}</ul> : <p>Você está em dia. Nenhum link precisa de ajuste.</p>}
        </WorkspaceSection>
        <WorkspaceSection title="Links mais clicados" description="Comparação entre seus links com contagem disponível.">
          {ranked.length ? <ComparisonBars rows={ranked.map(row => ({ id: row.link.id, label: row.link.name, value: row.numbers.clicks }))} unit="cliques" /> : <p>{waiting ? "Carregando contagem…" : unavailable ? "Contagem indisponível para alguns links." : "Seus primeiros cliques aparecerão aqui."}</p>}
        </WorkspaceSection>
      </div>
    </>}
    <WorkspaceSection title="O que você quer fazer?">
      <div className={styles.shortcuts}><a href="/painel/perfil"><strong>Montar meu perfil →</strong><span>Uma página com os seus links.</span></a><a href="/painel/convites"><strong>Criar um convite fixo →</strong><span>Atualize o destino sem trocar o endereço.</span></a><a href="/painel/pedidos"><strong>Consultar pedidos →</strong><span>Veja pagamentos e destaques.</span></a></div>
    </WorkspaceSection>
  </div>;
}

'''+s[b:]
s=s.replace('export function OrdersArea() {\n','export function OrdersArea() {\n  const [query, setQuery] = useState("");\n  const [status, setStatus] = useState("ALL");\n')
s=s.replace('''      <OrderGrid orders={orders} links={links} />''','''      <div className={styles.toolbar} role="search" aria-label="Filtrar pedidos">
        <Field label="Buscar pedido ou link"><Input type="search" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Situação do pagamento"><Select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Todos os pagamentos</option>{Array.from(new Set(orders.map(order => order.status))).map(value => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}</Select></Field>
      </div>
      <p className={styles.result} role="status">{orders.filter(order => (status === "ALL" || order.status === status) && `${order.id} ${links.find(link => link.id === order.linkId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim())).length} pedidos encontrados</p>
      <OrderGrid orders={orders.filter(order => (status === "ALL" || order.status === status) && `${order.id} ${links.find(link => link.id === order.linkId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim()))} links={links} />''')
p.write_text(s,encoding='utf-8')
