"use client";

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

function count(links: PanelLink[], status: string): number {
  return links.filter((link) => link.status === status).length;
}

export { AreaFrame, PanelNav, useAreaSession, usePanelSession, SuspendedAccount, PanelGate, PanelTop, AdminHeading } from "@/features/account/components/area-frame";

const DESK = [
  { id: "metricas", label: "Métricas", gloss: "Os seus totais" },
  { id: "cliques", label: "Mais clicados", gloss: "Só os seus links" },
  { id: "atencao", label: "Atenção", gloss: "O que travou" },
  { id: "pedidos", label: "Pedidos", gloss: "O que você pagou" },
] as const;

type DeskId = (typeof DESK)[number]["id"];

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
  return <p className="toast" role="status">{text}</p>;
}

export function UserDesk() {
  const { links, stats, error, ready } = useMyLinks();
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [section, setSection] = useState<DeskId>("metricas");
  useLayoutEffect(() => {
    if (orderCache) setOrders(orderCache.orders);
  }, []);
  useEffect(() => {
    void api<{ orders?: PanelOrder[] }>("/v1/orders/mine").then((result) => {
      if (result.status !== 200) return;
      const next = result.body.orders ?? [];
      orderCache = { orders: next, links: orderCache?.links ?? [] };
      setOrders(next);
    });
  }, []);

  const waiting = links.filter((link) => stats[link.id] === undefined).length;
  const known = links.flatMap((link) => {
    const row = stats[link.id];
    return row ? [row] : [];
  });
  const impressions = known.reduce((sum, row) => sum + row.impressions, 0);
  const clicks = known.reduce((sum, row) => sum + row.clicks, 0);
  const paid = orders.filter(
    (order) => order.status === "PAID" || order.status === "PAID_LATE",
  );
  const paidCents = paid.reduce((sum, order) => sum + order.amountCents, 0);
  const pendingPay = orders.filter(
    (order) => order.status === "PENDING_PAYMENT",
  ).length;
  const ranked = links
    .flatMap((link) => {
      const row = stats[link.id];
      return row && row.clicks > 0 ? [{ link, row }] : [];
    })
    .sort((a, b) => b.row.clicks - a.row.clicks);
  const stuck = links.filter(needsWork);

  return (
    <div className="desk">
      <ConfirmedToast />
      <nav className="office-glossary" aria-label="Operação">
        {DESK.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={section === item.id ? "true" : undefined}
            onClick={() => setSection(item.id)}
          >
            {item.label}
            <small>{item.gloss}</small>
          </button>
        ))}
      </nav>
      <div className="office-body">
          {!ready ? (
            <p role="status" aria-label="Carregando">
              Carregando
            </p>
          ) : null}
          {error ? (
            <p className="panel-note" role="alert">
              {error}
            </p>
          ) : null}
          {ready ? (
            <>
              <p className="office-note">
                Só os seus links e os seus pedidos.{" "}
                {waiting > 0
                  ? `Ainda contando ${pieces(waiting, "link", "links")}.`
                  : null}
              </p>
              {section === "metricas" ? (
                <section className="office-metrics" aria-label="Métricas">
                  <p className="metric">
                    <span className="metric-value">{amount(links.length)}</span>
                    <span className="metric-label">
                      links ·{" "}
                      {pieces(
                        count(links, "PUBLISHED"),
                        "publicado",
                        "publicados",
                      )}
                    </span>
                  </p>
                  <p className="metric">
                    <span className="metric-value">
                      {amount(count(links, "PENDING_MODERATION"))}
                    </span>
                    <span className="metric-label">
                      em revisão ·{" "}
                      {pieces(
                        count(links, "PRE_REJECTED"),
                        "rejeitado",
                        "rejeitados",
                      )}
                    </span>
                  </p>
                  <p className="metric">
                    <span className="metric-value">
                      {waiting > 0 && known.length === 0 ? "…" : amount(clicks)}
                    </span>
                    <span className="metric-label">
                      {waiting > 0 && known.length === 0
                        ? "contando"
                        : `${pieces(impressions, "impressão", "impressões")} · ${rate(clicks, impressions)}`}
                    </span>
                  </p>
                  <p className="metric">
                    <span className="metric-value">
                      {formatCents(paidCents)}
                    </span>
                    <span className="metric-label">
                      pago · {pieces(pendingPay, "pendente", "pendentes")}
                    </span>
                  </p>
                </section>
              ) : null}
              {section === "cliques" ? (
                <section aria-label="Links mais clicados">
                  <h2>Seus links mais clicados</h2>
                  {ranked.length === 0 ? (
                    <p>
                      {waiting > 0
                        ? "Contando"
                        : "Nenhum clique nos seus links."}
                    </p>
                  ) : (
                    <div className="moderation-grid">
                      {ranked.map(({ link, row }) => (
                        <article
                          key={link.id}
                          className="summary-card moderation-card"
                        >
                          <h2>
                            <a href={`/painel/links/${link.id}/editar`}>
                              {link.name}
                            </a>
                          </h2>
                          <p className="moderation-kicker">
                            {linkStatusLabel(link.status)}
                          </p>
                          <p>
                            {pieces(row.clicks, "clique", "cliques")} ·{" "}
                            {pieces(row.impressions, "impressão", "impressões")}{" "}
                            · {rate(row.clicks, row.impressions)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}
              {section === "atencao" ? (
                <section aria-label="Links que precisam de ação">
                  <h2>O que precisa de você</h2>
                  {stuck.length === 0 ? (
                    <p>Nada parado.</p>
                  ) : (
                    <div className="moderation-grid">
                      {stuck.map((link) => (
                        <article
                          key={link.id}
                          className="summary-card moderation-card"
                        >
                          <h2>
                            <a href={`/painel/links/${link.id}/editar`}>
                              {link.name}
                            </a>
                          </h2>
                          <p className="moderation-kicker">
                            {link.pendingText
                              ? "Texto novo em revisão"
                              : linkStatusLabel(link.status)}
                          </p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}
              {section === "pedidos" ? (
                <section aria-label="Seus pedidos">
                  <h2>Seus pedidos</h2>
                  <OrderGrid orders={orders} links={links} />
                </section>
              ) : null}
            </>
          ) : null}
      </div>
    </div>
  );
}

export function LinksArea({ banned }: { banned: boolean }) {
  const { links, stats, error, ready } = useMyLinks();
  if (!ready)
    return (
      <p role="status" aria-label="Carregando">
        Carregando
      </p>
    );
  return (
    <>
      <h2 className="panel-section-title">Seus links</h2>
      <p className="panel-section-description">Acompanhe a publicação, revise o conteúdo e gerencie os destaques.</p>
      {error ? (
        <p className="panel-note" role="alert">
          {error}
        </p>
      ) : null}
      {!error && links.length === 0 ? (
        <p className="panel-empty">Nenhum link</p>
      ) : null}
      {links.length > 0 ? (
        <LinkList links={links} banned={banned} stats={stats} />
      ) : null}
    </>
  );
}

export function OrdersArea() {
  const [orders, setOrders] = useState<PanelOrder[]>([]);
  const [links, setLinks] = useState<PanelLink[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    if (!orderCache) return;
    setOrders(orderCache.orders);
    setLinks(orderCache.links);
    setReady(true);
  }, []);
  useEffect(() => {
    void (async () => {
      const [orderList, mine] = await Promise.all([
        api<{ orders?: PanelOrder[]; message?: string }>("/v1/orders/mine"),
        api<{ links?: PanelLink[] }>("/v1/links/mine?pageSize=24"),
      ]);
      if (orderList.status !== 200)
        setError(
          orderList.body.message ?? "Não foi possível carregar os pedidos.",
        );
      else setOrders(orderList.body.orders ?? []);
      const nextLinks = mine.body.links ?? [];
      setLinks(nextLinks);
      if (orderList.status === 200) {
        orderCache = { orders: orderList.body.orders ?? [], links: nextLinks };
      }
      setReady(true);
    })();
  }, []);
  if (!ready)
    return (
      <p role="status" aria-label="Carregando">
        Carregando
      </p>
    );
  return (
    <>
      <h2 className="panel-section-title">Pedidos de destaque</h2>
      <p className="panel-section-description">Consulte o pagamento e a situação dos seus pedidos.</p>
      {error ? (
        <p className="panel-note" role="alert">
          {error}
        </p>
      ) : null}
      <OrderGrid orders={orders} links={links} />
    </>
  );
}
