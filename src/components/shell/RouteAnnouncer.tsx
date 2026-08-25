"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** SPA route announcer (CAPTURED): "Navigated to {document.title}". */
export function RouteAnnouncer() {
  const pathname = usePathname();
  const [message, setMessage] = useState("");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // wait a tick so the new route's <title> is applied
    const t = window.setTimeout(() => {
      setMessage(`Navigated to ${document.title}`);
    }, 50);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="visually-hidden"
    >
      {message}
    </span>
  );
}
