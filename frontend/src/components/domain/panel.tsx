"use client";

import { DashboardSummarySkeleton, ListSkeleton } from '@/components/layout/workspace-skeleton'
import { DashboardShortcuts } from '@/features/account/components/dashboard-shortcuts'
import { Skeleton, SkeletonRegion } from '@/components/feedback/skeleton'
import { ErrorState } from '@/components/feedback/error-state'
import { ActionIcon } from '@/components/ui/action-icon'
import { LiquidLens } from '@/components/ui/liquid-lens'

import { useEffect, useLayoutEffect, useState } from "react";
import {
  LinkList,
  useMyLinks,
  type PanelLink,
} from "@/components/domain/panel-links";
import { OrderGrid, type PanelOrder } from "@/components/domain/order-grid";
import { linkStatusLabel } from "@/domain/labels";
import { formatCents } from "@/domain/money";
import { clearNotice, readNotice, subscribeNotice } from "@/domain/session";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { WorkspaceActions, WorkspaceFilters } from "@/components/layout/workspace-controls";
import { Field, Input, Select } from "@/components/ui/input";
import { orderStatusLabel } from "@/domain/labels";
import { WorkspaceSection } from "@/components/layout/workspace-section";
import styles from "@/components/layout/workspace-dashboard.module.css";

import { MetricChart } from '@/components/ui/metric-chart'
import { ReportView } from '@/components/ui/report-view'

function count(links: PanelLink[], status: string): number {
  return links.filter((link) => link.status === status).length;
}

export { AreaFrame, PanelNav, useAreaSession, usePanelSession, SuspendedAccount, PanelGate, PanelTop, AdminHeading } from "@/features/account/components/area-frame";

type OrderCache = { orders: PanelOrder[]; links: PanelLink[] };
let orderCache: OrderCache | null = null;

function amount(value: number): string {
  return value.toLocaleString("pt-BR");
}

function pieces(value: number, one: string, many: string): string {
  return `${amount(value)} ${value === 1 ? one : many}`;
}

function rate(clicks: number, impressions: number): string {
  if (impressions <= 0) return "0%";
  const value = (clicks / impressions) * 100;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function needsWork(link: PanelLink): boolean {
  return link.status !== "PUBLISHED" || Boolean(link.pendingText);
}

function ConfirmedToast() {
  const [text, setText] = useState("");
  useEffect(() => {
    const show = () => setText(readNotice());
    show();
    return subscribeNotice(show);
  }, []);
  useEffect(() => {
    if (!text) return;
    const timer = window.setTimeout(() => clearNotice(), 4000);
    return () => window.clearTimeout(timer);
  }, [text]);
  if (!text) return null;
  return <p className="toast" role="status"><LiquidLens radius={12}/>{text}</p>;
}

export function UserDesk() {
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
  const ranked = known.filter(row => row.numbers.clicks > 0).sort((a,b) => b.numbers.clicks-a.numbers.clicks);
  const stuck = links.filter(needsWork);
  const paidCents = orders?.filter(order => order.status === "PAID" || order.status === "PAID_LATE").reduce((sum,order) => sum + order.amountCents,0);
  return <div className={styles.dashboard}>
    <ConfirmedToast />
    {!ready ? <DashboardSummarySkeleton /> : error ? <p role="alert">{error}</p> : <>
      <dl className={styles.metrics} aria-label="Métricas">
        <div><dt>Links publicados</dt><dd><LiquidLens radius={16} />{amount(count(links,"PUBLISHED"))}<small>{pieces(links.length,"link no total","links no total")}</small></dd></div>
        <div><dt>Em revisão</dt><dd><LiquidLens radius={16} />{amount(count(links,"PENDING_MODERATION"))}<small>{pieces(count(links,"PRE_REJECTED"),"rejeitado","rejeitados")}</small></dd></div>
        <div><dt>Cliques nos links</dt><dd><LiquidLens radius={16} />{known.length ? amount(clicks) : waiting ? <Skeleton width="45%" height="1lh" /> : unavailable ? "—" : "0"}<small>{waiting ? <Skeleton height="1lh" /> : unavailable ? "Contagem parcial: alguns dados indisponíveis" : `${pieces(impressions,"impressão","impressões")} · ${rate(clicks,impressions)}`}</small></dd></div>
        <div><dt>Total pago</dt><dd><LiquidLens radius={16} />{paidCents === undefined ? orderError ? "—" : <Skeleton width="55%" height="1lh" /> : formatCents(paidCents)}<small>{orderError ? "Pedidos indisponíveis" : orders ? pieces(orders.filter(order => order.status === "PENDING_PAYMENT").length,"pagamento pendente","pagamentos pendentes") : <Skeleton height="1lh" />}</small></dd></div>
      </dl>
      <div className={styles.columns}>
        <WorkspaceSection title="Precisa de atenção" action={<a href="/painel/links">Ver todos</a>}>
          {stuck.length ? <ul className={styles.tasks}>{stuck.slice(0,4).map(link => <li key={link.id}><a href={`/painel/links/${link.id}/editar`}>{link.name}</a><span>{link.pendingText ? "Texto novo em revisão" : linkStatusLabel(link.status)}</span></li>)}</ul> : <p>Você está em dia. Nenhum link precisa de ajuste.</p>}
        </WorkspaceSection>
        <div>
          {ranked.length ? <ReportView title="Links mais clicados" rows={ranked} rowKey={row=>row.link.id} columns={[{label:'Link',render:row=><a href={`/painel/links/${row.link.id}/resultado`}>{row.link.name}</a>},{label:'Cliques',render:row=>amount(row.numbers.clicks),numeric:true},{label:'Impressões',render:row=>amount(row.numbers.impressions),numeric:true},{label:'CTR',render:row=>rate(row.numbers.clicks,row.numbers.impressions),numeric:true}]} chart={<MetricChart kind="ranking" label="Cliques por link" rows={ranked.map(row=>({label:row.link.name,value:row.numbers.clicks}))}/>}/> : waiting || unavailable ? <WorkspaceSection title="Links mais clicados">{waiting ? <SkeletonRegion label="Carregando contagem"><Skeleton height={24}/><Skeleton width="80%" height={24}/></SkeletonRegion> : unavailable ? <p>Contagem indisponível para alguns links.</p> : null}</WorkspaceSection>:null}
        </div>
      </div>
    </>}
    <DashboardShortcuts />
  </div>;
}

export function LinksArea({ banned }: { banned: boolean }) {
  const { links, stats, error, ready, reload } = useMyLinks();
  if (!ready)
    return (
      <ListSkeleton filters={4} />
    );
  return (
    <>

      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!error ? (
        <LinkList links={links} banned={banned} stats={stats} />
      ) : null}
    </>
  );
}

