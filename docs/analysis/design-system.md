# Linear.app Design System — Forensic Extraction

Source: compiled production stylesheet captured 2026-08-24 from `static.linear.app/client/assets/*` (84 Vite CSS chunks concatenated, each labeled `/* Source: ... */`), plus serialized inline styles from 7 page captures (all rendered in **dark theme**, `html.dark`).

- Primary file analyzed: `captures/projects/projects/styles.css` (29,069 lines, 642,856 bytes)
- Variant: `captures/driver-app-overview/driver-app-overview/styles.css` (29,074 lines)

**Variant diff (exact):** driver-app-overview appends ONE extra lazy-loaded chunk, `MainSettingsLayout-nT5gJDH_.css` (5 lines): a `@layer reset, base, app.base;` statement plus sidebar-button rules — `._button_1o9mn_8 svg:not(.sc2sx-SidebarSectionActionButton-a3f9c2d4 *){fill:var(--sidebar-button-highlight-fill,var(--icon-replacement-color))!important}` and `:active`/`:hover` rules setting `color:var(--sidebar-button-highlight-text)` on `.sc2sx-SidebarLink-SidebarStyledText-c7e2a8f1`. Everything else is byte-identical. (Across all 7 captures there are only 3 checksum groups, differing solely in which lazy chunks had loaded — e.g. `NewContentViewHeader` vs `AgentPanel`.)

**Counts (exact):** 1,217 custom-property declarations; 632 distinct `--*` names in the stylesheet; 771 distinct names union-ed with inline `style=""` attributes across captures; 241 are `--sx-*` atomic-theme slots; 181 `@property` registrations; 87 `@keyframes`; 6,319 `.sx-*` atomic classes; 254 CSS-module classes (`._name_hash_line`); 15 `.sc2sx-*` styled-component-migrated classes.

---

## 1. How theming is implemented

There is **no** `.theme--dark` / `.theme--light` / `[data-theme]` / `prefers-color-scheme` styling anywhere in the compiled CSS (0 matches). Theming is a 3-stage runtime system:

1. **Boot stage (pre-JS):** `:root` defines paired hex tokens (`--bg-sidebar-light: #efeff0` / `--bg-sidebar-dark: #09090a`, etc.) and `html { --bg-color: var(--bg-sidebar-light) }` vs `html.dark { --bg-color: var(--bg-sidebar-dark) }`. The theme class is just `dark` on `<html>` (captures show `class="dark logged-out"`).
2. **Registration stage (compiled CSS):** theme slots are *registered empty*: `:root, .sx-1xr6qsj { --sx-1m4y240: ; --sx-g52i5g: ; ... }` (116 slots in the main block, 241 total) and semantic tokens are registered as `initial` (`:root, .sx-bh3tsk { --color-bg-primary: initial; ... }`). Dynamic per-element props are `@property`-registered with `syntax:"*"; inherits:false` (all 181 are `--x-*`, e.g. `@property --x-backgroundColor`).
3. **Runtime stage (JS theme engine):** actual color values are computed in **LCH color space** from the user's theme settings and injected via CSSOM + inline `style` attributes. The captures preserve them in inline styles, all dark-theme: e.g. `<html style="--bg-color: lch(2.595% 0.4 272 / 1); --bg-base-color: lch(5.52% 0.4 272); --bg-border-color: lch(14.16% 1.48 272 / 1); --agent-toolbar-height: 28px; --scrollbar-width: 0px">`.

Theme switching kills all motion during the swap: `.app-theme-transition, .app-theme-transition *, ...::before/::after { transition: none !important }`.

Derived colors are computed in-CSS with `color-mix`, mostly `in lch` / `in srgb` / `in oklch` (e.g. hover = `color-mix(in lch, var(--sx-1gxylln), var(--sx-3zwjav) 10%)` — bg + 10% label color).

---

## 2. GIANT TOKEN TABLE

### 2.1 Boot color tokens (defined in CSS, both themes — exact)

| Token | Dark value | Light value | Purpose |
|---|---|---|---|
| `--bg-color` / `--bg-sidebar-color` | `#09090a` (runtime: `lch(2.595% 0.4 272 / 1)`) | `#efeff0` | window/sidebar background |
| `--bg-base-color` | `#121213` (runtime: `lch(5.52% 0.4 272)`) | `#f9f9fa` | main content panel bg |
| `--bg-border-color` | `#212224` (runtime: `lch(14.16% 1.48 272 / 1)`) | `#e2e2e2` | app frame border |
| `--content-color` | `#6b6f76` | `#b0b5c0` | loading-screen text |
| `--content-highlight-color` | `#ffffff` | `#23252a` | loading-screen emphasis text |
| `--loading-error-muted-color` | `#97979a` | `#5b5b5d` | error screen muted text |
| `--loading-error-secondary-bg` | `#1c1c1d` | `#fefeff` | error secondary button bg |
| `--loading-error-secondary-border` | `#ffffff22` | `#00000016` | error secondary button border |
| `--loading-error-secondary-hover-bg` | `#252627` | `#f7f7f7` | error secondary button hover |
| `--loading-error-secondary-label` | `#e2e3e5` | `#2f2f31` | error secondary button label |
| `--loading-error-secondary-shadow` | `0px 4px 4px -1px #0000000a, 0px 1px 1px 0px #00000014` | `0px 3px 6px -2px #00000005, 0px 1px 1px #0000000a` | error button shadow |
| `--sidebar-width` | `244px` | `244px` | sidebar width (`-1px` when `.logged-out`/`.error`) |
| `--agent-toolbar-height` | `0px` (`28px` set at runtime; forced `0px` ≤1023px) | same | agent toolbar |
| `--scrollbar-width` | `12px` (`0px` at runtime on macOS overlay) | same | scrollbar gutter |
| `--loading-error-thin-pixel` | `1px` (`0.5px` at `min-resolution:192dpi`) | same | hairline |
| `--radius-rounded` | `9999px` | same | pill radius |
| `--control-border-radius` | `var(--control-border-radius, 4px)` | same | control radius default 4px |
| `#loading ::selection` | `#7180ff` | — | boot-screen selection |

### 2.2 Typography tokens (`@layer base > :root` — theme-invariant)

