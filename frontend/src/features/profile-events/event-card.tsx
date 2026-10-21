import type { ProfileContent } from "@/features/profiles/profile-contract";
import { ActionIcon } from "@/components/ui/action-icon";
import { Skeleton } from "@/components/feedback/skeleton";
import { eventStatus } from "./event-contract";
import styles from "./event.module.css";
type Item = ProfileContent["items"][number];
export function EventCard({
  item,
  originalLanguage,buttonLanguage,
  preview = false,
  pending = false,
  now = new Date().toISOString(),
  heading: Heading = "h3",
}: {
  item: Item;
  originalLanguage?:string;buttonLanguage?:string;
  slug: string;
  preview?: boolean;
  pending?: boolean;
  now?: string;
  heading?: "h2" | "h3" | "h4" | "h5";
}) {
  const event = item.event;
  if (!event) return null;
  const status = eventStatus(event, now),
    unavailable = status === "Cancelado" || status === "Encerrado";
  const day = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: event.timeZone,
    }).format(new Date(value));
  const hour = (value: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: event.timeZone,
    }).format(new Date(value));
  return (
    <section
      className={styles.card} lang={originalLanguage}
      aria-label={"Evento: " + item.label}
      data-event-state={event.state}
    >
      <header className={styles.header}>
        <Heading className={styles.title}>{item.label}</Heading>
        {unavailable ? <span className={styles.status}>{status}</span> : null}
      </header>
      <dl className={styles.dates}>
        {(
          [
            ["Começa", event.startsAt],
            ["Termina", event.endsAt],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className={styles.date}>
            <dt>{label}</dt>
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
          <dt>Local</dt>
          <dd>{event.location}</dd>
        </div>
      </dl>
      {event.description ? (
        <p className={styles.description}>{event.description}</p>
      ) : null}
      {!unavailable ? (
        <div className={styles.actions}>
          {pending ? (
            <Skeleton height="3rem" />
          ) : (
            <a lang={buttonLanguage}
              className={styles.signup}
              href={preview ? undefined : item.destination}
              aria-disabled={preview || undefined}
              data-profile-block-id={item.id}
              rel="ugc nofollow noopener"
            >
              {event.buttonLabel ?? "Acessar evento"}
              <ActionIcon name="external" />
            </a>
          )}
        </div>
      ) : null}
    </section>
  );
}