export function OrdersArea() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [links, setLinks] = useState<PanelLink[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useLayoutEffect(() => {
    if (!orderCache) return;
    setOrders(orderCache.orders);
    setLinks(orderCache.links);
    setReady(true);
  }, []);
  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const [orderList, mine] = await Promise.all([
          api<{ orders?: PanelOrder[]; message?: string }>("/v1/orders/mine"),
          api<{ links?: PanelLink[] }>("/v1/links/mine?pageSize=24"),
        ]);
        if (!current) return;
        if (orderList.status !== 200) {
          setError(orderList.body.message ?? "Não foi possível carregar os pedidos.");
          return;
        }
        const nextOrders = orderList.body.orders ?? [];
        const nextLinks = mine.status === 200 ? mine.body.links ?? [] : orderCache?.links ?? [];
        setOrders(nextOrders);
        setLinks(nextLinks);
        setError("");
        orderCache = { orders: nextOrders, links: nextLinks };
      } catch {
        if (current) setError("Não foi possível carregar os pedidos.");
      } finally {
        if (current) setReady(true);
      }
    })();
    return () => { current = false; };
  }, [attempt]);
  function retry() {
    setError("");
    if (!orders.length) setReady(false);
    setAttempt(value => value + 1);
  }
  const filteredOrders = orders.filter(order => (status === "ALL" || order.status === status) && `${order.id} ${links.find(link => link.id === order.linkId)?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR").trim()));
  if (!ready)
    return (
      <ListSkeleton kind="orders" />
    );
  if (error && !orders.length) return <ErrorState message={error} onRetry={retry} />;
  return (
    <>
      {error ? <ErrorState message={error} onRetry={retry} /> : null}
      <WorkspaceActions><Button variant="secondary" onClick={() => { setQuery(''); setStatus('ALL') }}><ActionIcon name="resetFilters" />Limpar filtros</Button></WorkspaceActions>
      <WorkspaceFilters label="Filtrar pedidos">
        <Field label="Buscar pedido ou link"><Input type="search" value={query} onChange={event => setQuery(event.target.value)} /></Field>
        <Field label="Situação do pagamento"><Select value={status} onChange={event => setStatus(event.target.value)}><option value="ALL">Todos os pagamentos</option>{Array.from(new Set(orders.map(order => order.status))).map(value => <option key={value} value={value}>{orderStatusLabel(value)}</option>)}</Select></Field>
      </WorkspaceFilters>
      {!error || filteredOrders.length ? <OrderGrid orders={filteredOrders} links={links} /> : null}
    </>
  );
}