| Token | Value |
|---|---|
| `--font-regular` | `"Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", "Linear Thai", sans-serif` |
| `--font-monospace` | `"Berkeley Mono", "SFMono Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace` |
| `--font-emoji` | `"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Twemoji Mozilla", "Noto Color Emoji", "Android Emoji"` |
| `--font-size-micro` / `--font-size-microPlus` | `.6875rem` (11px) — hi-dpi override: `round(up, .6875rem, 2px)` |
| `--font-size-mini` / `--font-size-miniPlus` | `.75rem` (12px) |
| `--font-size-small` / `--font-size-smallPlus` | `.8125rem` (13px) |
| `--font-size-regular` / `--font-size-regularPlus` | `.9375rem` (15px) |
| `--font-size-large` / `--font-size-largePlus` | `1.125rem` (18px) |
| `--font-size-title1` | `2.25rem` (36px) |
| `--font-size-title2` | `1.5rem` (24px) |
| `--font-size-title3` | `1.25rem` (20px) |
| `--font-weight-light` | `300` |
| `--font-weight-normal` | `450` (Linear's body weight — not 400) |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

`@font-face`: Inter Variable `100 900` woff2 (`InterVariable.woff2?v=4.1` + Italic), Berkeley Mono Variable `100 900` (`Berkeley-Mono-Variable.woff2?v=3.2`), `Linear Thai` (weight 450, local Thonburi/Sukhumvit stack, `unicode-range:U+E00-E7F`). All `font-display:swap`. iOS: `@supports(-webkit-touch-callout:none){ html{font:-apple-system-body} }`.

### 2.3 Speed & easing tokens (`@layer base > :root`)

| Token | Value | Used for |
|---|---|---|
| `--speed-highlightFadeIn` | `0s` | hover-in (instant) |
| `--speed-highlightFadeOut` | `.15s` | hover-out fade |
| `--speed-quickTransition` | `.1s` | micro interactions |
| `--speed-regularTransition` | `.25s` | standard |
| `--speed-slowTransition` | `.35s` | large moves |
| `--ease-in-quad` | `cubic-bezier(.55,.085,.68,.53)` | |
| `--ease-in-cubic` | `cubic-bezier(.55,.055,.675,.19)` | |
| `--ease-in-quart` | `cubic-bezier(.895,.03,.685,.22)` | |
| `--ease-in-quint` | `cubic-bezier(.755,.05,.855,.06)` | |
| `--ease-in-expo` | `cubic-bezier(.95,.05,.795,.035)` | |
| `--ease-in-circ` | `cubic-bezier(.6,.04,.98,.335)` | |
| `--ease-out-quad` | `cubic-bezier(.25,.46,.45,.94)` | most-used named ease |
| `--ease-out-cubic` | `cubic-bezier(.215,.61,.355,1)` | |
| `--ease-out-quart` | `cubic-bezier(.165,.84,.44,1)` | |
| `--ease-out-quint` | `cubic-bezier(.23,1,.32,1)` | |
| `--ease-out-expo` | `cubic-bezier(.19,1,.22,1)` | |
| `--ease-out-circ` | `cubic-bezier(.075,.82,.165,1)` | |
| `--ease-in-out-quad` | `cubic-bezier(.455,.03,.515,.955)` | |
| `--ease-in-out-cubic` | `cubic-bezier(.645,.045,.355,1)` | |
| `--ease-in-out-quart` | `cubic-bezier(.77,0,.175,1)` | |
| `--ease-in-out-quint` | `cubic-bezier(.86,0,.07,1)` | |
| `--ease-in-out-expo` | `cubic-bezier(1,0,0,1)` | |
| `--ease-in-out-circ` | `cubic-bezier(.785,.135,.15,.86)` | |

### 2.4 Semantic color contract (registered `initial` in CSS, values injected at runtime)

Registered on `:root, .sx-bh3tsk`: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`, `--color-bg-quaternary`, `--color-bg-quinary` (registered `0`), `--color-border-primary`, `--color-border-secondary`, `--color-border-tertiary`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-quaternary`, `--header-color`, `--header-height`, `--selection-bg`, `--app-active-selection-bg`, `--app-link-color`, `--app-scrollbar-bg`, `--app-scrollbar-bg-hover`, `--app-scrollbar-bg-active`, `--content-bg-color`, `--linear-find-highlight-color`, `--ai-selection-bg`.

### 2.5 Runtime dark-theme values (exact, from serialized inline styles — LCH)

| Token | Dark value (measured) | Light value | Purpose |
|---|---|---|---|
| accent / `--editor-control-primary` | `lch(47.918% 59.303 288.421)` | runtime-generated (not in capture) | Linear indigo accent (≈#5e6ad2) |
| `--editor-label-link` | `lch(57.028% 70 288.421 / 1)` (alt surface: `lch(58.717% 70 288.421 / 1)`) | runtime | link text |
| `--editor-label-title` / `--details-property-highlight-color` | `lch(100% 0 272 / 1)` | runtime | title/highlight text (white) |
| `--editor-label-muted` / `--x---icon-default-color` | `lch(61.803% 1.2 272 / 1)` (alt: `lch(63.304% 1.425 272 / 1)`, base: `lch(60.621% 1.2 272 / 1)`) | runtime | muted text/icons |
| `--editor-label-faint` / `--editor-placeholder-color` | `lch(36.975% 1.2 272 / 1)` (alt: `lch(39.452% 1.425 272 / 1)`) | runtime | faint text, placeholders |
| `--editor-bg-base` | `lch(5.52% 0.4 272)` (elevated surface: `lch(9.232% 0.85 272 / 1)`) | runtime | editor surface |
| `--editor-bg-sub` | `lch(2.595% 0.4 272 / 1)` (alt: `lch(6.307% 0.85 272 / 1)`) | runtime | recessed bg |
| `--editor-bg-shade` | `lch(7.32% 0.85 272 / 1)` (alt: `lch(11.033% 1.3 272 / 1)`) | runtime | shaded bg |
| `--editor-bg-focus` | `lch(13.62% 0.85 272 / 1)` (alt: `lch(17.332% 1.3 272 / 1)`) | runtime | focused row bg |
| `--editor-bg-border-thin` | `lch(14.16% 1.48 272 / 1)` (alt: `lch(17.873% 1.93 272 / 1)`) | runtime | hairline border |
| `--editor-border-solid` | `lch(16.32% 1.48 272 / 1)` (alt: `lch(20.032% 1.93 272 / 1)`) | runtime | solid border |
| `--editor-border-solid-hover` | `lch(20.64% 1.48 272 / 1)` (alt: `lch(24.352% 1.93 272 / 1)`) | runtime | border hover |
| `--editor-control-tertiary-hover` | `lch(14.006% 0.593 272 / 1)` (alt: `lch(17.718% 1.043 272 / 1)`) | runtime | tertiary control hover bg |
| `--editor-control-tertiary-selected` | `lch(16.706% 0.979 272 / 1)` (alt: `lch(20.418% 1.429 272 / 1)`) | runtime | tertiary control selected bg |
| `--editor-selection-bg-active` / `--editor-active-selection-background` | `lch(47.918% 59.303 288.421 / 0.4)` | runtime | text selection (accent 40%) |
| `--editor-selection-bg-inactive` | `lch(61.803% 1.2 272 / 0.2)` | runtime | inactive selection |
| `--editor-focus-shadow` | `0 0 0 1px lch(47.918% 59.303 288.421)` | runtime | editor focus ring |
| `--editor-inline-code-background` | `rgba(255,255,255,0.075)` | runtime | inline code bg |
| `--editor-inline-code-border-color` | `lch(16.32% 1.48 272 / 1)` | runtime | inline code border |
| `--editor-autocomplete-input-background/-border` | `rgba(255,255,255,0.035)` | runtime | autocomplete input |
| `--editor-red-text` | `lch(80% 80 29 / 1)` | runtime | destructive/error text |
| `--editor-diff-code-addition-30/-40` | `lch(67.2% 64.37 141.95 / 0.3)` / `/ 0.4` | runtime | diff added (green) |
| `--editor-diff-code-removal-30/-40` | `lch(65.2% 73 29 / 0.3)` / `/ 0.4` | runtime | diff removed (red) |
| `--editor-diff-addition-color` | `lch(84.572% 8.14 281.698 / 1)` | runtime | diff addition label |
| `--editor-diff-block-addition-background` | `lch(23.118% 32.905 287.859 / 1)` | runtime | diff block added bg |
| `--editor-diff-inline-addition-background` | `lch(27.971% 38.475 288.08 / 1)` | runtime | diff inline added bg |
| `--editor-diff-deletion-background` | `lch(9.456% 0.593 272.015 / 1)` | runtime | diff deleted bg |
| `--editor-comment-overlay` | `lch(21.633% 23.767 83.803 / 1)` | runtime | comment highlight (amber) |
| `--editor-comment-overlay-active` | `lch(32.568% 37.936 84.425 / 1)` | runtime | active comment highlight |
| `--image-comment-outline-color` | `lch(29.956% 34.674 84.32 / 1)` (active: `lch(38.098% 44.632 84.593 / 1)`) | runtime | image comment outline |
| `--editor-hljs-blue` | `#2482D8` | same | code syntax: keywords |
| `--editor-hljs-blue-light` | `#00C5F0` | same | code syntax |
| `--editor-hljs-green` | `#25F8CA` | same | code syntax: strings |
| `--editor-hljs-orange` | `#EB6E3D` | same | code syntax: numbers |
| `--editor-hljs-pink` | `#E394DC` | same | code syntax |
| `--editor-hljs-red` | `#EC3B40` | same | code syntax: errors |
| `--editor-hljs-yellow` | `#FCE27D` | same | code syntax |
| `--row-keyboard-border` | `lch(19.701% 19.952 286.445 / 1)` | runtime | keyboard-focused row ring |
| `--row-applied-bg` | `lch(9.345% 0.85 272 / 1)` (or `transparent`) | runtime | selected/hover row bg |
| `--details-property-hover-background` | `lch(17.718% 1.043 272 / 1)` | runtime | sidebar property hover |
| `--activity-history-highlight-color` | `lch(90.451% 1.2 272 / 1)` | runtime | activity highlight |
| `--editor-todo-checked-opacity` | `0.65` | same | done todo dimming |
| `--editor-callout-bg-mix` / `--editor-callout-border-mix` | `2%` / `20%` | same | callout tint strengths |
| callout default accent | `#26b5ce` (`--callout-accent: var(--callout-color,#26b5ce)`) | same | callout fallback color |

Pattern worth noting: dark-theme surfaces step in LCH lightness ≈ `2.595 → 5.52 → 7.32 → 9.232 → 11.033 → 13.62 → 14.16 → 16.32 → 20.64` with hue fixed at 272 (blue-grey) and tiny chroma (0.4–1.93); the accent sits at hue 288.4.

### 2.6 The `--sx-*` slot decoder (hash → semantic role, derived from 43 alias assignments in CSS)

| Slot | Decoded role (evidence: semantic tokens that alias to it) |
|---|---|
| `--sx-3zwjav` | **label-base** (default text) — aliased by `--editor-text-color`, `--dp-label-base`, `--overview-property-label-color`, 14 more |
| `--sx-ys2i3t` | **label-title** (emphasis/highlight text) — `--dp-label-title`, `--changelog-label-title`, `--badge-highlight-color`… |
| `--sx-1dd5bcf` | **label-muted** — `--dp-label-muted`, `--icon-default-color`… |
| `--sx-1eapsa9` | **label-faint** — `--dp-label-faint`, `--editor-faint-placeholder-color`… |
| `--sx-1bu05id` | accent-ish text (mixed 25% into editor text) |
| `--sx-1ubxoo9` | **bg-base** (surface) — `--editor-surface-background`, `--timeline-bar-background-color`… |
| `--sx-1m4y240` | **bg-sub** (`--changelog-bg-sub`) |
| `--sx-1gm0lru` | **bg-shade** (`--pull-request-comment-prompt-bg-shade`) |
| `--sx-1gxylln` | translucent panel bg (comment actions bg; hover mixes) |
| `--sx-142jeir` | **bg-border** (`--dp-bg-border`, `--changelog-bg-border`) |
| `--sx-d29rh7` | **bg-border-faint** |
| `--sx-1jmjcvw`, `--sx-1ikf7kw`, `--sx-1o1lnwn`, `--sx-w1p5jj` | border tiers used in `--btn-overlay-shadow` ring stacks |
| `--sx-n8xqcl` | **control-primary** (accent) — `--dp-control-primary`; used in attention pulses |
| `--sx-1jffjrl` | **control-primary-hover** |
| `--sx-629164` | **control-tertiary-hover** (hover bg for tertiary/ghost controls) |
| `--sx-ljw4h1` | **control-tertiary-selected** |
| `--sx-13kjjc4`, `--sx-17ckey5`, `--sx-1ccqs4f`, `--sx-1dcvabv`, `--sx-1gcjx5j`, `--sx-hfmm6c` | button highlight-bg variants |
| `--sx-ch85qk` | **focus/outline color** — `--focus-ring-color` and all media selection outlines |
| `--sx-1ele6il` | **thin-pixel** (hairline; 1px/0.5px) — all `*-thin-pixel` aliases |
| `--sx-1dhg814` | **shadow-medium** (`--changelog-shadow-medium`) |
| `--sx-10lzhmx` | **shadow-low** (paired into button overlay shadows) |
| `--sx-1gakdvt` | bg-selected (date pickers) |
| `--sx-cx2ark` | quaternary control bg (filter buttons) |
| `--sx-1xaoi8i` | link color (changelog/CMS links) |
| `--sx-ickszr` | control-label |
| `--sx-91u3ar`, `--sx-1h56kua`, `--sx-ciqj87` | icon state colors |
| `--sx-8q2ft0` | header-height constant (fallback of `var(--header-height, var(--sx-8q2ft0))`) |
| `--sx-11lpf43` | editor base font-size slot |
| `--sx-1q6smeb` / `--sx-7ide1` | relation-arrow colors |

### 2.7 Editor typography tokens (`.editor` scope — exact)

| Token | Value |
|---|---|
| `--editor-font-size` | `var(--font-size-regular)` (variants: .75/.8125/.9375/1.125/1.25/1.5rem) |
| `--editor-font-weight` | `var(--font-weight-normal)` (450) |
| `--editor-line-height` | `1.6` (variants 1.2, 1.4, 1.4375rem, 1.5, 1.625, 20px, 22px, `calc(1 + 1/3)`) |
| `--editor-letter-spacing` | `-.00666667em` |
| `--editor-h1-font-size` / line-height | `1.375rem` / `1.85rem` |
| `--editor-h2-font-size` / line-height | `1.1875rem` / `1.75rem` |
| `--editor-h3-font-size` / line-height | `1.0625rem` / `1.5rem` |
| `--editor-h4-font-size` / line-height | `.9375rem` / `1.5rem` |
| `--editor-h5/h6-font-size` / line-height | `.875rem` / `1.5rem` |
| h1 letter-spacing `-.004375rem`; h2 `+.003125rem`; h3 `+.00625rem` | |
| `--editor-block-spacing` | `1rem` (variants `.75rem`, `.8rem`); `-large: calc(1.375×)`, `-small: calc(.375×)` |
| `--editor-block-radius` | `6px` |
| `--editor-block-menu-offset` | `28px` (variants 0/13px); `--editor-block-menu-size: 20px` |
| `--editor-list-inset` | `1.5rem`; bullet disc `.5em`/`.5em` |
| `--editor-safe-area` | `16px`; `--editor-todolist-checkbox-width: 14px` |
| `--code-block-line-height` | `1.4`; code inline `font-size:.9375em; line-height:1.3` |
| `--table-controls-size` | `18px`; `--editor-last-invisible-paragraph-spacing: 10px` |

### 2.8 Layout/spacing tokens (exact)

| Token | Value | Purpose |
|---|---|---|
| `--sidebar-width` | `244px` | app sidebar |
| `--header-height` | runtime (`var(--header-height, var(--sx-8q2ft0))` fallback pattern) | content header |
| `--agent-toolbar-height` | `28px` runtime (0 at boot / mobile ≤1023px) | |
| `--scrollbar-width` | `12px` (0 with overlay scrollbars); `--scrollbar-min-size: 32px` | |
| `--settings-list-view-item-min-height` | `60px` (compact 24px) | settings rows |
| `--settings-list-view-item-padding-x/y` | `16px` / `12px` (variants 0/8/16) | |
| `--settings-list-view-item-radius` | `10px`; box-spacing `12px`; item-gap `12px` (8px variant); border-padding `16px`; single-group header `48px`/`60px` | |
| `--action-trigger-min-width` | `32px` (small 24px) | icon buttons |
| `--column-width` | `24px` | (timeline/board gutter) |
| `--indent-current` | `19px` | tree/list indent step |
| `--overview-form-margin-top` | `64px`; `--overview-subheader-top-position: 12px` | |
| `--line-number-width` | `50px` | diff view |
| `--comment-actions-width` | `0 / 58px / 90px`; padding-left `50px`; `--comment-border-radius: 8px` | comment hover actions |
| `--focus-ring-width` | `1px` | |
| `--agent-panel-chat-max-width` | `80ch` | agent chat measure |
| `--fuzzy-date-picker-month-horizontal-spacing` | `.96rem` (variants .8/.82/.96/.98/1.05rem) | |
| App frame (`#appBorders`) | `margin:8px; margin-left:var(--sidebar-width); border-radius:12px; border:1px solid var(--bg-border-color)` (0.5px @2x); electron `margin-top:40px` | main content card |

### 2.9 Radius scale (as used)

`1px, 2px, 3px, 4px (--control-border-radius default), 5px, 6px (--editor-block-radius, pre blocks), 7px, 8px (rows, comments, toasts), 10px (settings cards), 12px (app frame, large cards), 50%, 999px/9999px (--radius-rounded pill)`. Hairline `.5px` radius exists for sub-pixel borders.

### 2.10 Z-index layers

App CSS uses small numbers scoped per stacking context: `-1, 0, 1, 2, 3, 10, 11, 30, 31, 90, 95, 96, 98, 99` — then jumps for globals: `500, 550, 600` (overlay layers), `1300` (image-zoom modal), `99999` (loading), `999999999` (sonner toaster). Isolation is achieved with `isolation:isolate` + `contain:layout style` on rows rather than large z-indexes.

---

## 3. Animation system

### 3.1 Named app keyframes (full definitions)

```css
@keyframes fadeIn{0%{opacity:0}100%{opacity:1}}
@keyframes suspenseFadeIn{0%{opacity:0}to{opacity:1}}          /* used: animation:80ms suspenseFadeIn */
@keyframes bootstrapFadeIn{0%{opacity:0}}                       /* used: .2s ease-out */
@keyframes logoBackgroundPulse{0%{opacity:0;transform:scale(.8)}70%{opacity:1}100%{opacity:0;transform:scale(1)}} /* 3.2s ease-out 1.2s forwards infinite */
@keyframes tableDropIndicatorFadeIn{0%{opacity:0}to{opacity:1}} /* .15s ease-in forwards */
@keyframes columnResizeHandleFadeIn{0%,50%{opacity:0}to{opacity:1}}
@keyframes editor-collab-cursor-fade-out{0%{opacity:1}to{opacity:0;scale:.75}} /* .4s cubic-bezier(1,0,1,1) 6s both */
@keyframes editor-diff-code-addition-color-change{0%{background-color:#0000}70%{background-color:var(--editor-diff-code-addition-40)}to{background-color:var(--editor-diff-code-addition-30)}} /* .4s ease-out .3s forwards */
@keyframes editor-diff-code-removal-color-change{...same with removal vars}
@keyframes _ProseMirror-cursor-blink_r72r4_1{to{visibility:hidden}}
@keyframes _blink_r72r4_1{0%,49%{border-color:currentColor}50%,to{border-color:#0000}} /* 1s infinite */
@keyframes _mdStreamFadeIn_1cl3b_1{0%{opacity:0}to{opacity:1}} /* var(--md-stream-duration,.5s) ease-in */
@keyframes gli-sprite{/* 20-step sprite walk: translate(0,0)↔translate(-100%) at 5% increments */} /* grid loader, steps(5..14,end) per variant */
```

### 3.2 Atomic (`sx-*-B`) keyframes — the app's real enter/exit vocabulary (87 total, key ones)

```css
/* enter: fade */        sx-18re5ia-B / sx-ekv6nw-B { from{opacity:0} to{opacity:1} }
/* enter: fade+rise 4px */ sx-14o8evg-B {0%{opacity:0;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}
/* enter: fade+rise 6px */ sx-1bzi508-B (6px→0)
/* enter: fade+drop 2px */ sx-hw0koq-B (-2px→0)
/* enter: fade+drop 10px */ sx-16zpbq4-B {0%{opacity:0;transform:translate3d(0,-10px,0)}100%{opacity:1;transform:none}}
/* enter: fade+drop 10px, ease-out-quad baked in */ sx-64g5cz-B {0%{opacity:0;animation-timing-function:cubic-bezier(.25,.46,.45,.94);transform:translate(0,-10px)}100%{opacity:1;transform:none}}
/* enter: pop from 0 */   sx-1xkg3e2-B {0%{opacity:0;transform:scale(0)}100%{opacity:1;transform:scale(1)}}
/* enter: pop from .5 */  sx-1d7lkfv-B {0%{opacity:0;scale:.5}100%{opacity:1;scale:1}}
/* enter: zoom-settle */  sx-1gbvcor-B {from{opacity:0;transform:scale(1.3)}to{opacity:1;transform:none}}
/* exit: fade */          sx-1jn504y-B / sx-17qceat-B {from{opacity:1}to{opacity:0}}
/* exit: fly up */        sx-c32zlq-B {from{opacity:1;transform:translateY(5px)}to{opacity:0;transform:translateY(-10px)}}
/* exit: shrink out */    sx-19sgl0g-B {0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(0)}}
/* attention ring pulse */ sx-1or9wxq-B {0%{outline-color:#0000}5%{outline-color:color-mix(in srgb,var(--sx-ch85qk) 80%,transparent)}100%{outline-color:#0000}}
/* highlight ring on/off */ sx-g96b9t-B / sx-1vwed9j-B {0 0 0 1px var(--sx-n8xqcl) ⇄ transparent}
/* row flash inset */     sx-gj1xan-B {0%{box-shadow:0 0 0 400px var(--sx-1gxylln) inset}100%{box-shadow:inset 0 0 0 400px #0000}}
/* skeleton shimmer */    sx-11lpqvw-B {0%{background-position:150% 0}100%{background-position:-50% 0}} (+ sx-8lg6pe-B 180%→-80%, sx-9xrbjn-B 300%→0%)
/* shimmer sweep */       sx-1bebwva-B {0%{translateX(-100%)}75%,100%{translateX(100%)}}
/* accordion */           sx-g2jgno-B {from{grid-template-rows:0fr}to{grid-template-rows:1fr}}
/* breathing border */    sx-er2r9a-B {0%/100%{border-color:var(--sx-1o1lnwn)}50%{border-color:var(--sx-35jz1e)}}
/* AI glow pulse */       sx-m5yuet-B {0%{opacity:0;filter:drop-shadow(0 0 #fff0);cubic-bezier(.25,1,.5,1)}32%{opacity:1;filter:drop-shadow(0 0 14px #ffffffd9);scale:1.28}100%{scale:1}}
/* stream-in dot */       sx-106jir2-B {0%{opacity:0;translate(var(--tx),var(--ty)) scale(.6);cubic-bezier(.33,0,.4,1)}28%{peak}50%{trough .985}67%{peak2}100%{opacity:.224}}
/* marquee */             sx-1ofc7ps-B/sx-1loahri-B translateX(0)⇄(-50%); sx-1kj6s1i-B to{translateX(calc(-50% - 4px))}
/* random flicker */      sx-14brpeo-B (21 random opacity stops .08–.92)
```

### 3.3 Toast (Sonner) animations

```css
@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}  /* .3s ease forwards */
@keyframes sonner-fade-out{0%{opacity:1;...}...}                                                /* .2s ease forwards */
@keyframes sonner-spin{...}                                                                     /* 1.2s linear infinite */
@keyframes swipe-out-left/right/up/down{from{transform:var(--y) translate(var(--swipe-amount));opacity:1}to{...±100%;opacity:0}}
[data-sonner-toast]{transition:transform .4s,opacity .4s,height .4s,box-shadow .2s}
[data-sonner-toaster]{transition:transform .4s ease}
```

### 3.4 Transition conventions (exhaustive pattern census)

- **Standard durations:** `50ms`, `80ms`, `.1s`, `.12s`, `.125s`, `.14s`, `.15s` (the workhorse), `.18s`, `.2s`, `.22s`, `.25s`, `.3s`, `.35s`, `.4s`, `.45s`, `.5s`.
- **The hover idiom** (used app-wide): `transition-duration: var(--speed-highlightFadeOut) (.15s)` at rest; `:hover/:active` sets `transition-duration: var(--speed-highlightFadeIn) (0s)` → instant highlight in, 150 ms fade out.
- **Non-token beziers used in transitions:** `cubic-bezier(.43,.07,.59,.94)` (sidebar width .22s), `cubic-bezier(.16,1,.3,1)` (min-height .18s), `cubic-bezier(.45,0,.55,1)` (app frame margins .45s), `cubic-bezier(.38,.01,.33,1)`, `cubic-bezier(0,.5,1,1)` (color .1s), `cubic-bezier(.25,.46,.45,.94)` (= ease-out-quad, .15s/.25s "all").
- Representative exact rules: `transition: background-color 80ms ease-out, color 80ms ease-out`; `transition: opacity 80ms ease-out`; `transition: border-color .15s ease-in-out, border-radius .2s, width .125s ease-out`; `transition: width .15s ease-out, margin .15s ease-out, opacity .15s ease-out`; `transition: top 9999s ease-in-out, opacity .2s ease-in-out` (autofill parking trick); list rows: `transition-property: box-shadow, background-color; transition-duration: .15s, 0s`.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` sets `transition: none` per-component and disables `::view-transition-old/new(*)` animations. View Transitions API is used (`::view-transition-*`).

---

## 4. Type scale in use (measured combos → context)

| Context | font-size | line-height | weight | letter-spacing |
|---|---|---|---|---|
| Body default (`body`) | inherit (15px base) | `1.5` | 450 | — |
| Paragraph (`p`) | `var(--font-size-regular)` (15px) | `1.7` | — | — |
| Headings base (`h1–h6`) | 2em/1.5em/1.25em/1em/.875em/.75em | `1.25` | `--font-weight-medium` (500) | — |
| Editor body | 15px | 1.6 | 450 | `-.00666667em` |
| Editor h1 | 22px | 29.6px | — | `-.004375rem` |
| Editor h2 | 19px | 28px | — | `+.003125rem` |
| Editor h3 | 17px | 24px | — | `+.00625rem` |
| Editor h4 | 15px | 24px | — | — |
| Editor h5/h6 | 14px | 24px | — | — |
| Release dialog h1 | `--font-size-title3` (20px) | normal | 500 | `-.01rem` |
| Release dialog h2/h3 | `--font-size-regularPlus` (15px) | `1.4375rem` | 600 | — |
| Release notes body | `--font-size-small` (13px) | `20px` | 450 | — |
| Small text / controls | 13px (`--font-size-small`) | 1.5 or 20px | 450–500 | — |
| Mini (badges, pickers) | 12px (`--font-size-mini(Plus)`) | normal | 450 | — |
| Micro | 11px (`--font-size-micro`) | — | — | — |
| Titles | 36/24/20px (title1/2/3) | — | 500 | negative ls at large sizes |
| Code inline | `.9375em` | 1.3 | — | — |
| Code block | `.875em` | 1.4 | — | — |
| Toast (sonner) | 13px | 1.4 (desc) | 400 desc / 500 button | — |
| Loading screen | 13px | normal | 500 | — |
| Error title / desc | 20px/28px 500 · 14px/22px 450 | | | |
| Big emoji block | `32px !important` / `32px` | | | |
| Utility sizes seen in sx atoms | 6, 7, 10, 11, 12, 13, 15, 20px; .625rem, 1.125rem, 1.25rem, 1.5rem, 2.25rem | | | |

Bold in running text = `--font-weight-semibold` (600); `strong,b{font-weight:var(--font-weight-semibold)}`.

---

## 5. Component style signatures

### 5.1 Buttons
- Icon slots: `._iconSmall_ekx18` = **14×14px**, `._iconNormal_ekx18` = **16×16px** (applies to the svg and first-child svg alike). `._iconContent_` = auto-size.
- State model is variable-driven: `--btn-highlight-bg` (rest: `transparent`) and `--btn-highlight-color` (rest: `inherit`) flip on `[data-menu-open=true]`, `:active`, `[data-active=true]`, and hover under `@media (any-hover:hover) and (any-pointer:fine)`.
- Hover bg recipes (exact): `color-mix(in lch, var(--sx-1gxylln), var(--sx-3zwjav) 10%)` (solid), `5%` (subtle), or flat slots (`--sx-629164` tertiary-hover, `--sx-ljw4h1` tertiary-selected, `--sx-13kjjc4`…).
- Border is drawn as a **ring shadow overlay**, not border: `--btn-overlay-shadow: 0 0 0 var(--sx-1ele6il) var(--sx-1jmjcvw), 0 0 0 0 transparent` with hover swapping the ring color and optionally adding `var(--sx-10lzhmx)` (low shadow). Applied via `::after { box-shadow: var(--btn-overlay-shadow) }`.
- Button groups: dividers via `--btn-group-divider-width: 1px` and `--btn-group-divider-color: transparent → color-mix(in srgb, var(--sx-1jmjcvw) 50%, transparent)` on hover/menu-open.
- Detail buttons (issue sidebar): svg margin-right 6px, hover bg `--detail-button-control-tertiary-hover`, active/selected `--detail-button-control-tertiary-selected`, `svg{max-width:14px;max-height:14px}`.
- Heights come from atomic classes/inline vars; the common control heights measured in markup: **24 / 28 / 32px** (`--x-height: 28px` most frequent; `--action-trigger-min-width: 32px`, small `24px`), radius `--x-borderRadius: 4px`.

### 5.2 Inputs
- No chrome in compiled CSS (all sx atoms + runtime vars) except: LastPass suppression `._hideLastPass_801jb_3+[data-lastpass-icon-root]{display:none}`; focus selection `input:focus::selection{background:var(--app-active-selection-bg)}`; editor-autocomplete input bg/border `rgba(255,255,255,0.035)` dark.
- Focus treatment: global `:focus-visible{outline:var(--focus-ring-outline)}` = `1px solid var(--sx-ch85qk)`; inputs additionally use `border-color: var(--focus-ring-color)` and `outline: 2px solid var(--focus-ring-color)` variants; insets via `outline-offset: calc(-1 * var(--focus-ring-width))`.

### 5.3 Tooltips
- Trigger: `._tooltipTriggerContent_1et26_1>button[disabled]{pointer-events:none}`.
- Rich tooltip body (`._tooltipBody_1kmbu_1`): paragraphs margin 0 (+6px between blocks), lists `padding-left:18px`, `code.inline{background:var(--pull-request-comment-prompt-bg-shade);border-radius:4px;padding:1px 3px}`, `pre{border-radius:6px;padding:6px 8px}`, `blockquote{border-left:2px solid …bg-border; padding-left:8px}`. Surface bg/shadow/radius are runtime sx atoms (enter = fade/translate keyframes above, typ. `sx-hw0koq-B` -2px drop, 80ms–150ms).

### 5.4 Popovers / menus
- Positioner: Popper + Radix (`--popper-max-height`, `--radix-select-content-available-height`, `min-width: var(--radix-select-trigger-width)`, `[data-popper-reference-hidden]{pointer-events:none;opacity:0!important}`).
- Menu open state is data-attribute driven everywhere: `[data-menu-open=true]`.
- Surface effects available: `backdrop-filter: blur(30px) saturate(180%)` (heavy glass), `saturate(1.8) blur(20px)`, `blur(12px) saturate(180%)`, `blur(4px)`, `blur(2px)`, `saturate(.55) blur(4px)` (disabled overlay).
- Scroll affordances (SimpleActionMenu): scroll-driven animations — `scroll-timeline-name:--scroll-affordance`, `animation-range: 0 24px` (top) / `calc(100% - 24px) 100%` (bottom) under `@supports (animation-timeline:auto)`.

### 5.5 Modals / dialogs
- Backdrop is a **container** (`container-name: modal-backdrop`); dialog layout adapts via `@container modal-backdrop (width < 1024px)`. Alert dialog rows: `.lin-alert-dialog-content-row`; content rhythm `._content_1rly6_8 p{margin:12px 0}`.
- Image-zoom modal (react-medium-image-zoom): `[data-rmiz-modal]::backdrop`, overlay transitions, `z-index:1300`.
- Radius/size/shadow are runtime atoms; the shadow slots are `--sx-1dhg814` (medium) / `--sx-10lzhmx` (low); one measured heavy shadow: `0 8px 20px color-mix(in srgb, var(--sx-1ubxoo9) 80%, transparent)`.

### 5.6 Toasts (Sonner, exact)
- `[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}`
- Theme values: light `--normal-bg:#fff; --normal-border:hsl(0 0% 93%); --normal-text:hsl(0 0% 9%)`; dark `--normal-bg:#000; --normal-bg-hover:hsl(0 0% 12%); --normal-border:hsl(0 0% 20%); --normal-border-hover:hsl(0 0% 25%); --normal-text:hsl(0 0% 99%)`.
- Semantic: success `hsl(143 85% 96%)/hsl(145 92% 87%)/hsl(140 100% 27%)` light, `hsl(150 100% 6%)/hsl(147 100% 12%)/hsl(150 86% 65%)` dark; error `hsl(359 100% 97%)/hsl(359 100% 94%)/hsl(360 100% 45%)` light, `hsl(358 76% 10%)/hsl(357 89% 16%)/hsl(358 100% 81%)` dark; warning `hsl(49 100% 97%)/hsl(49 91% 84%)/hsl(31 92% 45%)` light, `hsl(64 100% 6%)/hsl(60 100% 9%)/hsl(46 87% 65%)` dark; info `hsl(208 100% 97%)/hsl(221 91% 93%)/hsl(210 92% 45%)` light, `hsl(215 100% 6%)/hsl(223 43% 17%)/hsl(216 87% 65%)` dark.
- Toaster: `z-index:999999999`, stacking via `--lift/--gap/--toasts-before`, description 400/1.4 `#3f3f3f`, action button 12px/500.

### 5.7 Avatars
- `._avatar_12slg_4 svg, img {width:100%;height:100%}` — square, size set per-instance via runtime vars. Measured sizes in markup: **16, 18, 22, 24, 28, 32, 44px** (`--x-width`). Icon-list rows fade fills with `transition-duration: var(--speed-highlightFadeOut)` + `--icon-transition-delay`.

### 5.8 Badges / labels
- `._badgeRoot_10u6g_1` inherits transition; text flips to `color:var(--badge-highlight-color)` (= `--sx-ys2i3t`, label-title) on hover/active/menu-open. Badge icons capped `max-width/height:14px !important`. Pill shape via `--radius-rounded: 9999px`.

### 5.9 kbd / shortcut chips (md-preview variant — exact)
```css
.md-preview-kbd{font-family:var(--mdp-font-mono);vertical-align:middle;
  background-color:var(--mdp-bg-sub);border:var(--mdp-thin) solid var(--mdp-border-thin);
  border-bottom-width:2px;border-radius:4px;padding:1px 5px;line-height:1.4;
  display:inline-block;font-size:.75em}
```
(App shortcut chips are sx-atomic: mono font, bg-sub fill, 1px hairline border with 2px bottom, 4px radius.)

### 5.10 Scrollbars (exact, gated on `body.layoutScrollbarObtrusive`)
```css
--scrollbar-width:12px; --scrollbar-min-size:32px; --scrollbar-color:var(--app-scrollbar-bg);
::-webkit-scrollbar{width/height:var(--scrollbar-width)}
::-webkit-scrollbar-track{background:0 0}
::-webkit-scrollbar-thumb{background-color:var(--scrollbar-color);border-radius:var(--scrollbar-width);
  background-clip:content-box;border:3px solid #0000}      /* 3px transparent inset gutter */
::-webkit-scrollbar-thumb:hover{--scrollbar-color:var(--app-scrollbar-bg-hover)}
::-webkit-scrollbar-thumb:active{--scrollbar-color:var(--app-scrollbar-bg-active)}
::-webkit-scrollbar-corner{background:var(--color-bg-primary)}
/* Firefox */ scrollbar-width:thin; scrollbar-color:var(--scrollbar-color) transparent;
```

### 5.11 Focus ring
`:root, .sx-10sn7k { --focus-ring-width:1px; --focus-ring-color:var(--sx-ch85qk); --focus-ring-outline:var(--focus-ring-width) solid var(--focus-ring-color) }` + global `:focus-visible{outline:var(--focus-ring-outline)}`. Emphatic variant `outline:2px solid var(--focus-ring-color)`; inset variants use negative `outline-offset`. Attention pulse: keyframe `sx-1or9wxq-B` (accent at 80% for 5% of timeline, 0 by end).

### 5.12 List rows / selection (ListCell — exact)
- Rows: `border-radius:8px; isolation:isolate; will-change:transform; contain:layout style;` background painted on `::before` inset `0 8px` (full-bleed hover with 8px horizontal inset; `inset:0` in embedded grids).
- Selected bg: `[data-apply-background=true]::before{background-color:var(--row-applied-bg,transparent)}` (dark measured `lch(9.345% 0.85 272 / 1)`).
- Keyboard cursor: `[data-keyboard-active=true]::before{box-shadow:0 0 0 1px var(--row-keyboard-border) inset}` (dark `lch(19.701% 19.952 286.445 / 1)` — desaturated accent).
- Multi-select runs merge: selected rows zero out adjoining corner radii unless first/last in selection/group. Grid mode uses `grid-template-columns:subgrid; grid-column:1/-1`.
- Row transition: `transition-property:box-shadow,background-color; transition-duration:.15s,0s`.
- Text selection: `body::selection{background:var(--selection-bg)}`; body is `user-select:none; cursor:default`.

### 5.13 Cursor policy
`:root { --pointer: default }` — buttons/links/selects get `cursor: var(--pointer)` = **default arrow, not pointer**. Only true external links get `cursor:pointer` (`a[href*="//"]:not([href*=linear.app])…`, `[target=_blank]`, `mailto:`). Zoom cursors tokenized: `--zoom-in/--zoom-out`.

---

## 6. Layout primitives

- **App shell:** `html,body{position:fixed}`, `html,body,#root{overflow:hidden}`. Content = `#appBorders` card: `border:1px solid var(--bg-border-color); background:var(--bg-base-color); border-radius:12px; margin:8px 8px calc(8px + var(--agent-toolbar-height)) var(--sidebar-width)`; hairline 0.5px on retina; electron adds 40px top (traffic lights); logged-out/error collapses to `margin:-1px; --sidebar-width:-1px`. Frame animates margins `.45s cubic-bezier(.45,0,.55,1)`.
- **Sidebar:** `--sidebar-width: 244px`; resize affordances from `useVerticalResizer` chunk; sidebar width transition `.22s cubic-bezier(.43,.07,.59,.94)`.
- **Header:** `height: var(--header-height, var(--sx-8q2ft0))`, sticky offsets `calc(2*var(--header-height) + 12px)`; header tabs flex contract `--content-view-header-tabs-flex: 1 1 300px`, min-width 300px (0 under 640px).
- **Rows:** virtualized; visual density from runtime vars (`--x-minHeight: 48px` measured on large rows, settings rows 60px min, compact 24px). Row radius 8px, hover inset 8px.
- **Container queries** (14 named containers): `modal-backdrop`, `issue-page-layout`, `issue-view-container`, `agent-session-container`, `linear-agent-container`, `update-layout-container`, `embedded-list-row`, `initiative-title-container`, `project-title-container`, `pr-split-view-header`, `prCell`, `nodeContainer`, `searchPropertiesRow`, `video-player`; plus anonymous `(width <= 480px)` queries.
- **Breakpoints in media queries:** 420px, 640px, 1023/1024px.
- Board column width: not in compiled CSS (set at runtime via inline vars).

---

## 7. Icon conventions

- **Fill-based, not stroke.** All state styling targets `fill`: `svg{fill:var(--icon-replacement-color)}`, `fill:currentColor` for inheriting icons. Only loaders/spinners animate `stroke-dashoffset`.
- Cascade contract: `--icon-color → var(--icon-replacement-color, var(--icon-default-color))`; ~60 rules re-point `--icon-replacement-color` per state (hover/active/menu-open/focus-visible), typically to label-base (`--sx-3zwjav`) or label-title (`--sx-ys2i3t`).
- Measured default icon color (dark): `lch(60.621% 1.2 272 / 1)`; sizes: **14px** (small/inline/badges), **16px** (normal/row actions `max-width:16px`), 18px table controls, 20px block menu. Emoji rendered at 14px in icon slots.
- Icon fills transition with the highlight idiom (`fill .15s`, instant on hover-in).

---

## 8. Overlay / portal / print

- Portal root: `#portalLayoutRoot` (sibling of app content; excluded from print). Skip-nav `#skip-nav`.
- Overlay layers use `z-index: 500/550/600`; loading screen `99999`; toasts `999999999`; image zoom `1300`.
- Backdrop styles: see §5.4 blur/saturate list; dim overlays via runtime bg + `backdrop-filter`.
- `@media print`: everything `visibility:hidden` except `.section-to-print` subtree; positions reset to static.
- Draggable window regions (electron): `-webkit-app-region:drag` via `._draggableRegion*` with `html.electron-disable-drag` escape hatch.

---

## 9. CSS organization → pipeline implications

Five coexisting class systems (in specificity order via `@layer`):

1. **`@layer reset`** — classic global reset (box-sizing, margin zeroing).
2. **`@layer base`** — element defaults, fonts, tokens (`:root` typography/speed/easing), `@font-face`.
3. **`@layer app.base`** — app-wide element styling (links, scrollbars, selection, print).
4. **CSS Modules** — `._localName_hash_line` (254 classes) from Vite (`Button-DO5Nz3Sh.css` etc.), used for component-structural rules.
5. **`sx` atomic engine** — `@layer priority1 … priority12` (12 priority sublayers) containing 6,319 hashed single-purpose classes (`.sx-1an34y { --btn-highlight-bg: … }`), 241 empty-registered `--sx-*` theme slots (`--sx-xyz: ;` space-toggle style), 181 `@property`-registered `--x-*` dynamic props (`syntax:"*"; inherits:false`) fed by inline styles (`--x-backgroundColor`, `--x-height: 28px`, `--x---btn-highlight-bg: lch(...)`), and `sx-*-B` hashed keyframes. `.sc2sx-ComponentName-hash` classes (15) mark a **styled-components → sx migration** ("sc2sx"). Composite selectors like `.sx-7m057n:where(.sx--default-marker:active *)` implement variant/parent-state APIs with flattened specificity.

Implications: an in-house compile-time atomic CSS-in-JS framework (StyleX-like, layers instead of specificity wars), theme values fully runtime-computed in LCH (arbitrary custom themes from a base color + contrast, not two static palettes), dynamic values passed exclusively through typed custom properties on `style=""`, state via data-attributes (`data-menu-open`, `data-active`, `data-selected`, `data-keyboard-active`), hover always gated behind `@media (any-hover:hover) and (any-pointer:fine)`. Modern CSS relied on: cascade layers, `color-mix` (lch/srgb/oklch), `@property`, container queries (named), scroll-driven animations, `subgrid`, `:has()`, `interpolate-size:allow-keywords`, View Transitions.

---

## 10. Capture limitations (honest)

All 7 captures are dark-theme; light-theme runtime LCH values and the values of the 241 `--sx-*` slots + `--color-*`/`--app-*` semantic tokens live in a JS-constructed stylesheet (CSSOM) that the HTML serializer did not emit. What IS exact here: every token name and registration, the full boot light/dark palette, all dark runtime values that landed in inline styles, and 100% of the structural/animation/typography CSS.
