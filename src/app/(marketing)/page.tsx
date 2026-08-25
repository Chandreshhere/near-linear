import type { CSSProperties } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductMark } from "@/app/(app)/login/glyphs";
import styles from "./landing.module.css";
import { SiteHeader } from "./SiteHeader";
import { HeroHeadline } from "./HeroHeadline";
import { Reveal } from "./Reveal";
import { AppFrameMock, ArrowRight, MOCKS } from "./mocks";
import {
  BENEFITS,
  CHANGELOG,
  FEATURES,
  FOOTER_COLUMNS,
  LEGAL_LINKS,
  PRODUCT_NAME,
  ROUTES,
} from "./content";

/**
 * `/` — the marketing landing page.
 *
 * Vertical rhythm is transcribed from the reference capture, which builds its
 * spacing out of explicit 1px spacer elements rather than margins. Each
 * <Spacer> below carries the capture's measured height for the four
 * breakpoints (>1280 / ≤1280 / ≤1024 / ≤640).
 */

type SpacerProps = {
  xl?: number;
  lg?: number;
  md?: number;
  sm?: number;
  className?: string;
};

function Spacer({ xl, lg, md, sm, className }: SpacerProps) {
  const style: Record<string, string> = {};
  if (xl != null) style["--h-xl"] = `${xl}px`;
  if (lg != null) style["--h-lg"] = `${lg}px`;
  if (md != null) style["--h-md"] = `${md}px`;
  if (sm != null) style["--h-sm"] = `${sm}px`;
  return (
    <span
      aria-hidden="true"
      className={className ? `${styles.spacer} ${className}` : styles.spacer}
      style={style as CSSProperties}
    />
  );
}

/** The 2px rule the capture draws between homepage sections. */
function SectionRule({ className }: { className?: string }) {
  return (
    <div className={className ? `${styles.bleed} ${className}` : styles.bleed}>
      <div aria-hidden="true">
        <div className={styles.separatorShadow} />
        <div className={styles.separatorKeyline} />
      </div>
    </div>
  );
}

/* Unbranded placeholder marks. These stand in for whatever logos the page
   eventually carries — they are labelled honestly and name no company. */
