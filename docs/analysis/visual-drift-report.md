# Visual Drift Report — implementation vs. forensic captures

**Generated:** 2026-08-25 · **Viewport:** 1914×992, dark theme, `deviceScaleFactor: 1`
**Method:** both sides rendered in headless Chrome and measured with `getComputedStyle` + `getBoundingClientRect`.

- **Reference side:** the raw captures (`captures/<name>/<name>/index.html` + `styles.css`) loaded from `file://` with all network requests blocked, so the real compiled Linear CSS resolved against the real serialized DOM. This is stronger evidence than the prose reports — every number below is a *rendered* value, not a transcribed one.
- **My side:** `http://localhost:3001` on `/synquic-labs/projects/all`, `/team/TRENDZO/all`, `/issue/TRENDZO-37/research-work`, `/agent`, `/settings/account/preferences`.

### Two measurement artifacts you must know about before reading the tables

1. **`--sx-1ele6il` (the hairline token) is a runtime-injected empty slot.** Offline it resolves to nothing, so `border-width: var(--sx-1ele6il)` computes as `medium` = **3px** in the capture render. Everywhere the capture shows `3px` borders, the real value is **1px** (`0.5px` @2x). All numbers in this report are already corrected for this.
2. **`--sx-*` colour slots resolve to nothing offline**, so many capture colours read as `rgb(255,255,255)`. Colour comparisons below therefore use the *token identity* (`--sx-1dd5bcf` = label-muted, etc., decoded in `design-system.md` §2.6) plus the LCH values that survived in inline styles — not the offline computed colour.
3. Same reason: the capture's `<main>` card measured `margin-top: 0` because `--sx-8q2yyj` is empty. `#appBorders` in the static CSS proves the real value is `8px` (`margin: 8px; margin-left: var(--sidebar-width); margin-bottom: calc(8px + var(--agent-toolbar-height))`). My card already matches; no drift there.

**Total DRIFT items found: 71** (48 geometry/alignment, 9 typography, 6 colour/token, 8 icon-system — icon glyph defects counted separately in §C as 24 more).

> ⚠️ Five agents were editing this tree concurrently during the audit. **Line numbers in §E were read at 2026-08-25 11:55 and may have shifted.** Every fix is anchored on `file › selector › property` — match on the selector, not the line number.
>
> Specifically: `src/components/shell/sidebar.module.css` was last written at **11:51:42** (my measurements at 11:53 reflect that state) and `src/components/icons/Sprites.tsx` at **11:38:24** (the icon audit ran 11:36–11:48, so a small number of §C findings may already be fixed). Re-verify the §C rows against the current `Sprites.tsx` before editing. Everything in §A, §B and §D was measured from the running app at 11:53 and is current as of that timestamp.

---

## A. Executive summary — the 15 highest-impact drifts

Ordered by how much they distort the page at a glance.

| # | Surface | Drift | Captured | Mine | Δ |
|---|---|---|---|---|---|
| **1** | Content header, all list pages | **The tab/filter row is a second full-height header band, not a 28px strip.** | band 2 `min-height: 57px`, no bottom padding | `height 28px` + `padding-bottom: 6px` = 34px | **−23px**; the whole list below is 23px too high |
| **2** | Content header | **The divider sits under the TITLE row, not under the whole header.** Capture: title band carries `border-bottom`; tabs band has none. Mine: `<header>` carries one border, so the line lands under the tabs. | divider at +59px from card top | divider at +93px | line in the wrong place + no separation between title and tabs |
| **3** | Projects header | **"New project" is left-aligned next to the title; it belongs at the far right.** Capture title band is `justify-content: space-between` with the primary action in the right cluster. | button x = card-inner **+1534** (right edge −8px) | x = card-inner **+67** | **+1467px** — reads as a completely different header |
| **4** | Content header, all pages | **Title/breadcrumb starts 8px too far left.** Capture = 8px band padding + 10px title-cluster padding = **+18**; mine = a single 10px. | h2 at card-inner **+18px** | +10px | **−8px** on every page except `/agent` (which is coincidentally right) |
| **5** | Sidebar | **Every nav row is 13px too low.** Capture's scroll area nets `26px padding-top − 13px` from the sticky scroll-fade element (`height:26px; margin-top:-39px`); mine applies the 26px with no negative offset. | first nav link top **y=66** | y=79 | **+13px**, cascading down the entire sidebar |
| **6** | Icons, everywhere | **`<Icon>` defaults to `size=16` but every chrome slot is 14×14.** 16px SVGs sit inside 14px grid cells in sidebar links, header buttons and the toolbar. | svg **14×14** in `._iconSmall_ekx18_16` and in the sidebar's 14×14 icon span | 16×16 | **+2px on ~40 icon instances**; icons overflow their slot and read visually heavy |
| **7** | Icon silhouettes | **The 3 most-used sprite glyphs are the wrong shape.** `Project` (19 `<use>` refs) is a flat rounded-**hexagon donut**, mine is an isometric cube. `Team` (17 refs) is a rounded-square frame + **one** bust, mine is two people. The sidebar section marker (45 uses) is a **filled triangle**, mine is a chevron. | see §C | see §C | wrong at every occurrence |
| **8** | Settings page | **The 640px content column is left-aligned; it must be centred in the card.** `.contentMargins` is `display:flex` with no `justify-content`. | column x = **755** (dead-centre of the card) | x = **285** | **−470px** |
| **9** | Sidebar top row | **Workspace avatar is 24×24; capture is 20×20** — and the button geometry around it is all off (radius 10→8, gap 6→8, padding 5/9→4/6). | avatar 20×20 @ x=17, name at x=43 | 24×24 @ x=16, name at x=48 | avatar +4px, name **+5px** |
| **10** | Sidebar top row | **Workspace chevron is 13×13; capture is an 8×8 glyph in a dedicated `0 0 13 9` viewBox.** | 8×8 | 13×13 | **+62%** — the single most obviously oversized glyph in the chrome |
| **11** | Sidebar | **Search & compose buttons use `border-radius: 8px`; every 28px chrome button in the capture is a pill (`9999px`).** Their inner SVGs are 16px, should be 14px. | radius 9999px, svg 14×14, `padding: 0 2px` | radius 8px, svg 16×16, padding 0 | shape + weight |
| **12** | Agent toolbar | **Both toolbar controls are 24px; capture is 28px, and the radius is `8px`, not a pill.** | `Agent` pill h=28 `radius 8px` `padding 10/12`; `Chat history` 28×28 `radius 8px` | 24 / 24×24, `radius 9999px` | −4px each, wrong shape |
| **13** | Floating help button | **36px too high and the wrong shape.** `bottom: calc(var(--agent-toolbar-height))` lifts it above the toolbar; the capture pins it to `bottom: 0`. Capture has **no** elevated card/ring behind it. | 24×20, `radius 50%`, transparent, top y=**962** | 28×28 pill on an elevated `.helpCard` with a 1px ring, top y=**925.5** | **−36.5px** + invented chrome |
| **14** | Issue detail | **Content column is 40px too narrow** because `80ch` resolves against a 15px font here and a 16px font in the capture. | grid `140.875 / **806.25** / 400 / 140.875`, gap 56 | `163.156 / **765.672** / 400 / 163.172` | **−40.6px**; the rail sits 20px left of where it should |
| **15** | Sidebar section headers | **Height 24px (should be 28px) and the label is one whole tier too dim** — `--color-text-faint` (L 36.975) instead of label-muted (L 61.803). | h=28, colour `--sx-1dd5bcf` = lch(61.803% 1.2 272) | h=24, lch(36.975% 1.2 272) | −4px, and section labels nearly disappear |

---

## B. Full measured diff tables

All X/Y are expressed as **offsets from the content card's inner top-left corner** so the two renders are directly comparable. `OK` = within 1px.

### B.1 App frame

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| `main` content card | width × height | 1662 × 948 | 1662 × 948 | 0 | OK |
| | `margin` | `8px 8px calc(8px + 28px) 0` | `8px 8px calc(8px + var(--agent-toolbar-height)) 0` | 0 | OK |
| | `border-radius` | 12px | 12px | 0 | OK |
| | `border-width` | 1px (0.5px @2x) | `var(--thin-pixel)` = 1px | 0 | OK |
| | `border-color` | `--bg-border-color` lch(14.16% 1.48 272) | `#212224` (= same colour) | 0 | OK |
| | `background` | `--bg-base-color` lch(5.52% 0.4 272) | `#121213` | 0 | OK |
| | **`box-shadow`** | `var(--sx-10lzhmx)` (shadow-low) | `none` | — | **DRIFT** — the card has no lift |
| Sidebar spacer | width | 244px | 244px | 0 | OK |
| Sidebar panel | `position`/`z-index`/`max-width` | fixed / 96 / `min(100vw - 40px, 330px)` | same | 0 | OK |

