"use client";

import { useEffect } from "react";

/**
 * Body class choreography (CAPTURED sequence):
 *   content-loaded -> is-bootstrapped -> loaded -> bootstrap-fade-complete
 * Also: adds .loadingText after 8s if still booting, measures the scrollbar
 * probe into --scrollbar-width, and flags obtrusive scrollbars on the body.
 */
export function BootChoreography() {
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    // scrollbar measurement
    const probe = document.getElementById("scrollbarProbe");
    const sbw = probe ? probe.offsetWidth - probe.clientWidth : 0;
    html.style.setProperty("--scrollbar-width", `${sbw}px`);
    body.classList.toggle("layoutScrollbarObtrusive", sbw > 0);

    const loadingTextTimer = window.setTimeout(() => {
      body.classList.add("loadingText");
    }, 8000);

    body.classList.add("content-loaded");
    let raf1 = 0;
    let raf2 = 0;
    let fadeTimer = 0;
    raf1 = requestAnimationFrame(() => {
      body.classList.add("is-bootstrapped");
      raf2 = requestAnimationFrame(() => {
        body.classList.add("loaded");
        clearTimeout(loadingTextTimer);
        body.classList.remove("loadingText");
        // splash opacity transition is .2s; then remove it from the tree
        fadeTimer = window.setTimeout(() => {
          body.classList.add("bootstrap-fade-complete");
        }, 220);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(loadingTextTimer);
      clearTimeout(fadeTimer);
    };
  }, []);

  return null;
}
