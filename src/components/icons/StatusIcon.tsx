/**
 * Issue-status glyphs, drawn parametrically from the measured geometry:
 * Backlog = dashed circle r6 stroke 1.5 dasharray "1.4 1.74";
 * others = solid ring + inner progress arc (r2, stroke-width 4,
 * dasharray fraction of circumference 2*PI*2 = 12.566, rotated -90deg).
 */

export type StatusCategory =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled";

/* CAPTURED dasharray denominator (the capture DOM emits 22.6195 for the
   r2/sw4 inner arc — matched verbatim for rendered parity). */
const CIRC = 22.6195;

const CATEGORY_COLOR: Record<StatusCategory, string> = {
  triage: "var(--color-orange)",
  backlog: "#bec2c8",
  unstarted: "#e2e2e2",
  started: "var(--color-orange)",
  completed: "var(--color-accent)",
  canceled: "#8a8f98",
};

export function StatusIcon({
  category,
  color,
  progress,
  size = 14,
}: {
  category: StatusCategory;
  color?: string;
  /** 0..1 fill of the inner arc (started statuses); defaults per category */
  progress?: number;
  size?: number;
}) {
  const c = color ?? CATEGORY_COLOR[category];
  const p =
    progress ??
    (category === "completed"
      ? 1
      : category === "started"
        ? 0.5
        : 0);

  if (category === "canceled") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="6" fill={c} />
        <path
          d="M4.7 4.7 9.3 9.3M9.3 4.7 4.7 9.3"
          stroke="var(--color-bg-surface)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (category === "completed") {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="7" cy="7" r="6" fill={c} />
        <path
          d="M4.2 7.2 6.2 9.2 9.9 5.2"
          stroke="var(--color-bg-surface)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  }

  const dashed = category === "backlog" || category === "triage";
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true">
      <circle
        cx="7"
        cy="7"
        r="6"
        fill="none"
        stroke={c}
        strokeWidth="1.5"
        strokeDasharray={dashed ? "1.4 1.74" : undefined}
        strokeDashoffset={dashed ? 0.65 : undefined}
      />
      {p > 0 && (
        <circle
          cx="7"
          cy="7"
          r="2"
          fill="none"
          stroke={c}
          strokeWidth="4"
          strokeDasharray={`${CIRC * p} ${CIRC}`}
          transform="rotate(-90 7 7)"
        />
      )}
    </svg>
  );
}

/** Priority glyphs: no-priority = 3 flat 3x1.5 rects; bars rise 6/9/12. */
export function PriorityIcon({
  priority,
  size = 16,
}: {
  priority: 0 | 1 | 2 | 3 | 4; // 0 none, 1 urgent, 2 high, 3 medium, 4 low
  size?: number;
}) {
  if (priority === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1" y="1" width="14" height="14" rx="3.5" fill="var(--color-orange)" />
        <path
          d="M8 4.2v4.2"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11.3" r="1" fill="#fff" />
      </svg>
    );
  }
  const active = "var(--icon-default-color)";
  if (priority === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" opacity={0.9}>
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" fill={active} />
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" fill={active} />
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" fill={active} />
      </svg>
    );
  }
  const level = { 4: 1, 3: 2, 2: 3 }[priority] ?? 0;
  /* CAPTURED: inactive bars keep the full color at fill-opacity .4 */
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="8" width="3" height="6" rx="1" fill={active} fillOpacity={level >= 1 ? undefined : 0.4} />
      <rect x="6.5" y="5" width="3" height="9" rx="1" fill={active} fillOpacity={level >= 2 ? undefined : 0.4} />
      <rect x="11.5" y="2" width="3" height="12" rx="1" fill={active} fillOpacity={level >= 3 ? undefined : 0.4} />
    </svg>
  );
}
