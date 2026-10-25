import {pageText} from '@/domain/public-page-locale';
import type {ProfileLocale} from '@/features/profiles/profile-contract';
import type { ProfileContent } from "@/features/profiles/profile-contract";
import { ActionIcon } from "@/components/ui/action-icon";
import { Skeleton } from "@/components/feedback/skeleton";
import { eventStatus } from "./event-contract";
import styles from "./event.module.css";
type Item = ProfileContent["items"][number];
export function EventCard({
  item,
  originalLanguage,buttonLanguage,locale,
  preview = false,
  pending = false,
  now = new Date().toISOString(),
  heading: Heading = "h3",
}: {
  item: Item;
  originalLanguage?:string;buttonLanguage?:string;locale?:ProfileLocale;
  slug: string;
  preview?: boolean;
  pending?: boolean;
  now?: string;
  heading?: "h2" | "h3" | "h4" | "h5";
}) {
  const t=(text:string)=>pageText(locale,text);
  const event = item.event;
  if (!event) return null;
  const status = eventStatus(event, now),
    unavailable = status === "Cancelado" || status === "Encerrado";
  const day = (value: string) =>
    new Intl.DateTimeFormat(locale??"pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: event.timeZone,
    }).format(new Date(value));
  const hour = (value: string) =>
    new Intl.DateTimeFormat(locale??"pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: event.timeZone,
    }).format(new Date(value));
  return (
    <section
      className={styles.card} lang={locale}
      aria-label={t("Evento")+": " + item.label}
      data-event-state={event.state}
    >
      <header className={styles.header}>
        <Heading lang={originalLanguage} className={styles.title}>{item.label}</Heading>
        {unavailable ? <span className={styles.status}>{t(status)}</span> : null}
      </header>
      <dl className={styles.dates}>
        {(
          [
            ["Começa", event.startsAt],
            ["Termina", event.endsAt],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className={styles.date}>
            <dt>{t(label)}</dt>
            <dd>
              <time dateTime={value}>
                <span>{day(value)}</span>
                <strong>{hour(value)}</strong>
              </time>
            </dd>
          </div>
        ))}
      </dl>
      <dl className={styles.location}>
        <div>
          <dt>{t("Local")}</dt>
          <dd lang={originalLanguage}>{event.location}</dd>
        </div>
      </dl>
      {event.description ? (
        <p lang={originalLanguage} className={styles.description}>{event.description}</p>
      ) : null}
      {!unavailable ? (
        <div className={styles.actions}>
          {pending ? (
            <Skeleton height="3rem" />
          ) : (
            <a lang={event.buttonLabel?buttonLanguage:locale}
              className={styles.signup}
              href={preview ? undefined : item.destination}
              aria-disabled={preview || undefined}
              data-profile-block-id={item.id}
              rel="ugc nofollow noopener"
            >
              {event.buttonLabel ?? t("Acessar evento")}
              <ActionIcon name="external" />
            </a>
          )}
        </div>
      ) : null}
    </section>
  );
}