const PROOF_WIDTHS = [58, 44, 72, 50, 66, 40, 62, 48];

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Demo mode is documented as `?demo=1`; honour it wherever it is typed by
  // handing off to the entry resolver, which owns the seeding (README.md).
  const { demo } = await searchParams;
  if (demo === "1") redirect("/app?demo=1");

  return (
    <div className={styles.shell}>
      <a href="#skip-nav" className={styles.skipLink}>
        Skip to content
      </a>

      <SiteHeader />

      <main className={styles.content}>
        <div id="skip-nav" tabIndex={-1} />

        <div className={styles.homepage}>
          {/* ---------------- HERO ---------------- */}
          <Spacer xl={200} md={92} sm={132} />

          <div className={`${styles.heroContainer} ${styles.inset}`}>
            <h1
              className={`${styles.titleHero} ${styles.insetLarge} ${styles.heroTitle}`}
            >
              <HeroHeadline />
            </h1>

            <Spacer xl={32} md={20} />

            <div className={styles.heroDescriptionRow}>
              <p className={`${styles.textLarge} ${styles.heroDescription}`}>
                Made for the work of shipping software. Built for teams that run
                alongside agents.
              </p>
              <div className={styles.heroActions}>
                <Link
                  href={ROUTES.signup}
                  className={`${styles.btn} ${styles.btnLarge} ${styles.btnInvert}`}
                >
                  Start building
                </Link>
                <Link
                  href={ROUTES.openApp}
                  className={`${styles.btn} ${styles.btnLarge} ${styles.btnSecondary}`}
                >
                  Open app
                </Link>
              </div>
            </div>
          </div>

          <Spacer xl={70} sm={36} />

          <Reveal className={styles.bleed}>
            <AppFrameMock />
          </Reveal>

          {/* ---------------- SOCIAL PROOF ---------------- */}
          <Spacer xl={112} lg={52} sm={34} />

          <section
            id="customers"
            className={`${styles.inset} ${styles.insetSmall}`}
            aria-labelledby="proof-heading"
          >
            <Reveal>
              <p
                id="proof-heading"
                className={`${styles.textMini} ${styles.proofLabel}`}
              >
                <span>Your customers here</span>
                <span className="hide-mobile">Placeholder marks</span>
              </p>
              <Spacer xl={24} />
              <ul className={styles.proofRow}>
                {PROOF_WIDTHS.map((width, index) => (
                  <li key={index} className={styles.proofItem}>
                    <span className={styles.proofMark} aria-hidden="true">
                      <span className={styles.proofMarkDot} />
                      <span
                        className={styles.proofMarkBar}
                        style={{ width }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </section>

          {/* ---------------- STATEMENT ---------------- */}
          <Spacer xl={96} lg={40} />

          <Reveal>
            <h2
              className={`${styles.statement} ${styles.inset} ${styles.insetLarge}`}
            >
              <strong className={styles.statementStrong}>
                A different kind of product tool.
              </strong>{" "}
              Built from the ground up for teams whose work is shared with
              agents, {PRODUCT_NAME} raises the bar for how software gets
              planned, reviewed, and shipped.
            </h2>
          </Reveal>

          <Spacer xl={136} lg={74} sm={48} />

          <div className={styles.benefits}>
            {BENEFITS.map((benefit, index) => (
              <Reveal
                key={benefit.title}
                delay={index * 0.08}
                className={`${styles.benefit} ${
                  [styles.benefitA, styles.benefitB, styles.benefitC][index]
                }`}
              >
                <span className={styles.benefitFigure}>{benefit.figure}</span>
                <div className={styles.benefitIllustration} aria-hidden="true">
                  <BenefitGlyph variant={index} />
                </div>
                <div className={styles.benefitCopy}>
                  <span className={styles.benefitTitle}>{benefit.title}</span>
                  <p className={`${styles.textRegular} ${styles.benefitText}`}>
                    {benefit.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Spacer xl={160} lg={128} sm={80} />

          {/* ---------------- FEATURE SECTIONS ---------------- */}
          {FEATURES.map((feature, index) => {
            const Mock = MOCKS[feature.mock];
            return (
              <div key={feature.id} id={index === 0 ? "product" : undefined}>
                <SectionRule />
                <Spacer xl={index === 0 ? 40 : 8} />
                <section className={styles.section} id={feature.id}>
                  <div className={styles.sectionHeader}>
                    <div
                      className={`${styles.inset} ${styles.insetLarge} ${styles.sectionTitleContainer}`}
                    >
                      <Reveal as="h2">
                        <span
                          className={`${styles.titleSection} ${styles.sectionTitle}`}
                          style={{ display: "block" }}
                        >
                          {feature.title}
                        </span>
                      </Reveal>
                    </div>
                    <div
                      className={`${styles.inset} ${styles.sectionDescriptionContainer}`}
                    >
                      <Reveal delay={0.06}>
                        <p
                          className={`${styles.textLarge} ${styles.sectionDescription}`}
                        >
                          {feature.description}
                        </p>
                        <div className={styles.actionWrapper}>
                          <Link
                            href={`#${feature.id}`}
                            className={`${styles.action} ${styles.focusRing}`}
                          >
                            <span
                              className={`${styles.actionIndex} ${styles.slashedZero}`}
                            >
                              {feature.index}
                            </span>
                            <span
                              className={`${styles.actionLabel} ${styles.textLarge}`}
                            >
                              {feature.actionLabel}
                            </span>
                            <span
                              className={styles.actionArrow}
                              aria-hidden="true"
                            >
                              →
                            </span>
                          </Link>
                        </div>
                      </Reveal>
                    </div>
                  </div>

                  <div className={styles.sectionIllustration}>
                    <Reveal
                      className={`${styles.panelContainer} ${
                        feature.glow === "left"
                          ? styles.glowLeft
                          : styles.glowRight
                      }`}
                    >
                      <div className={styles.panel}>
                        <Mock />
                      </div>
                    </Reveal>
                  </div>

                  {feature.ingredients.length > 0 ? (
                    <div className={`${styles.sectionFooter} hide-mobile`}>
                      <div
                        className={`${styles.inset} ${styles.sectionFooterContent}`}
                      >
                        <Spacer xl={36} />
                        <div className={styles.ingredients}>
                          {feature.ingredients.map((item, itemIndex) => (
                            <div
                              key={item.index}
                              className={`${styles.ingredient} ${
                                itemIndex % 2 === 1
                                  ? styles.ingredientUneven
                                  : ""
                              }`}
                            >
                              <Link
                                href={`#${feature.id}`}
                                className={`${styles.ingredientLink} ${styles.focusRing}`}
                              >
                                <span
                                  className={`${styles.ingredientIndex} ${styles.slashedZero}`}
                                >
                                  {item.index}
                                </span>
                                <span className={styles.ingredientLabel}>
                                  {item.label}
                                  <span
                                    className={styles.ingredientPlus}
                                    aria-hidden="true"
                                  >
                                    +
                                  </span>
                                </span>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            );
          })}

          {/* ---------------- CHANGELOG ---------------- */}
          <SectionRule />
          <Spacer xl={160} sm={64} />

          <section id="changelog" aria-labelledby="changelog-heading">
            <div
              className={`${styles.inset} ${styles.insetLarge} ${styles.changelogHead}`}
            >
              <h2 id="changelog-heading" className={styles.changelogTitle}>
                Changelog
              </h2>
              <Link
                href="#changelog"
                className={`${styles.homepageLink} ${styles.textMini} ${styles.focusRing}`}
              >
                View all <ArrowRight />
              </Link>
            </div>

            <Spacer xl={72} sm={40} />

            <div className={styles.changelogWrap}>
              <span className={styles.changelogLine} aria-hidden="true" />
              <ul
                className={`${styles.changelog} ${styles.inset}`}
                data-inset="true"
                aria-label="Recent releases"
              >
                {CHANGELOG.map((entry, index) => (
                  <li key={entry.title} className={styles.changelogItem}>
                    <span
                      className={styles.changelogIndicator}
                      data-first={index === 0 ? "true" : "false"}
                      aria-hidden="true"
                    />
                    <Link
                      href="#changelog"
                      className={`${styles.changelogLink} ${styles.focusRing}`}
                    >
                      <span className={styles.changelogCard}>
                        <span className={styles.changelogCardTitle}>
                          {entry.title}
                        </span>
                        <Spacer xl={8} />
                        <span
                          className={`${styles.textRegular} ${styles.changelogCardText}`}
                        >
                          {entry.text}
                        </span>
                        <Spacer xl={20} />
                        <span className={styles.changelogCardDate}>
                          {entry.date}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <Spacer xl={80} sm={48} />

            <div className={`${styles.inset} ${styles.insetLarge}`}>
              <Link
                href="#changelog"
                className={`${styles.homepageLink} ${styles.textMini} ${styles.focusRing}`}
              >
                Subscribe to release notes <ArrowRight />
              </Link>
            </div>
          </section>

          {/* ---------------- CLOSING CTA ---------------- */}
          <Spacer xl={160} sm={40} />

          <section className={styles.prefooter} aria-labelledby="cta-heading">
            <Reveal as="h2">
              <span
                id="cta-heading"
                className={styles.prefooterHeading}
                style={{ display: "block" }}
              >
                Built for what comes next. Ready today.
              </span>
            </Reveal>
            <div className={styles.prefooterActions}>
              <Link
                href={ROUTES.signup}
                className={`${styles.btn} ${styles.btnLarge} ${styles.btnInvert}`}
              >
                Get started
              </Link>
              <Link
                href={ROUTES.openApp}
                className={`${styles.btn} ${styles.btnLarge} ${styles.btnSecondary}`}
              >
                Open app
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className={styles.footer}>
        <div className={styles.footerWrapper}>
          <div className={styles.footerInner}>
            <div className={`hide-mobile ${styles.footerLogoColumn}`}>
              <Link
                href="/"
                className={`${styles.footerLogo} ${styles.focusRing}`}
                aria-label={`${PRODUCT_NAME} — home`}
              >
                <ProductMark size={20} />
              </Link>
            </div>

            {FOOTER_COLUMNS.map((column) => (
              <div
                key={column.title}
                // The capture carries Legal as a column only below the laptop
                // breakpoint; above it the same links live in the bottom bar.
                className={`${styles.footerSection}${
                  column.title === "Legal" ? " show-laptop" : ""
                }`}
              >
                <h3 className={styles.footerSectionTitle}>{column.title}</h3>
                <ul className={styles.footerList}>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className={`${styles.footerLink} ${styles.focusRing}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div className={`${styles.footerStatus} hide-mobile`}>
              <span className={styles.statusDot} aria-hidden="true" />
              All systems normal
            </div>

            <div className={styles.footerBottom}>
              <ul className={styles.footerLegalLinks}>
                {LEGAL_LINKS.map((link) => (
                  <li key={link.label} className="hide-laptop">
                    <Link
                      href={link.href}
                      className={`${styles.footerLegalLink} ${styles.focusRing}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li className={styles.footerLegalLink}>
                  © {new Date().getFullYear()} {PRODUCT_NAME}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Abstract benefit illustrations — original, token-coloured, decorative. */
function BenefitGlyph({ variant }: { variant: number }) {
  const stroke = "var(--color-border-secondary)";
  const accent = "var(--color-indigo)";
  if (variant === 0) {
    return (
      <svg width="240" height="200" viewBox="0 0 240 200" fill="none">
        {[0, 1, 2, 3].map((row) => (
          <rect
            key={row}
            x={30}
            y={40 + row * 34}
            width={180 - row * 22}
            height={18}
            rx={9}
            fill={row === 1 ? accent : stroke}
            opacity={row === 1 ? 0.75 : 0.5}
          />
        ))}
      </svg>
    );
  }
  if (variant === 1) {
    return (
      <svg width="240" height="200" viewBox="0 0 240 200" fill="none">
        <circle cx="90" cy="100" r="46" stroke={stroke} strokeWidth="2" />
        <circle cx="150" cy="100" r="46" stroke={accent} strokeWidth="2" />
        <circle cx="120" cy="100" r="9" fill={accent} />
      </svg>
    );
  }
  return (
    <svg width="240" height="200" viewBox="0 0 240 200" fill="none">
      <path
        d="M20 150 L70 118 L110 132 L150 78 L190 96 L220 52"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 168 L70 152 L110 158 L150 132 L190 140 L220 118"
        stroke={stroke}
        strokeWidth="2"
        strokeDasharray="5 5"
        strokeLinecap="round"
      />
    </svg>
  );
}
