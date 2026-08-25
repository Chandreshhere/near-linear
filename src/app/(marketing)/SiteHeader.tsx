"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductMark } from "@/app/(app)/login/glyphs";
import styles from "./landing.module.css";
import { NAV_LINKS, ROUTES } from "./content";

/**
 * Sticky, blurred site header.
 *
 * Geometry is the capture's: `--header-height` 72px (64px ≤640px), a 20px
 * `--header-blur` backdrop filter, an inner wrapper capped
 * at `--homepage-max-width` and inset by
 * `--homepage-padding-inset + --homepage-outer-padding - 1px`.
 * The header starts transparent and picks up its background + hairline once
 * the document scrolls, matching `html[data-scrolled] [data-transparent-header]`.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the page behind the full-screen menu, and close it on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div data-header="">
      <header
        className={styles.header}
        data-transparent="true"
        data-scrolled={scrolled ? "true" : "false"}
        data-menu-open={menuOpen ? "true" : "false"}
      >
        <nav className={styles.headerInner} aria-label="Main">
          <div>
            <ul className={styles.navList}>
              <li className={styles.logoItem}>
                <Link
                  href="/"
                  className={`${styles.logoLink} ${styles.focusRing}`}
                  aria-label="Synquic — home"
                >
                  <ProductMark size={22} />
                  <span>Synquic</span>
                </Link>
              </li>

              <li className={styles.rightSide}>
                <ul className={styles.navItems}>
                  {NAV_LINKS.map((link) => (
                    <li
                      key={link.label}
                      className={link.optional ? styles.navOptional : undefined}
                    >
                      <Link
                        href={link.href}
                        className={`${styles.navAnchor} ${styles.focusRing}`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <span className={styles.navDivider} aria-hidden="true" />

                <ul className={styles.headerButtons}>
                  <li>
                    <Link
                      href={ROUTES.openApp}
                      className={`${styles.navAnchor} ${styles.focusRing}`}
                    >
                      Open app
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={ROUTES.login}
                      className={`${styles.navAnchor} ${styles.focusRing}`}
                    >
                      Log in
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={ROUTES.signup}
                      className={`${styles.btn} ${styles.btnSmall} ${styles.btnInvert}`}
                    >
                      Sign up
                    </Link>
                  </li>
                </ul>
              </li>

              <li className={styles.mobileItem}>
                <button
                  type="button"
                  className={styles.menuTrigger}
                  aria-expanded={menuOpen}
                  aria-controls="marketing-mobile-menu"
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="1" y="7.5" width="14" height="1" rx="0.5" />
                    <rect x="1" y="7.5" width="14" height="1" rx="0.5" />
                  </svg>
                </button>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      <div
        id="marketing-mobile-menu"
        className={styles.mobileMenu}
        data-state={menuOpen ? "open" : "closed"}
        hidden={!menuOpen}
      >
        <ul className={styles.mobileMenuList}>
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <Link href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className={styles.mobileMenuActions}>
          <Link
            href={ROUTES.openApp}
            className={`${styles.btn} ${styles.btnLarge} ${styles.btnSecondary}`}
            onClick={() => setMenuOpen(false)}
          >
            Open app
          </Link>
          <Link
            href={ROUTES.login}
            className={`${styles.btn} ${styles.btnLarge} ${styles.btnSecondary}`}
            onClick={() => setMenuOpen(false)}
          >
            Log in
          </Link>
          <Link
            href={ROUTES.signup}
            className={`${styles.btn} ${styles.btnLarge} ${styles.btnInvert}`}
            onClick={() => setMenuOpen(false)}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
