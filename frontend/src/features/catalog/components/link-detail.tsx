import Link from "next/link";
import { ActionIcon } from "@/components/ui/action-icon";
import { LiquidLens } from "@/components/ui/liquid-lens";
import { CatalogImage } from "@/components/domain/catalog-image";
import type { LinkContext } from "@/components/domain/link-meta";
import { FacetBadge } from "@/components/ui/facet-badge";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { CopyLinkButton } from "./copy-link-button";
import styles from "./ondas-catalog.module.css";
import detail from "./link-detail.module.css";

type LinkDetailProps = {
  id: string;
  href: string;
  sharePath: string;
  link: LinkContext & {
    name?: string;
    description?: string;
    iconUrl?: string | null;
    imageUrl?: string | null;
    imageAlt?: string | null;
  };
};

export function LinkDetail({ id, link, href, sharePath }: LinkDetailProps) {
  const name = link.name?.trim() ?? "";
  const words = name.split(/\s+/u).filter(Boolean);
  const initials = [words[0], words.length > 1 ? words.at(-1) : ""]
    .map((word) => Array.from(word ?? "")[0])
    .join("")
    .toLocaleUpperCase("pt-BR");
  const text = link.description?.trim() ?? "";
  const description = text && text !== name ? text : null;
  const intro = description?.split(/(?<=[.!?])\s+/u)[0];
  const city = link.discovery?.city
    ? `${link.discovery.city.name} / ${link.discovery.city.state}`
    : null;
  const language = link.discovery?.languageTag
    ? new Intl.DisplayNames(["pt-BR"], { type: "language" }).of(
        link.discovery.languageTag,
      )
    : null;
  const modality = link.discovery?.modality
    ? link.discovery.modality === "ONLINE"
      ? "Online"
      : "Presencial"
    : null;
  const facts = [
    ["Rede", link.network?.name],
    ["Assunto", link.niche?.name],
    ["Localização", city],
    ["Idioma", language],
    ["Participação", modality],
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()));
  return (
    <>
      <nav className={styles.breadcrumb} aria-label="Caminho do link">
        <Link href="/">
          <ActionIcon name="back" width={18} height={18} />
          Catálogo
        </Link>
        {link.niche?.name ? (
          <>
            <span aria-hidden="true">/</span>
            <span>{link.niche.name}</span>
          </>
        ) : null}
      </nav>
      <section
        className={styles.detailHero}
        aria-labelledby="link-title"
        data-without-image={!link.imageUrl || undefined}
      >
        {link.imageUrl ? (
          <div className={styles.detailMedia}>
            <LiquidLens radius={24} />
            <div className={styles.detailCover} data-detail-photo>
              <CatalogImage
                src={link.imageUrl}
                alt={link.imageAlt}
                className={detail.image}
                sizes="(max-width: 600px) calc(100vw - 36px), (max-width: 850px) calc(100vw - 48px), (max-width: 1352px) calc((100vw - 96px) * 0.5455), 686px"
                eager
              />
            </div>
          </div>
        ) : null}
        <div className={styles.detailSummary} data-detail-content>
          <LiquidLens radius={22} />
          <div className={styles.identity}>
            <span className={`${styles.avatar} ${detail.avatar}`}>
              <CatalogImage
                src={link.iconUrl}
                className={detail.icon}
                kind="icon"
                sizes="51px"
                fallback={<span>{initials}</span>}
              />
            </span>
            {link.network?.name ? (
              <span className={detail.network}>
                <FacetBadge
                  kind="network"
                  slug={link.network.slug ?? ""}
                  name={link.network.name}
                />
              </span>
            ) : null}
          </div>
          <h1 id="link-title" className={detail.title}>
            {link.name}
          </h1>
          {intro ? <p className={styles.detailIntro}>{intro}</p> : null}
          <div className={`${styles.detailFacts} ${detail.facts}`}>
            {link.niche?.name ? (
              <span className={styles.niche}>
                <FacetBadge
                  kind="niche"
                  slug={link.niche.slug ?? ""}
                  name={link.niche.name}
                />
              </span>
            ) : null}
            {city ? (
              <span>
                <ActionIcon name="city" width={16} height={16} />
                {city}
              </span>
            ) : null}
            {language ? (
              <span>
                <ActionIcon name="language" width={16} height={16} />
                {language}
              </span>
            ) : null}
            {modality ? (
              <span>
                <ActionIcon name="modality" width={16} height={16} />
                {modality}
              </span>
            ) : null}
          </div>
          <div className={styles.detailActions}>
            <a className={styles.primary} href={href}>
              <LiquidLens radius={12} />
              Acessar
              <ActionIcon name="external" width={20} height={20} />
            </a>
            <FavoriteButton linkId={id} className={styles.detailFavorite} />
          </div>
          <p className={styles.detailHint}>
            Você sairá do Tem Link Aqui para acessar este link.
          </p>
        </div>
      </section>
      <div
        className={styles.detailInformation}
        data-without-description={!description || undefined}
      >
        {description ? (
          <section
            className={styles.about}
            aria-label="Sobre o link"
            aria-labelledby="about-link"
          >
            <LiquidLens radius={22} />
            <h2 id="about-link">Sobre o link</h2>
            <p className={detail.description}>{description}</p>
            <div className={`${styles.interestTags} ${detail.tags}`}>
              {link.niche?.name ? (
                <span>
                  <LiquidLens radius={999} />
                  <FacetBadge
                    kind="niche"
                    slug={link.niche.slug ?? ""}
                    name={link.niche.name}
                  />
                </span>
              ) : null}
              {link.network?.name ? (
                <span>
                  <LiquidLens radius={999} />
                  <FacetBadge
                    kind="network"
                    slug={link.network.slug ?? ""}
                    name={link.network.name}
                  />
                </span>
              ) : null}
            </div>
          </section>
        ) : null}
        <aside
          className={styles.information}
          aria-labelledby="link-information"
        >
          <LiquidLens radius={16} />
          <h2 id="link-information">Detalhes</h2>
          {facts.length ? (
            <dl>
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <CopyLinkButton path={sharePath} />
          <details className={styles.report}>
            <summary>
              <ActionIcon name="report" width={16} height={16} />
              Encontrou um problema?
            </summary>
            <p>
              <a href={"/painel/denunciar/" + encodeURIComponent(id)}>
                Denunciar um link
              </a>
            </p>
          </details>
        </aside>
      </div>
    </>
  );
}