### B.2 Content header — `/projects/all` (the two-band case)

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| `<header>` | total height | **115px** (57 + 1 + 57) | **92px** (57 + 1 + 34) | **−23px** | **DRIFT** |
| | `border-bottom` | **none** (divider lives on band 1) | `1px solid var(--color-border-thin)` | — | **DRIFT** |
| | `padding` | `0` | `0` | 0 | OK |
| | `gap` | 12px (only matters when >1 direct child) | — | — | OK (single child) |
| Band 1 (title row) | `min-height` | 57px | 57px | 0 | OK |
| | `padding-left` | **8px** | 10px | +2 | **DRIFT** |
| | `padding-right` | `max(8px, var(--scrollbar-width,0px))` | same | 0 | OK |
| | `border-bottom` | **`1px solid var(--sx-15wwovl)`** | none (on `<header>` instead) | — | **DRIFT** |
| | inner row `justify-content` | **`space-between`** | flex + `.headerSpacer` | — | equivalent, but see next row |
| Title cluster | `padding-left` | **10px** (inside the 8px band pad → h2 at **+18**) | — (h2 at **+10**) | **−8px** | **DRIFT** |
| | `gap` | **4px** | 6px (`.headerTitleRow gap`) | +2 | **DRIFT** |
| `h2` | font-size / weight | 13px / 500 | 13px / 500 | 0 | OK |
| | `line-height` | `normal` (16px box) | `19.5px` | +3.5 | **DRIFT** (see §D) |
| | `color` | `--sx-3zwjav` = label-base | `--color-text-base` | 0 | OK |
| Right cluster | `gap` | **4px** | n/a — no right cluster on this page | — | **DRIFT** |
| `New project` btn | x (from card-inner) | **+1534.3** | **+66.7** | **+1467.6** | **DRIFT (critical)** |
| | height / min-width | 28 / 28 | 28 / 28 | 0 | OK |
| | `border-radius` | 9999px | 9999px | 0 | OK |
| | `padding` | **`0 10px 0 8px`** | `0 10px` | +2 left | **DRIFT** |
| | font | 12px / 500 | 12px / 500 | 0 | OK |
| | icon slot | 14×14, `margin-right: 6px` | 14×14, `gap: 6px` | 0 | OK |
| | icon `<svg>` | 14×14 | **14×14** here | 0 | OK |
| Band 2 (tabs row) | `min-height` | **57px** | 34px (`28 + 6` pad-bottom) | **−23px** | **DRIFT (critical)** |
| | `padding` | `0 max(8px,sbw) 0 8px` | `0 max(8px,sbw) **6px** 8px` | +6 bottom | **DRIFT** |
| | `gap` (strip ↔ right controls) | 6px | 6px | 0 | OK |
| Tab strip inner | `gap` (tab ↔ tab / tab ↔ `+`) | **4px** | 6px | +2 | **DRIFT** |
| | `min-width` / `flex` | `300px` / `1 1 300px` | none | — | **DRIFT** (tabs don't reserve their measure) |
| Active tab pill | height / min-width / max-width | 28 / 28 / 200 | 28 / 28 / 200 | 0 | OK |
| | `padding` / `border-radius` | `0 10px` / 9999px | same | 0 | OK |
| | font | 12px / 500 | 12px / 500 | 0 | OK |
| | x (from card-inner) | +8 | +8 | 0 | OK |
| | `justify-content` | `center` | not set | — | **DRIFT** (cosmetic) |
| 28px icon buttons (`Add filter`, `Display options`, `Close sidebar`, `Add new view`) | size | 28×28 | 28×28 | 0 | OK |
| | `border-radius` | 9999px | 9999px | 0 | OK |
| | `padding` | **`0 2px`** | `0` (`.iconOnly`) | −2 | **DRIFT** (cosmetic) |
| | inner `<svg>` | **14×14** | **16×16** | **+2px** | **DRIFT** |
| | gap between them | 6px | 6px | 0 | OK |
| | right edge inset | 8px | 8px | 0 | OK |
| Secondary/filter strip | `min-height` when empty | 0 (collapses) | 0 | 0 | OK |

### B.3 Content header — `/issue/TRENDZO-37/...` and `/team/TRENDZO/all`

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| `<header>` (issue detail) | height | 57 + 1 = **58px** | 58px | 0 | OK |
| | `padding-left` | 8px | 10px (from `.headerTitleRow`) | +2 | **DRIFT** |
| | **`padding-right`** | **12px** | 8px | −4 | **DRIFT** |
| Breadcrumb cluster | `padding-left` / `padding-right` | **10px / 4px** | — | — | **DRIFT** (first crumb lands at +10 instead of +18) |
| | `gap` | 6px | 6px | 0 | OK |
| Team-issues tab row | height | 57px | 34px | −23 | **DRIFT** (same as B.2) |
| | tab ↔ tab gap | 4px | 6px | +2 | **DRIFT** |
| Header action buttons | size | 28×28 | some are `size24` (`Add to favorites` 24×24) | −4 | **DRIFT** |

### B.4 Content header — `/agent`

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| `<header>` | `border-bottom` | **none** | none (`.headerNoBorder`) | 0 | OK |
| | height | 57–58px | 58px | 0 | OK |
| Title pill button | height / radius | 28 / 9999px | 28 / 9999px | 0 | OK |
| | `padding` | `0 8px`, `margin-left: -8px`, `margin-right: 4px` | `8px / 6px`, no negative margin | ~0 net | OK (h2 lands at +18 by luck) |
| `h2` | font | 13px / 500 | 13px / 500 | 0 | OK |

### B.5 Sidebar

Absolute window coordinates (both renders share the same origin).

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| Top row | height / `margin-top` | 44 / 8 | 44 / 8 | 0 | OK |
| | horizontal padding | 12px | 12px | 0 | OK |
| | `z-index` | 30 | — | — | cosmetic |
| Workspace button | `border-radius` | **10px** | 8px (`--radius-row`) | −2 | **DRIFT** |
| | `padding-left` / `padding-right` | **5px / 9px** | 4px / 6px | −1 / −3 | **DRIFT** |
| | `gap` | **6px** | 8px | +2 | **DRIFT** |
| | height | 28 | 28 | 0 | OK |
| Workspace avatar | size | **20×20** | 24×24 | **+4** | **DRIFT** |
| | `border-radius` | 8px | 8px | 0 | OK |
| | `font-size` | 11px | 11px | 0 | OK |
| | `background` | `lch(70% 60 350 / 1)` | `lch(70 60 350)` | 0 | OK |
| Workspace name | x | **43** | 48 | **+5** | **DRIFT** |
| | `font-weight` | **550** | 500 | −50 | **DRIFT** |
| | `letter-spacing` | **−0.00625rem (−0.1px)** | `normal` | — | **DRIFT** |
| | `line-height` | **1.4375rem (23px)** | 19.5px | −3.5 | **DRIFT** |
| | `font-size` | 13px | 13px | 0 | OK |
| Workspace chevron | size | **8×8** | 13×13 | **+5** | **DRIFT** |
| Search / compose btns | position | x = 172 / 204 | 172 / 204 | 0 | OK |
| | size | 28×28 | 28×28 | 0 | OK |
| | `border-radius` | **9999px** | 8px | — | **DRIFT** |
| | `padding` | **`0 2px`** | 0 | −2 | **DRIFT** (cosmetic) |
| | inner `<svg>` | **14×14** | **16×16** | +2 | **DRIFT** |
| | gap between them | 4px | 4px (`.topRow gap`) | 0 | OK |
| | compose icon fill | `lch(100% 0 272)` (white) | `lch(100 0 272)` | 0 | OK |
| Scroll area | `padding-left/right` | 12 / 12 | 12 / 12 | 0 | OK |
| | `padding-top` **effective** | 26 − 13 (sticky fade `h:26; mt:−39`) = **13** | 26 | **+13** | **DRIFT (critical)** |
| | `padding-bottom` | 0 | **40px** | +40 | **DRIFT** |
| | scroll-fade element | `sticky; top:-26px; height:26px; margin-top:-39px` + `animation-timeline: --sidebar-content-scroll; animation-range: 0 26px` | absent | — | **DRIFT** (missing Linear signature) |
| First nav row | y | **66** | **79** | **+13** | **DRIFT (critical)** |
| Nav link `<a>` | height / `margin` / `border-radius` | 28 / `1px 0` / 8px | same | 0 | OK |
| | `padding-left` / `padding-right` | 8 / 9 | 8 / 9 | 0 | OK |
| | font | 13px / 500, `line-height: normal` | 13px / 500, `line-height: 19.5px` | — | **DRIFT** (§D) |
| | `color` | `--sx-1dd5bcf` label-muted | `--color-text-muted` | 0 | OK |
| Nav link icon span | size / `margin-right` | 14×14 / 6px | 14×14 / 6px | 0 | OK |
| Nav link icon `<svg>` | size | **14×14** | **16×16** | **+2** | **DRIFT (critical)** |
| Section header button | height | **28px** | 24px | **−4** | **DRIFT** |
| | `color` | `--sx-1dd5bcf` = lch(61.803% 1.2 272) | `--color-text-faint` = lch(36.975% 1.2 272) | — | **DRIFT** |
| | `padding-left` (net to label) | wrap 5px + btn 4px → label at x=**21** | 8px → label at x=20 | −1 | OK |
| | `border-radius` | 8px | 8px | 0 | OK |
| | label font | 12px / 500 | 12px / 500 | 0 | OK |
| | gap above section | **14px** | 17px (`.section margin-top: 18px`) | **+3** | **DRIFT** |
| | chevron | `margin-left: 2px; margin-top: 1px`, filled triangle | `gap: 4px`, chevron glyph | — | **DRIFT** (see §C) |
| Team child link | indent mechanism | `margin-left: 19px` + `::before { inset: 0 0 0 -19px }`, inner `padding-left: 6px` | `padding-left: 27px` | — | different but close |
| | icon x | **37** | **39** | **+2** | **DRIFT** |
| | height / radius / font | 28 / 8px / 13px 500 | same | 0 | OK |
| | inner `gap` | 6px | via `.linkIcon margin-right: 6px` | 0 | OK |
| Help button | y (top) | **962** | **925.5** | **−36.5** | **DRIFT** |
| | size | **24×20** | 28×28 | +4/+8 | **DRIFT** |
| | `border-radius` | **50%** | 9999px | ~0 | OK |
| | rest background | **transparent, no ring** | `--color-bg-elevated` + `0 0 0 1px` ring (`.helpCard`) | — | **DRIFT** |
| | container | `absolute; bottom:0; left:0; right:0; padding:10px; z-index:10` | `fixed; bottom: calc(var(--agent-toolbar-height))` | — | **DRIFT** |
| Resize handle | `right:-5px; top:14px; bottom:40px; width:7px` + gradient | identical, incl. the exact 5-stop gradient | 0 | OK |

### B.6 Projects table

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| Grid template | columns | `[indent] 8px [checkbox] 18px [title] 1fr [health] 130px [priority] 68px [lead] 48px [targetDate] 91px [issues] 49px [status] 120px [end-padding] 8px` | identical | 0 | **OK** |
| | `column-gap` | 6px | 6px | 0 | OK |
| | first-cell offsets | indent +0, checkbox +14, title +38 | +0 / +14 / +38 | 0 | OK |
| Column-header row | height | 32px | 32px | 0 | OK |
| | cell height | 24px | 18px | −6 | **DRIFT** (cosmetic) |
| | label font | 12px / 450, `--sx-1dd5bcf` | 12px | — | verify weight 450 |
| | grid start y (from card top) | **+116** | **+93** | **−23** | **DRIFT** (consequence of #1) |
| Project row `<a>` | height | 48px | 48px | 0 | OK |
| | `border-radius` | 8px | 8px | 0 | OK |
| | `display` / subgrid | `grid` + `grid-template-columns: subgrid; grid-column: 1/-1` | same | 0 | OK |
| | **`::before`** | `inset: 0 8px; border-radius: 8px` | `inset: 0 8px; border-radius: 8px` | 0 | **OK** |
| | `--row-applied-bg` | `lch(9.345% 0.85 272 / 1)` | `--row-applied-bg: lch(9.345% 0.85 272)` | 0 | OK |
| | `--row-keyboard-border` | `lch(19.701% 19.952 286.445 / 1)` | same | 0 | OK |
| | inner `min-height` | 48px | — (cells sized directly) | — | OK |
| Icon tile | size / radius / `margin-right` | 28×28 / 4px / 6px | 28×28 / gap 6 | 0 | OK |
| Milestone chip | height / radius | 27px / 48px | 27px | 0 | OK |
| Health glyph | `<svg>` 16×16, circle `r=7.5 stroke-dasharray="2.36 2.36"` | `stroke-width: 1` | `stroke-width: 1.5` | +0.5 | **DRIFT** (see §C) |
| List wrapper | `padding-bottom` | `max(8px, env(safe-area…))` | — | — | minor |

### B.7 Issue detail

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| Scroll grid | `grid-template-columns` | `140.875px **806.25px** 400px 140.875px` | `163.156px **765.672px** 400px 163.172px` | **−40.6px content** | **DRIFT** |
| | `column-gap` | 56px | 56px | 0 | OK |
| | `align-items` / `align-content` | `start` / `start` | same | 0 | OK |
| | `scrollbar-gutter` | stable | stable | 0 | OK |
| Content column | `grid-column` | 2 | 2 | 0 | OK |
| | `padding-left` | 14px | 14px | 0 | OK |
| Rail column | `grid-column` / width | 3 / `clamp(280px, 26.087cqw + 66.087px, 400px)` → 400 | 3 / 400 | 0 | OK |
| | rail x (abs) | **1306** | **1286** | **−20** | **DRIFT** (consequence of the 80ch drift) |
| Rail sticky | `padding-top` / `padding-bottom` | **51px / 54px** | **51px / 54px** | 0 | **OK** |
| | `position: sticky; top: 0; align-self: start` | yes | yes | 0 | OK |
| Title block | `margin-top` | 18px | verify | — | check |

### B.8 Agent page

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| Chat area | `padding-inline` | 24px | 24px | 0 | OK |
| Chat column | `max-width` / `gap` / `margin-bottom` | 712px / 16px / 8vh | 712px / 16px / 79.36px (= 8vh) | 0 | **OK** |
| Composer | `border-radius` | 10px | 10px | 0 | OK |
| | `padding` | 12px | 12px | 0 | OK |
| | `background` | `lch(7.32% 0.85 272 / 1)` | `lab(7.32 …)` = same | 0 | OK |
| | editor width | 676px @ x=737 | 676px @ x=737 | 0 | **OK — exact** |
| | editor font | 15px / 450 / lh 1.6 | 15px / 450 | ~0 | OK |
| | `box-shadow` | not present in capture | `0 0 0 1px border-hover` + shadow-low | — | **DRIFT** (verify; likely a focus-only ring) |

### B.9 Agent toolbar

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| Strip | width | content column only (x 246 → 1906) | **full window (0 → 1914)** | — | **DRIFT** (low visual impact — same bg colour) |
| | height | 28px | 28px | 0 | OK |
| | `padding-top` / `margin-top` | `4px` / `-4px` | none | — | **DRIFT** |
| | `border-top` | `var(--sx-1ele6il) solid var(--sx-1o1lnwn)` | none | — | **DRIFT** |
| | `z-index` | `calc(96 + 1)` = 97 | 97 | 0 | OK |
| | `padding-right` | 8px | 8px | 0 | OK |
| | `justify-content` / `gap` | `flex-end` / 6px | same | 0 | OK |
| `Agent` pill | height | **28px** | 24px | **−4** | **DRIFT** |
| | `border-radius` | **8px** | 9999px | — | **DRIFT** |
| | `padding-left` / `padding-right` | 10px / 12px | 10px / 12px | 0 | OK |
| | font | 12px / 500 | 12px / 500 | 0 | OK |
| | icon | 14×14 | 14×14 | 0 | OK |
| `Chat history` btn | size | **28×28** | 24×24 | **−4** | **DRIFT** |
| | `border-radius` | **8px** | 9999px | — | **DRIFT** |
| | `padding` | `0 2px` | 0 | −2 | **DRIFT** |
| | icon | 14×14 | **16×16** | +2 | **DRIFT** |
| Panel anchor | `right: -8px`, `bottom: 100%`, `z-index: 250`, `width: 400px` | same | 0 | OK |

### B.10 Settings / preferences

| Element | Property | Captured | Mine | Δ | Verdict |
|---|---|---|---|---|---|
| Card strip | height | 64px | 64px | 0 | OK |
| Content column | `max-width` | 640px | 640px | 0 | OK |
| | **x position** | **755 (centred in the card)** | **285 (left-aligned)** | **−470** | **DRIFT (critical)** |
| | y | card top + 64 | card top + 64 | 0 | OK |
| Content wrapper | `margin-inline` / `margin-bottom` | 40px / 64px | 40px / 64px | 0 | OK |
| Title spacer | height | 32px (24px ≤640px) | 32px | 0 | OK |
| Section stack gap | | 48px (24px ≤640px) | verify | — | check |
| Settings sidebar header row | height | `calc(var(--header-height) + 1px)` = 58 | verify | — | check |
| Settings sidebar scroll | `padding` | `4px 12px 0 12px` + `padding-top: 26px` sticky-fade idiom | verify | — | check |
| Settings sidebar bg | | `var(--sx-74qs5)` | verify | — | check |

---

## C. Icons — glyph-by-glyph verdict

Architectural finding from the capture DOM: the sprite sheets hold **305 `<symbol>`s (Base 33, Brands 8, Decorative 264)** but each page only makes **11–15 `<use>` references**; the rest of the chrome renders **inline `<svg>` copies** of the same paths (50–114 per page). **All 305 symbols are fill-only — zero `stroke` attributes, all `viewBox="0 0 16 16"`.** "Outline" looks are achieved with **even-odd filled donuts** (e.g. `Search` = outer circle subpath + inner circle subpath), never with strokes. That confirms `design-system.md` §7 and makes fill-vs-stroke the single biggest systemic icon defect.

### C.1 Systemic icon defects

| # | Defect | Evidence | Impact |
|---|---|---|---|
| I-1 | **`<Icon>` renders at 16px in 14px slots.** `Icon.tsx` defaults `size = 16`; `button.module.css` `.size24 .icon / .size28 .icon` are 14×14 and `sidebar.module.css .linkIcon` is 14×14, but the child `<svg>` keeps its 16px width/height attributes. | measured: sidebar nav svg 16×16 in a 14×14 span; header icon-button svg 16×16 in a 14×14 span | ~40 instances, all reading 14% heavy |
| I-2 | **64% of my inline glyphs are stroke-based (55 of 86); the capture is fill-based** except 5 parametric families. | see C.4 | every glyph reads thinner/wirier than Linear's |
| I-3 | **viewBox anarchy.** Capture uses exactly 4 boxes: `0 0 16 16` (all glyphs), `0 0 14 14` (issue status), `0 0 13 9` (workspace chevron), `0 0 9 5` (select chevron). Mine uses 12, 14, 16, 18, 24, 32, 96×72, 96×96, 100×100, 336. | grep across `src/` | the same "check" glyph exists at 3 scales and 3 weights |
| I-4 | **Duplicate glyph definitions.** 6 checkmarks (5 stroked, 3 filled), 5 dashed-person avatars (3 sizes, 3 stroke widths), 3 pluses, 3 back-arrows. | see C.4 | inconsistent weight across surfaces |
| I-5 | **Set placement.** My `ClockOutline` and `QuestionMark` live in the **Base** sheet; both are **Decorative** in the captures. `Rocket` is shipped but never referenced. | sprite-set diff | cosmetic/organisational |

### C.2 Wrong-silhouette glyphs (redraw required)

Recommendation for every row: **redraw to match silhouette and proportion from the described geometry — do not copy Linear's path data verbatim.**

| Glyph | File | Captured shape | Mine | Verdict |
|---|---|---|---|---|
| **Project** (19 `<use>` refs — the most-referenced sprite) | `src/components/icons/Sprites.tsx` `Project` | `viewBox 0 0 16 16`, fill, `fill-rule: evenodd` — a **flat rounded-hexagon donut** (outer hex + inner hex cut); same silhouette family as the project-status shield | isometric 3-face **cube** with three shaded faces | **WRONG SILHOUETTE** |
| **Team** (17 refs) | `Sprites.tsx` `Team` | 2 fill paths: a **rounded-square frame donut** (1→15, rx 2.5) containing **one** bust (head r≈2 at cy 6 + shoulder sweep) | **two people** side by side, no frame | **WRONG SILHOUETTE** |
| **Section disclosure marker** (45 uses — the highest-frequency glyph in the UI) | `Sprites.tsx` `ChevronDown` / `ChevronRight` | a **solid filled triangle**, apex x≈11.0, base x≈6.25 → **4.75 wide × 5.25 tall**, CSS-rotated 90° when expanded | a **chevron (V)** spanning 9.56 × 5.18, thickness ~1.8 | **WRONG SILHOUETTE + 2× too wide** |
| **Filter** | `Sprites.tsx` `Filter` | **3 stacked horizontal bars, decreasing width**, all 1.5 tall, rounded: y3 (1.75→14.25), y7.25 (4→11.25), y11.5 (6.75→9.25) | a **funnel/triangle** | **WRONG SILHOUETTE** |
| **My issues** | `Sprites.tsx` `MyIssues` | fill, `fill-rule: evenodd`, **4 corner brackets** (viewfinder/crop mark) | a **person-in-a-circle** avatar disc | **WRONG SILHOUETTE** |
| **Calendar** | `Sprites.tsx` `Calendar` | rounded square **rx 4**, 1→15, with the **top 5u solid** as a header band. **No date "ears"/legs.** | has **two ears** and rx ≈ 2.2 | **WRONG SILHOUETTE** |
| **Agent** | `Sprites.tsx` `Agent` | a fine **quill/ribbon** figure (~40 bezier segments) | a **4-point sparkle/star** | **WRONG SILHOUETTE** |
| **Back arrow** | `src/components/settings/glyphs.tsx` `back` | a **bare chevron-left, no shaft**, thickness 1.5, spans x 5.18→10.53 | a full **left-arrow with a long tail** to x=13 | **WRONG SILHOUETTE** |
| **Sidebar toggle / close panel** | `Sprites.tsx` `SidePanel` | rounded-rect **donut** (1,2)→(15,14), **rx 3.25 outer / 2 inner**, plus a floating pill `rect x=10 y=5 w=1.5 h=6 rx=0.75` (collapsed) / `x=7 w=4.5` (expanded), **CSS-animated on x/width** | rect 2→14, rx ≈1.2, with a **full-height solid right rail** | **WRONG** — rail should be a short centred pill; frame far rounder; no state animation |
| **Chat history** | `Sprites.tsx` `ClockOutline` | a **counter-clockwise revert-arrow circle** (arrowhead is a filled triangle at 9 o'clock) + hands | a plain ring + hands, **no revert arrow** | **MISSING FEATURE** |
| **Inbox** | `Sprites.tsx` `Inbox` | fill, symmetric tray 1→15 with a rounded 2.5r shell and a notched lip | **malformed path**: `H1.8 … -1.8` puts the left wall at **x=0**, so the tray is a lopsided trapezoid bleeding out of the 1px safe box | **DEFECT** |
| **Favorite (star)** | `Sprites.tsx` `Favorite` | a **star donut** (outer star outline + inner star cut), wall ≈1.5 — the *unfavourited* state | a **solid filled star** always | **FILL-STYLE** — favourited and not look identical |
| **Label (tag)** | `Sprites.tsx` `Label` | pentagon **tag donut** + a `r=1` dot | **solid** tag with a 1.3r hole | **FILL-STYLE** — reads as a blob |
| **Home** | `Sprites.tsx` `Home` | the sidebar variant is **stroke, `stroke-width: 1.5`, `fill: none`** — an outline house with a 3.5-wide door (the Base *sprite* `Home` is filled; Linear ships both and uses the stroked one in the sidebar) | **solid** house | **FILL/STROKE INVERTED** |
| **Sort chevron** | `src/components/projects/ProjectsTable.tsx` (`sortChevron`) | 2 paths: chevron head **+ a vertical shaft** `M8.75 12.25 … V3.75` (1.5 wide, y3→13) | reuses the plain `ChevronDown`, **no shaft** | **MISSING SHAFT** — asc/desc reads weak |

### C.3 Proportion / weight drifts (keep the shape, fix the numbers)

| Glyph | File | Captured | Mine | Fix |
|---|---|---|---|---|
| Workspace chevron | `Sprites.tsx` `ChevronDown` | dedicated **`viewBox="0 0 13 9"`**, fill, spans 12.1 × 7.17, thickness 1.5 | 16×16 box, chevron 9.56 × 5.18, thickness 1.8 | add a tight 13×9 variant; at 8×8 rendered it currently reads ~25% small and ~20% heavy |
| Select chevron | `src/components/ui/Select.tsx` `ChevronDownGlyph` | dedicated **`viewBox="0 0 9 5"`**, spans 8 × 4.2, thickness ≈1.33 | 16×16, 8.56 × 4.61, thickness 1.5 | add a 9×5 form-control variant |
| Search | `Sprites.tsx` `Search` | ring **r5 outer / r3.5 inner**, handle (9.96,11.03)→(13.78,13.78) | **r5.5 / r4**, handle to (14.06,14.06) | shrink ~10%; restore the 1px optical padding |
| Plus | `Sprites.tsx` `Plus` | arms **1.5 thick**, span **3.25 → 12.75** (9.5) | arms 1.66, span 2.6 → 13.4 (10.8) | 14% too long, 11% too heavy; also **3 different pluses exist** (`GroupHeader.tsx`, `settings/glyphs.tsx`) |
| Display options | `Sprites.tsx` `DisplayOptions` | 2 rails 1.5 thick at **y5 / y11**, 2.25→14.75, knobs are pill-ended lozenges (r≈1.5) at cx7 / cx10 | rails at y4.5 / y11.5, round knobs | move rails 0.5u inward, make knobs lozenges |
| Compose | `Sprites.tsx` `Compose` | **2 paths**: an open rounded square with the **top-right corner genuinely omitted** + a separate diagonal pencil nib | 1 path; pencil extends to 15.6 (outside the safe box) | split into 2 paths, pull the nib back inside 15 |
| Attachment | `Sprites.tsx` `Attachment` | paperclip spans **4.4 → 12.6** | spans **1.06 → 15.0** | **70% too large**, breaks the safe box both ends |
| Send | `Sprites.tsx` `Send` | shaft **1.5** wide, y 3.1→12.25, head 6 wide | shaft 1.6, y 3.6→13.6, head 7.4 | 1u low, head 23% wide |
| More (⋯) | `Sprites.tsx` `More` | 3 circles **r = 1.5** at cx 3/8/13, cy 8 | r = 1.4 | 7% light — best match in the codebase |
| Project status shield | `src/components/projects/glyphs.tsx` `SHIELD_OUTLINE` | `viewBox="-1 -1 16 16"`, hexagon with **rounded vertices** (every corner a cubic), spans **1.75 → 12.25** (10.5 wide), sw 1.5, dashed variant `1.65 1.35`; pie `r4 cx7 cy7 sw8 dasharray "calc(N) 25.12" rotate(-90)` | correct viewBox / sw / dash / pie, but a **hard-cornered polygon** spanning 0.94 → 13.06 (12.1 wide) | round the vertices; shrink 15% |
| Milestone diamond | `projects/glyphs.tsx` `MilestoneDiamond` | 16×16, **stroke sw 2**, `fill: none`, a **rounded-corner kite 9.58 wide × 11.36 tall** (1 : 1.19); variants: solid / **dashed `stroke-dasharray="2 1.93"`** (not started) / filled+stroked (done); **all at full opacity — colour carries state** | sharp-cornered **square** rhombus 10.5 × 10.5, outline variant dimmed to `opacity 0.4`, **no dashed variant** | 4 defects: aspect, corners, opacity, missing dashed state |
| Health "no update" | `projects/glyphs.tsx` | `r 7.5 cx8 cy8`, **`stroke-width: 1`**, dash `2.36 2.36`, round caps | `stroke-width: 1.5` | 50% too heavy |
| Priority Low/Med/High | `src/components/icons/StatusIcon.tsx` | rect geometry **exact match**; inactive bars `fill-opacity="0.4"` | inactive uses `color-mix(… 35%, transparent)` | 35% → **40%** |
| No Priority | `StatusIcon.tsx` | 3 rects `x 1.5/6.5/11.5, y 7.25, w3 h1.5 rx0.5`, `opacity="0.9"` **per rect** | identical rects, opacity on the `<svg>` | visually identical — OK |
| IssueStatus ring | `StatusIcon.tsx` | `viewBox 0 0 14 14`; outer `r6 sw1.5 dasharray "1.4 1.74" dashoffset 0.65`; inner `r2 sw4 rotate(-90 7 7)` with denominator **22.6195** | identical except denominator `12.566` | **near-verbatim match** — only the denominator differs |

### C.4 Stroke-based glyphs that must become fill-based

The capture uses stroke in exactly **5** places: IssueStatus ring (14×14, sw 1.5/4), project-status hexagon (`-1 -1 16 16`, sw 1.5/8, dash `1.65 1.35`), milestone diamond (16×16, sw 2, dash `2 1.93`), health circle (16×16, r7.5, sw **1**, dash `2.36 2.36`), and the sidebar outline `Home` (16×16, sw 1.5). **Everything else is filled.**

These 44 of mine are stroke-based and should be redrawn as filled paths (file → symbol → current size/stroke):

```
app/[workspace]/project/[slug]/issues/ProjectIssuesView.tsx   12×12 sw1.4
app/login/glyphs.tsx                    ProductMark            32×32 sw1.5
components/agent/glyphs.tsx             GlyphClose             16×16 sw1.4
components/agent/glyphs.tsx             GlyphCheck             16×16 sw1.5
components/inbox/InboxControls.tsx      FilterRow              12×12 sw1.6
components/inbox/InboxView.tsx          InboxOutlineGlyph      24×24 sw1.4
components/inbox/InboxView.tsx          ReadGlyph              16×16 sw1.5
components/inbox/InboxView.tsx          (close)                12×12 sw1.4
components/inbox/WelcomeDocument.tsx    WorkspaceMark          32×32 sw2.5
components/issues/CreateIssueModal.tsx  GlyphExpand            16×16 sw1.4
components/issues/CreateIssueModal.tsx  GlyphClose             16×16 sw1.4
components/issues/CreateIssueModal.tsx  GlyphCheck             14×14 sw1.5
components/issues/CreateIssueModal.tsx  GlyphPersonDashed      14×14 sw1.1
components/issues/FilterBar.tsx         CheckGlyph             12×12 sw1.6
components/issues/FilterBar.tsx         CloseGlyph             12×12 sw1.4
components/issues/FilterBar.tsx         BackGlyph              14×14 sw1.4
components/issues/InsightsPanel.tsx     (glyph)                14×14 sw1.4
components/issues/IssueList.tsx         AssigneePlaceholder    18×18 sw1.1
components/issues/MyIssuesView.tsx      AssigneePlaceholder    18×18 sw1.1
components/issues/attachments.tsx       (glyph)                12×12 sw1.4
components/issues/detail/PropertyRail.tsx DashedPersonIcon     16×16 sw1.3
components/issues/pickers/PickerMenu.tsx  CheckIcon            16×16 sw1.5
components/issues/pickers/propertyItems.tsx NoAssigneeIcon     16×16 sw1.5
components/nav/CommandPalette.tsx       GlyphCommand           16×16 sw1.3
components/nav/CommandPalette.tsx       GlyphTheme             16×16 sw1.3
components/nav/CommandPalette.tsx       GlyphPersonDashed      14×14 sw1.1
components/nav/MoreMenu.tsx             GlyphPencil            16×16 sw1.3
components/nav/Peek.tsx                 GlyphClose             16×16 sw1.4
components/nav/Peek.tsx                 GlyphPersonDashed      14×14 sw1.1
components/nav/WorkspaceMenu.tsx        GlyphCheck             14×14 sw1.5
components/projects/DetailsRail.tsx     DependencyGlyph        16×16 sw1.3
components/projects/DetailsRail.tsx     UserPlusGlyph          16×16 sw1.3
components/projects/DetailsRail.tsx     ArrowRightGlyph        12×12 sw1.2
components/projects/ProjectFilterBar.tsx CheckGlyph            12×12 sw1.6
components/projects/ProjectFilterBar.tsx CloseGlyph            12×12 sw1.4
components/projects/ProjectFilterBar.tsx BackGlyph             14×14 sw1.4
components/projects/ProjectsTable.tsx   NoLeadGlyph            16×16 sw1.1
components/projects/glyphs.tsx          CrossGlyph             12×12 sw1.4
components/projects/pickers.tsx         NoLeadIcon             16×16 sw1.5
components/ui/Checkbox.tsx              Checkbox               14×14 sw1.5
components/ui/Menu.tsx                  MenuCheck              12×12 sw1.6
components/shell/Splash.tsx             (splash mark)          32×32 sw2.5   ← large illustration, may stay
components/issues/MyIssuesView.tsx      StackIllustration     100×100 sw1.5  ← large illustration, may stay
components/nav/ViewsPage.tsx            LayeredStack           96×72 sw1.5   ← large illustration, may stay
```

Special case — **the "no lead / no assignee" dashed avatar**: the capture builds it from **7 fill paths** — a solid person (head r2.25 at cy 6.75 + shoulder sweep) surrounded by **4 discrete filled arc segments at N/E/S/W** (the "dashes" are filled tick shapes, not a `stroke-dasharray`). I ship **5 different stroke-based versions** at 3 viewBox sizes and 3 stroke widths. Collapse to one filled 16×16 definition.

**Checkmarks:** `Select.tsx`, `ListRow.tsx` and `ProjectsTable.tsx` already ship the correct **filled** check (`M12.78 4.72a.75…`). Seven other files ship stroked polylines. Collapse everything onto the filled one.

### C.5 Missing icons

**Referenced via `<use>` in the captures but absent from my sprites (3):** `Connected`, `Face`, `Page` (all Decorative, all actually painted on screen).

**Captured Base sprite IDs absent from `Sprites.tsx` (14):** `Blockquote`, `Checklist`, `CodeBlock`, `CreditCard`, `Refresh`, plus `IssueStatusBacklog/Done/Review/Started/Todo/Triage` and `MilestoneStatusDone/Planned/Started` (these nine are functionally covered by my parametric `StatusIcon` / `MilestoneDiamond`, so they are low priority — the first five are genuinely absent).

**Inline chrome glyphs present in the captures with no counterpart of mine:**
- `Issues` sidebar mark — 2 fill paths, a **stacked-cards** shape: rounded-square donut (1,1)→(11,11) + a second offset rounded square (5,5.25)→(15,15). 8 occurrences across 4 captures.
- `Loops` glyph (5 occurrences)
- `Skills` glyph (hexagonal knot)
- Sort arrow **shaft** path
- Todo drag handle — `viewBox="0 0 6 10"`, 6 dots, `class="todo-drag-handle"`
- Calendar + clock composite (target-date-with-time variant)
- Template / page-with-folded-corner

### C.6 ⚖️ Legal — brand marks

**Rule for this project: redraw to match silhouette and proportion. Never reproduce the Linear wordmark/logo or any third-party brand logo.**

| Risk | Path | Finding | Action |
|---|---|---|---|
| **HIGH** | `/Users/moon/Documents/linear/public/next.svg` | The full **Next.js wordmark** (`viewBox="0 0 394 80"`) — a Vercel trademark. Leftover from `create-next-app`. **Not referenced anywhere in `src/`.** | **Delete the file.** |
| **HIGH** | `/Users/moon/Documents/linear/public/vercel.svg` | The **Vercel triangle mark** (`viewBox="0 0 1155 1000"`) — a Vercel trademark. **Not referenced anywhere in `src/`.** | **Delete the file.** |
| **MEDIUM** | `/Users/moon/Documents/linear/src/app/login/glyphs.tsx` → `ProductMark` | A rounded square (rx 8.25) containing **three parallel diagonal slabs**. Linear's brand mark is *diagonal strokes inside a rounded square*; at 32px the gestalt reads as a Linear-alike. | **Redesign the internal motif** away from diagonal slabs (e.g. a non-diagonal arrangement). |
| **LOW–MED** | `src/app/login/glyphs.tsx` → `ProviderGlyph` | Four arc segments around a central gap, used as the SSO/identity-provider button glyph. Shape is generic and monochrome, but the *role* ("Sign in with …") creates an implied-association risk with Google/Microsoft sign-in marks. | Make it a deliberate decision; a neutral key/shield glyph is safer. |
| — | `public/file.svg`, `public/globe.svg`, `public/window.svg` | Unreferenced `create-next-app` scaffold icons. Generic shapes, no trademark issue. | Delete as dead assets (optional). |

**Cleared (verified, no issue):**
- `src/components/shell/Splash.tsx` and `src/components/inbox/WelcomeDocument.tsx` use a neutral concentric-circle mark with an explicit in-code note. **The captures' splash contains the real Linear 32×32 logo; you correctly did not reproduce it.** ✅
- `src/components/agent/glyphs.tsx` → `AgentWatermark` (336×336 concentric rounded squares) is structurally unrelated to the 336×336 asset in the capture. ✅
- The captured **Brands** sprite set (`Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp`) — **none are shipped.** Keep it that way. GitHub/GitLab/Slack appear only as body text in `settings/account/code-and-reviews/page.tsx` and `NotificationsView.tsx`, with no marks — nominative use, fine. ✅

---

## D. Typography and colour drift

### D.1 Type roles

| Role | Captured | Mine | Verdict |
|---|---|---|---|
| Font family | `"Inter Variable", "SF Pro Display", -apple-system, …, "Linear Thai", sans-serif` | `Inter` (next/font/google) + the same stack | **near-OK** — but `ch` metrics differ (see D.2) |
| Body / card default | 15px / 450 | 15px / 450 | OK |
| Header `h2` | 13px / **500** / `line-height: normal` | 13px / 500 / **19.5px** | **DRIFT** — `line-height` |
| Sidebar nav link | 13px / 500 / `line-height: normal` | 13px / 500 / **19.5px** | **DRIFT** |
| Sidebar section header | 12px / 500 | 12px / 500 | OK (colour drifts — D.3) |
| **Workspace name** | 13px / **550** / `line-height: 1.4375rem (23px)` / `letter-spacing: -0.00625rem` | 13px / **500** / 19.5px / `normal` | **DRIFT ×3** |
| Chrome button label | 12px / 500 | 12px / 500 | OK |
| Tab pill | 12px / 500 | 12px / 500 | OK |
| Column header label | 12px / **450** | 12px (weight to verify) | check |
| Agent composer | 15px / 450 / lh 1.6 / `letter-spacing: -0.00666667em` | 15px / 450 | **DRIFT** — missing editor `letter-spacing` |
| Settings `h1` | title2 24px / 500 | 24px / 500 / `ls −0.16px` | OK |

**Systemic:** the capture sets `line-height: normal` on almost every chrome text run (h2, nav links, buttons, section labels). My global body `line-height: 1.5` cascades in and makes each of those boxes ~3.5px taller. It doesn't move anything on a `align-items: center` row, but it does change ellipsis boxes and any place a text box drives height.

### D.2 The `80ch` problem (issue detail)

The capture's issue-view grid element inherits the browser default **16px** font-size, so `80ch ≈ 806.25px`. My `.grid` inherits the card's **15px**, so `80ch ≈ 765.67px`. The ratio per em is nearly identical (0.630 vs 0.638), so this is a **font-size inheritance** difference, not a typeface difference. Fix by pinning the `ch` resolution context on `.grid` (see §E).

### D.3 Colour / token drift

| Element | Captured token | Mine | Verdict |
|---|---|---|---|
| Sidebar section header label | `--sx-1dd5bcf` = label-muted = `lch(61.803% 1.2 272)` | `--color-text-faint` = `lch(36.975% 1.2 272)` | **DRIFT** — one full tier too dim |
| Header divider | `var(--sx-15wwovl)` (bg-border tier) | `--color-border-thin` `lch(14.16% 1.48 272)` | OK |
| Icon default | `lch(60.621% 1.2 272 / 1)` | `--icon-default-color: lch(60.621% 1.2 272)` | OK |
| Tab-add / dimmer chrome icon | `lch(36.975% 1.2 272 / 1)` | uses the same muted colour as other buttons | **DRIFT** — `Add new view` should be one tier dimmer |
| Row applied bg | `lch(9.345% 0.85 272 / 1)` | same | OK |
| Row keyboard border | `lch(19.701% 19.952 286.445 / 1)` | same | OK |
| Composer bg | `lch(7.32% 0.85 272 / 1)` | same | OK |
| Help button rest bg | transparent | `--color-bg-elevated` + `0 0 0 1px --color-border-solid` | **DRIFT** — invented |
| Content card shadow | `var(--sx-10lzhmx)` (shadow-low) | none | **DRIFT** |
| Agent toolbar top border | `var(--sx-1ele6il) solid var(--sx-1o1lnwn)` | none | **DRIFT** |

### D.4 Hardcoded colours that should be tokens

Most of the 61 raw-colour hits in `*.module.css` are legitimate (gradients copied verbatim from the capture, `#fff` on tinted avatars). These are the ones worth tokenising:

| File | Line (approx.) | Value | Should be |
|---|---|---|---|
| `src/components/ui/button.module.css` | 147–149 | `lch(100% 0 272)` ×3 | `var(--color-text-title)` |
| `src/components/inbox/inbox.module.css` | 648 | `#ffffff` | `var(--color-text-title)` |
| `src/components/ui/list.module.css` | 75 | `#fff` | `var(--color-text-title)` (unless on a tinted chip) |
| `src/components/ui/toggle.module.css` | 40, 52 | `lch(47.551% 0.913 271.998)`, `lch(56.238% 1.008 271.999)` | new `--color-toggle-track` / `-hover` tokens |
| `src/components/settings/settings.module.css` | 648–649 | `lch(72% 55 150)`, `lch(40% 40 150 / 0.5)` | new `--color-green` / `--color-green-ring` tokens |
| `src/components/ui/dialog.module.css` | 11 | `rgba(0, 0, 0, 0.4)` | a `--color-scrim` token |

### D.5 Motion

`tokens.css` reproduces the full captured speed + easing table exactly (0s in / 0.15s out hover idiom, all 18 named beziers, the three non-token beziers). No drift found. Two gaps:
- Sidebar scroll-fade uses `animation-timeline: --sidebar-content-scroll; animation-range: 0px 26px` in the capture — **not implemented**.
- List rows in the capture use `transition-property: box-shadow, background-color; transition-duration: .15s, 0s` — verify mine matches.

---

## E. FIX LIST (ordered, copy-pasteable)

Each item: **file › selector › property › value**. Anchor on the selector — line numbers may have shifted.

### Tier 1 — header geometry and placement (fixes #1–#4, #14)

1. `src/components/shell/shell.module.css` › `.headerTabsRow` › `padding` → `0 max(8px, var(--scrollbar-width, 0px)) 0 8px` *(remove the 6px bottom padding)*
2. `src/components/shell/shell.module.css` › `.headerTabsRow` › **add** `min-height: var(--header-height);` *(makes the tabs band 57px, per capture-projects band 2)*
3. `src/components/shell/shell.module.css` › `.headerTabsRow` › `gap` → `4px` *(tab↔tab and tab↔`+` gap; capture measured 4px)*
4. `src/components/shell/shell.module.css` › `.headerTabsRow` › **add** `flex-shrink: 0;`
5. `src/components/shell/shell.module.css` › `.header` › **remove** `border-bottom: var(--thin-pixel) solid var(--color-border-thin);`
6. `src/components/shell/shell.module.css` › `.headerTitleRow` › **add** `border-bottom: var(--thin-pixel) solid var(--color-border-thin);` *(the divider belongs under the title row only)*
7. `src/components/shell/shell.module.css` › `.headerNoBorder` — retarget: it must now suppress `.headerTitleRow`'s border. Change to `.headerNoBorder .headerTitleRow { border-bottom-style: none; }` (and keep `.headerNoBorder { border-bottom-style: none; }` harmlessly, or delete it).
8. `src/components/shell/shell.module.css` › `.header` › `min-height` → `calc(var(--header-height) + var(--thin-pixel))` *(unchanged; still correct for the 1-band case)*
9. `src/components/shell/shell.module.css` › `.headerTitleRow` › `padding-left` → `8px`
10. `src/components/shell/shell.module.css` › `.headerTitleRow` › `gap` → `4px`
11. `src/components/shell/shell.module.css` › **add a new rule**
    ```css
    /* CAPTURED: title/breadcrumb cluster sits 10px inside the 8px band pad → +18 total */
    .headerTitleRow > :first-child { margin-left: 10px; }
    ```
    *(equivalently: give `Header.tsx` a `.headerTitleCluster` wrapper with `padding-left: 10px; padding-right: 4px; gap: 2px; flex: 1 1 auto; min-width: 0`)*
12. `src/components/shell/Header.tsx` — the projects header must place its primary action in the **right** cluster. Move the `New project` button from the `left` prop to the `right` prop at the call site (`src/app/[workspace]/projects/**` / `ProjectsTable.tsx` header usage). The title row is `space-between`: `[title cluster] … [right cluster gap:4px]`.
13. `src/components/ui/button.module.css` › `.size28` › `padding` → `0 10px 0 8px` *(captured labelled 28px pill: 8px left, 10px right)*
14. `src/components/ui/button.module.css` › `.iconOnly` › `padding` → `0 2px`
15. `src/components/shell/shell.module.css` › `.headerTitle` › **add** `line-height: normal;`
16. `src/components/shell/shell.module.css` › `.tab` › **add** `justify-content: center;`
17. `src/components/issues/detail/detail.module.css` (issue-detail header, via `shell.module.css`) — the issue page needs `padding-right: 12px` on the title row. Add a modifier: `shell.module.css › .headerTitleRowWide { padding-right: 12px; }` and apply it on the issue-detail header, **or** simply set `.headerTitleRow { padding-right: max(12px, var(--scrollbar-width, 0px)); }` if you accept 12px everywhere (capture uses 8px on projects/agent, 12px on issue detail).

### Tier 2 — icon sizing (fixes #6 — largest number of affected pixels)

18. `src/components/ui/button.module.css` › **add**
    ```css
    .size24 .icon > svg,
    .size28 .icon > svg { width: 14px; height: 14px; }
    .size32 .icon > svg,
    .size44 .icon > svg { width: 16px; height: 16px; }
    ```
19. `src/components/shell/sidebar.module.css` › **add** `.linkIcon > svg { width: 14px; height: 14px; }`
20. `src/components/shell/sidebar.module.css` › `.topIconBtn` › **add** `padding: 0 2px;` and change `border-radius: var(--radius-row)` → `var(--radius-rounded)`
21. `src/components/shell/sidebar.module.css` › **add** `.topIconBtn > svg { width: 14px; height: 14px; }`
22. `src/components/shell/sidebar.module.css` › `.teamIcon` › ensure `> svg { width: 14px; height: 14px; }`
23. `src/components/icons/Icon.tsx` › `size` default → **14** *(optional but recommended: 14 is the chrome default; the 16px sites are row-property glyphs which pass `size={16}` explicitly. If you change the default, audit every `<Icon>` call that relied on 16.)*

### Tier 3 — sidebar geometry (fixes #5, #9, #10, #11, #13, #15)

24. `src/components/shell/sidebar.module.css` › `.scroll` › `padding` → `13px 12px 0` *(nets the capture's effective 13px top inset; `padding-bottom: 0`)*
    *Preferred alternative (matches Linear exactly): keep `padding-top: 26px` and add the sticky scroll-fade element as the scroll area's first child:*
    ```css
    .scrollFade {
      position: sticky; top: -26px; left: 0; right: 0;
      height: 26px; margin-top: -39px; z-index: 10; opacity: 0;
      flex-shrink: 0; display: block;
      background-image: linear-gradient(to bottom, var(--color-bg-sub), transparent);
    }
    ```
25. `src/components/shell/sidebar.module.css` › `.workspaceBtn` › `border-radius` → `10px`
26. `src/components/shell/sidebar.module.css` › `.workspaceBtn` › `padding` → `0 9px 0 5px`
27. `src/components/shell/sidebar.module.css` › `.workspaceBtn` › `gap` → `6px`
28. `src/components/shell/sidebar.module.css` › `.workspaceAvatar` › `width` → `20px`, `height` → `20px`
29. `src/components/shell/sidebar.module.css` › `.workspaceName` › `font-weight` → `550`
30. `src/components/shell/sidebar.module.css` › `.workspaceName` › **add** `letter-spacing: -0.00625rem;`
31. `src/components/shell/sidebar.module.css` › `.workspaceName` › **add** `line-height: 1.4375rem;`
32. `src/components/shell/Sidebar.tsx` › the workspace chevron `<Icon>` → `size={8}` *(currently rendering 13×13; capture is 8×8)*
33. `src/components/shell/sidebar.module.css` › `.sectionHeader` › `height` → `28px`
34. `src/components/shell/sidebar.module.css` › `.sectionHeader` › `color` → `var(--color-text-muted)`
35. `src/components/shell/sidebar.module.css` › `.sectionHeader` › `padding` → `0 4px 0 9px` *(capture: wrapper 5px + button 4px → label lands at x=21)*
36. `src/components/shell/sidebar.module.css` › `.section` › `margin-top` → `15px` *(nets the captured 14px gap after the 1px link margin)*
37. `src/components/shell/sidebar.module.css` › `.sectionChevron` › `margin-left: 2px; margin-top: 1px;` *(replace the `gap: 4px` on `.sectionHeader`)*
38. `src/components/shell/sidebar.module.css` › `.teamChildLink` › `padding-left` → `25px` *(8 + 19 − 2; puts the child icon at x=37 like the capture)*
39. `src/components/shell/sidebar.module.css` › `.link` › **add** `line-height: normal;`
40. `src/components/shell/shell.module.css` › `.helpFloat` › `bottom` → `0`
41. `src/components/shell/shell.module.css` › `.helpFloat` › `position` → `absolute` *(and make `.panel` the containing block — it is already `position: fixed`)*; keep `left: 0; right: 0; padding: 10px; z-index: 10`
42. `src/components/shell/shell.module.css` › `.helpCard` › **delete the rule** (or gate `background`/`box-shadow` behind `:hover`) — the capture's rest state is fully transparent
43. `src/components/shell/Sidebar.tsx` › the help button → 24×20 with `border-radius: 50%`, `padding: 0 2px`, 14px icon *(currently a 28×28 pill via `shell.iconBtn`)*

### Tier 4 — settings, issue detail, agent toolbar (fixes #8, #12, #14)

44. `src/components/settings/settings.module.css` › `.contentMargins` › **add** `justify-content: center;` *(the 640px column must be centred in the card, not left-aligned)*
45. `src/components/issues/detail/detail.module.css` › `.grid` › **add** `font-size: 16px;` *(only affects `ch` resolution; every descendant sets its own size). Alternatively replace `minmax(0, 80ch)` with `minmax(0, 806px)`.*
46. `src/components/shell/shell.module.css` › `.agentPill` › `height` → `28px`
47. `src/components/shell/shell.module.css` › `.agentPill` › `border-radius` → `var(--radius-row)` *(8px)*
48. `src/components/shell/shell.module.css` › `.toolbarIconBtn` › `width` → `28px`, `height` → `28px`
49. `src/components/shell/shell.module.css` › `.toolbarIconBtn` › `border-radius` → `var(--radius-row)` *(8px)*
50. `src/components/shell/shell.module.css` › `.toolbarIconBtn` › **add** `padding: 0 2px;`
51. `src/components/shell/shell.module.css` › **add** `.toolbarIconBtn > svg, .agentPill > svg { width: 14px; height: 14px; }`
52. `src/components/shell/shell.module.css` › `.agentToolbar` › **add** `padding-top: 4px; margin-top: -4px; border-top: var(--thin-pixel) solid var(--color-border-solid);`
53. `src/components/shell/shell.module.css` › `.agentToolbar` › `left` → `var(--sidebar-width)` *(capture's strip starts at the sidebar edge, not x=0 — low visual impact, same bg colour)*
54. `src/components/shell/shell.module.css` › `.contentCard` › **add** `box-shadow: var(--shadow-low);`

### Tier 5 — icons: redraws (highest visual impact first)

55. `src/components/icons/Sprites.tsx` › `Project` — redraw as a **flat rounded-hexagon donut** (outer hex + inner hex cut, `fill-rule: evenodd`), 16×16, ~1.5u wall, 1px optical padding. *(19 refs — the single most-used sprite.)*
56. `src/components/icons/Sprites.tsx` › `Team` — redraw as a **rounded-square frame donut** (1→15, rx 2.5) containing **one** bust (head r≈2 at cy 6 + shoulder sweep). *(17 refs.)*
57. `src/components/icons/Sprites.tsx` › `ChevronDown` / `ChevronRight` — the sidebar section marker must be a **solid filled triangle** ~4.75 × 5.25, apex right, rotated 90° when expanded — **not** a chevron. Keep a separate chevron for other roles. *(45 uses.)*
58. `src/components/icons/Sprites.tsx` › `Filter` — redraw as **3 stacked horizontal bars, decreasing width**, 1.5 tall each: y3 (1.75→14.25), y7.25 (4→11.25), y11.5 (6.75→9.25).
59. `src/components/icons/Sprites.tsx` › `MyIssues` — redraw as **4 corner brackets** (viewfinder), `fill-rule: evenodd`.
60. `src/components/icons/Sprites.tsx` › `Calendar` — remove the two "ears", raise the corner radius to **rx 4**, keep the top 5u as a solid header band.
61. `src/components/icons/Sprites.tsx` › `Inbox` — fix the malformed path (`H1.8 … -1.8` puts the left wall at x=0); redraw symmetric 1→15 with a 2.5r rounded shell.
62. `src/components/icons/Sprites.tsx` › `SidePanel` — frame rx 3.25 outer / 2 inner, and replace the full-height rail with a **centred pill** `x=10 y=5 w=1.5 h=6 rx=0.75` (collapsed) / `x=7 w=4.5` (expanded); animate `x`/`width`.
63. `src/components/icons/Sprites.tsx` › `Agent` — replace the 4-point sparkle with a quill/ribbon silhouette.
64. `src/components/icons/Sprites.tsx` › `Home` — the sidebar variant must be **stroke `1.5`, `fill: none`** (outline house, 3.5-wide door); keep the filled variant for the Base sprite role.
65. `src/components/icons/Sprites.tsx` › `Favorite` — make the default state a **star donut** (outer star outline + inner star cut, wall ≈1.5); keep the solid star for the active state.
66. `src/components/icons/Sprites.tsx` › `Label` — make the tag an outline **donut**, not a solid with a hole.
67. `src/components/icons/Sprites.tsx` › `ClockOutline` — add the **counter-clockwise revert arrowhead** at the 9-o'clock position (it is a history glyph, not a plain clock).
68. `src/components/settings/glyphs.tsx` › `back` — replace the arrow-with-shaft with a **bare chevron-left**, thickness 1.5, spanning x 5.18 → 10.53. Then delete the duplicate `BackGlyph` in `src/components/issues/FilterBar.tsx` and `src/components/projects/ProjectFilterBar.tsx` and import the one definition.
69. `src/components/icons/Sprites.tsx` › `Search` — shrink to r5 outer / r3.5 inner, handle end (13.78, 13.78).
70. `src/components/icons/Sprites.tsx` › `Plus` — arms 1.5 thick, span 3.25 → 12.75. Delete the duplicates in `src/components/ui/GroupHeader.tsx` and `src/components/settings/glyphs.tsx`.
71. `src/components/icons/Sprites.tsx` › `Attachment` — rescale the paperclip to span 4.4 → 12.6 (currently 1.06 → 15.0).
72. `src/components/icons/Sprites.tsx` › `Send` — shaft 1.5 wide, y 3.1 → 12.25, head 6 wide.
73. `src/components/icons/Sprites.tsx` › `More` — circle `r` 1.4 → **1.5**.
74. `src/components/icons/Sprites.tsx` › `DisplayOptions` — rails at y5 / y11 (from y4.5 / y11.5); knobs become pill-ended lozenges.
75. `src/components/icons/Sprites.tsx` › `Compose` — split into 2 paths (open frame with the top-right corner omitted + separate nib); pull the nib inside x=15.
76. `src/components/icons/Sprites.tsx` — **add** a dedicated workspace chevron at `viewBox="0 0 13 9"` (fill, spans 12.1 × 7.17, thickness 1.5) and a select chevron at `viewBox="0 0 9 5"` (spans 8 × 4.2, thickness 1.33); point `Sidebar.tsx` and `ui/Select.tsx` at them.
77. `src/components/projects/glyphs.tsx` › `SHIELD_OUTLINE` — round every hexagon vertex (cubics, not `L`), and shrink the span from 0.94→13.06 to **1.75→12.25**.
78. `src/components/projects/glyphs.tsx` › `MilestoneDiamond` — redraw as a **rounded-corner kite 9.58 wide × 11.36 tall**; remove `opacity: 0.4` from the outline variant (colour carries state); **add** the not-started variant `stroke-dasharray="2 1.93"`.
79. `src/components/projects/glyphs.tsx` › health circle › `stroke-width` → **`1`** (currently 1.5).
80. `src/components/icons/StatusIcon.tsx` › inactive priority bars → `fill-opacity: 0.4` (currently `color-mix(… 35%, transparent)`).
81. `src/components/icons/StatusIcon.tsx` › issue-status inner arc `stroke-dasharray` denominator → **`22.6195`** (currently `12.566`) — cosmetic parity with the capture DOM.
82. `src/components/projects/ProjectsTable.tsx` › `sortChevron` — add the **vertical shaft** path (`M8.75 12.25 … V3.75`, 1.5 wide, y3→13) so asc/desc reads as an arrow.
83. Consolidate duplicates: one **filled** 16×16 check (adopt the existing `M12.78 4.72a.75…` from `ui/Select.tsx`) replacing the 7 stroked variants in `ui/Checkbox.tsx`, `ui/Menu.tsx`, `issues/FilterBar.tsx`, `projects/ProjectFilterBar.tsx`, `issues/pickers/PickerMenu.tsx`, `nav/WorkspaceMenu.tsx`, `issues/CreateIssueModal.tsx`.
84. Consolidate the **no-lead / no-assignee** glyph to one filled 16×16 definition (solid bust + 4 discrete filled arc segments at N/E/S/W), replacing the 5 stroke variants in `ProjectsTable.tsx`, `IssueList.tsx`, `MyIssuesView.tsx`, `detail/PropertyRail.tsx`, `CreateIssueModal.tsx`/`Peek.tsx`/`CommandPalette.tsx` and the 2 plain dashed circles in `pickers/propertyItems.tsx`, `projects/pickers.tsx`.
85. Convert the remaining stroke-based glyphs in §C.4 to filled paths at `viewBox="0 0 16 16"`.
86. Add the missing glyphs: `Issues` (stacked cards), `Loops`, `Skills`, `Connected`, `Face`, `Page`, `Refresh`, `Blockquote`, `Checklist`, `CodeBlock`, `CreditCard`, todo drag handle (`viewBox="0 0 6 10"`).
87. Move `ClockOutline` and `QuestionMark` from the Base sprite set to Decorative.

### Tier 6 — legal (do these regardless of visual priority)

88. **Delete** `/Users/moon/Documents/linear/public/next.svg` (Next.js wordmark — unreferenced).
89. **Delete** `/Users/moon/Documents/linear/public/vercel.svg` (Vercel mark — unreferenced).
90. `src/app/login/glyphs.tsx` › `ProductMark` — redesign away from "three parallel diagonal slabs in a rounded square"; that gestalt reads as a Linear-alike at 32px.
91. *(optional)* delete unreferenced `public/file.svg`, `public/globe.svg`, `public/window.svg`.

### Tier 7 — typography and colour polish

92. `src/components/shell/shell.module.css` › `.headerTitle` › `line-height: normal` (also item 15)
93. `src/components/shell/sidebar.module.css` › `.link`, `.teamRow` › `line-height: normal`
94. `src/components/agent/agent.module.css` › editor › **add** `letter-spacing: -0.00666667em;`
95. `src/components/shell/shell.module.css` › the `Add new view` (`+`) button → `--icon-default-color: var(--color-text-faint)` *(capture renders it one tier dimmer than its neighbours)*
96. `src/components/ui/button.module.css` › `.primary` › `color` / `--icon-*` → `var(--color-text-title)` instead of literal `lch(100% 0 272)`
97. `src/components/inbox/inbox.module.css` › `#ffffff` → `var(--color-text-title)`
98. `src/components/ui/dialog.module.css` › `rgba(0, 0, 0, 0.4)` → new `--color-scrim` token in `tokens.css`
99. `src/components/ui/toggle.module.css` › the two raw `lch(...)` track colours → new `--color-toggle-track` / `--color-toggle-track-hover` tokens
100. `src/components/settings/settings.module.css` › the two raw green `lch(...)` values → new `--color-green` / `--color-green-ring` tokens
101. `src/components/shell/sidebar.module.css` › implement the scroll-driven sidebar fade (`scroll-timeline-name: --sidebar-content-scroll` on `.scroll`, `animation-timeline: --sidebar-content-scroll; animation-range: 0px 26px` on the fade element) — a Linear signature currently missing.

---

### Verification after the fixes

Re-run the same measurement at 1914×992 and confirm:
- `/projects/all`: `<header>` height **115px**; list grid starts at **card-top + 116px**; `h2` at **card-inner + 18px**; `New project` right edge at **card-inner-right − 8px**.
- Sidebar: first nav link top at **y = 66**; every chrome `<svg>` **14×14**; section header **28px** tall.
- `/settings/account/preferences`: content column x = **755**.
- `/issue/TRENDZO-37/...`: grid columns **≈140.9 / 806.25 / 400 / 140.9**, gap 56.
- Agent toolbar: `Agent` pill **28px** tall, `radius 8px`; `Chat history` **28×28**, `radius 8px`.
