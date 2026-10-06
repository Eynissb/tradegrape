---
name: Tradegrape — Financial Terminal (public home)
description: A dark, data-first futures prop-firm terminal — flat near-black ground, 1px hairlines, no glass on data.
colors:
  bg: "#070510"
  bg2: "#0b0818"
  ink: "#f2eefb"
  ink2: "#b6a8d4"
  ink3: "#7d6f9a"
  muted-scan: "#9a8cbe"
  hairline: "rgba(150,110,240,0.16)"
  accent-indigo: "#5b3fff"
  accent-fuchsia: "#c04bff"
  hot-magenta: "#ff3ba6"
  state-ok: "#38ffb0"
  state-warn: "#ffb43b"
  state-bad: "#ff4d5e"
  on-accent: "#0f0520"
typography:
  display:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.4vw, 3.3rem)"
    fontWeight: 800
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 2.6vw, 2.05rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Sora, system-ui, sans-serif"
    fontSize: "1.02rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(14.5px, 1.05vw, 16.5px)"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  data:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  grid-number:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
    fontFeature: "tabular-nums"
  label:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.06em"
rounded:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  pill: "999px"
spacing:
  ctl-sm: "32px"
  ctl-md: "40px"
  ctl-lg: "48px"
  section: "76px"
components:
  button-primary:
    backgroundColor: "{colors.accent-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "0 2.25rem"
    height: "{spacing.ctl-lg}"
  button-primary-hover:
    backgroundColor: "{colors.accent-fuchsia}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.06)"
    textColor: "{colors.ink2}"
    rounded: "{rounded.pill}"
    padding: "0 1.8rem"
    height: "{spacing.ctl-md}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink2}"
    rounded: "{rounded.pill}"
    padding: "0 1.8rem"
    height: "{spacing.ctl-md}"
  data-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    padding: "12px 14px"
  badge-trail:
    backgroundColor: "rgba(255,180,59,0.12)"
    textColor: "{colors.state-warn}"
    rounded: "5px"
    padding: "3px 6px"
    typography: "{typography.label}"
  payout-gradient:
    backgroundColor: "{colors.accent-indigo}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "16px 18px"
---

# Design System: Tradegrape — Financial Terminal

Scope: this document records the **public home** visual world (the `.term-*` surface established by the data-first redesign, seed 9a410e7a). It sits on the project's locked brand tokens (`app/globals.css`) and shares them with the authenticated product; where the product's glass/relief UI system (`.ui`, `app/design-tokens.css`) differs, the difference is a deliberate boundary, noted below. All numbers on the home come from the published catalogue at build time; none are hard-coded.

## Overview

**Creative North Star: "The Quotation Terminal"**

The home is not a landing page; it is the screen a futures trader stares at. Its whole argument — *we execute the rules competitors merely describe* — is carried by one dense, aligned, scannable table of real accounts, dropped straight under a tight masthead. The mood is instrument-panel, not marketing: a flat near-black violet-tinted ground (#070510), 1px hairline rules instead of boxes, monospace column headers, and numbers that hold their column. Depth is almost entirely refused on data surfaces. The one warmth in the room is the indigo→fuchsia brand gradient, and it is spent on exactly one block per page.

The palette makes the product's honesty POV visible: risk states (lime / amber / red) do the talking on every rule cell, and the brand accent is forbidden from ever carrying a data value. A trader reads the table the way they read a DOM ladder — trailing drawdown flags amber, a funded-phase rule hardening flags red, a verified row shows a lime dot and a date. Nothing pulses falsely; the one live-looking dot is static because the data is dated, not streaming.

Confirmed anti-references (rejected during the world choice): the pastel, rounded fintech look; the marketing card-grid of competitor comparison sites; and any blue/cyan, which is banned outright. Glass and directional-relief surfaces are **not** rejected — they are the product's navigation and app language — but they are kept off the home's data.

**Key Characteristics:**
- Flat near-black ground; structure drawn with 1px hairlines, never cards or shadows, on data.
- One brand gradient fill per page; everything else that reads as "signal" is a risk state color.
- Monospace only for measurement (column heads, grid figures, status readouts); Sora display, Inter body.
- Risk semantics (lime/amber/red) own every rule cell; the brand accent never touches data.
- One authored motion: a capped, staggered row cascade — content fully visible without it.

## Colors

A near-black violet ground carrying a two-stop brand gradient for a single accent moment, over a strict three-state risk vocabulary that does all the informational color work.

### Primary
- **Accent Indigo** (#5b3fff): The cool end of the brand gradient and the resting fill of the primary button. Structural accent only — the `is-top` row rail, active controls, and the primary CTA. Never a data value.
- **Accent Fuchsia** (#c04bff): The warm end of the gradient; also the standalone accent for the emphasized `<em>` in the H1, the top-row rank number and rail, the open-FAQ marker, and the hover state of the row chevron. It marks *what to look at*, never *what a number means*.

### Secondary
- **Hot Magenta** (#ff3ba6): Reserved punctuation only (`--hot`). Present in the token set for a hotter gradient variant; used sparingly, never as a state.

### Tertiary — Risk States (the working palette)
- **State OK / Lime** (#38ffb0): Good news and confirmation — rating ≥8, "unchanged" funded rule, "no consistency rule", the verified dot, honesty-point OK dot, the status readout value.
- **State Warn / Amber** (#ffb43b): The caution the product is built to surface — TRAIL drawdown badge, a present consistency percentage, ratings 4–7, the "unverified" flag.
- **State Bad / Red** (#ff4d5e): Real hardening — a funded-phase rule that toughens (EOD→TRAIL, drawdown tightening), ratings <4.

### Neutral
- **Ground** (#070510) / **Raised Ground** (#0b0818): The flat page and the one darker solid surface (journal preview card, stacked mobile offer cards). No gradients, no glass on either.
- **Ink** (#f2eefb): Primary text — headings, firm names, prices, gauge values.
- **Ink-2** (#b6a8d4): Secondary text — subheads, body, gauge labels, step bodies.
- **Ink-3** (#7d6f9a): Decorative/muted only — dashes, unfilled labels, section furniture.
- **Muted Scan** (#9a8cbe): The AA-safe substitute for Ink-3 wherever small text carries *scannable information* on the near-black ground (column headers, plan name, rank, readout note, count pill, legend). Ink-3 (~4.4:1) fails small-text AA here; Muted Scan (~6:1) clears it.
- **Hairline** (rgba(150,110,240,0.16)): The single divider material — 1px borders between readout cells, under the table head, around the raised card. Structure is drawn with hairlines, not fills.

### Named Rules
**The No-Accent-On-Data Rule.** The indigo/fuchsia brand accent may mark a control or an active/emphasis state, but it may never encode the value of a datum. Every informational color on a data cell is lime, amber, or red. If a number's color would tell you something, it is a state color — the accent's job is attention, the state's job is meaning.

**The Muted-Scan Floor.** Small text that a user is meant to *read as information* uses Muted Scan (#9a8cbe), not Ink-3. Ink-3 is for furniture only. If it labels a column or names a plan, it clears AA.

## Typography

**Display Font:** Sora (with system-ui, sans-serif) — `--font-display`. Note: `--font-title` is undefined in this project; use `--font-display` for all Sora.
**Body Font:** Inter (with system-ui, sans-serif) — `--font-body`.
**Label / Mono Font:** JetBrains Mono (with ui-monospace, monospace) — `--font-mono`.

**Character:** Sora is tight and confident at heavy weights (800 for display) with strong negative tracking — it reads as a headline instrument label. Inter carries all body and, crucially, all product data in tabular figures. JetBrains Mono is the terminal's measurement voice: column headers, grid numbers, status readouts, the FAQ +/− marker.

### Hierarchy
- **Display** (Sora 800, clamp(2rem, 4.4vw, 3.3rem), lh 1.03, tracking -0.035em): The masthead H1 only (`term-title`), max ~20ch, with a fuchsia `<em>`.
- **Headline** (Sora 800, clamp(1.5rem, 2.6vw, 2.05rem), tracking -0.03em): Section H2s (`term-h2`).
- **Title** (Sora 700, ~1.02rem): Step titles, honesty-fact titles, FAQ questions (15.5px), gauge/dash headings.
- **Body** (Inter 400, clamp(14.5px, 1.05vw, 16.5px), lh 1.55): Subheads (max 62–72ch), step and fact bodies, FAQ answers (max 76ch).
- **Data** (Inter 700, ~14px, `tabular-nums`): Prices, split, drawdown amounts, sizes, ratings — the product-wide number style (`.num`/`.tabular`).
- **Label** (JetBrains Mono, 10.5–12px, tracking 0.02–0.08em, UPPERCASE): Column headers, readout keys, status line, scroll hint, step numbers, badges, the "example" tag.

### Named Rules
**The Mono-Measures-Only Rule.** JetBrains Mono is confined to *measurement chrome and grid figures on this terminal surface*: column headers, the numeric readout values (`.tnum`), grid cell numbers, step numbers, badges, status line. This is a scoped reopening of the product's standing "mono rejected for data numbers" decision — it applies to the home terminal grid, where the mono says "instrument", and nowhere else. Everywhere else in the product, data numbers stay Inter tabular (`.num`). Body prose and headings are never mono.

**The Tabular-Number Rule.** Every figure a user compares down a column is set in tabular figures (`.tnum` mono on the grid, `.num` Inter elsewhere) so digits hold their width and columns never jitter.

## Layout

A single fluid container (`--container: min(2000px, 94vw)`) runs the masthead and every section; the home does not use the narrower content/auth containers. Vertical rhythm is generous: sections are spaced `76px` apart (`56px` under 560px), the first section only `30px` under the masthead.

**The masthead** is a tight, left-aligned column: static status line → H1 (Sora 800, max 20ch) → subhead (max 62ch) → CTA pair → a numeric readout strip. The readout is a hairline-bordered horizontal band of key/value cells split by 1px rules — a terminal header, not stat cards.

**The offer table** is the centerpiece: a 12-column CSS grid (`term-grid`, `min-width: 1240px`) built on `<div>`/`<Link>` rows, not a `<table>` (a table can't carry the row treatment). Columns: rank · firm · rating · size · price · drawdown · funded · consistency · split · platforms · verified · chevron.

**Responsive grammar (three bands):**
- **≥1321px container:** the full grid fits; no scroll.
- **861–1320px:** the grid exceeds its container and scrolls horizontally *inside its own `term-scroll` box* (never the page); a monospace scroll hint appears only in this band.
- **≤860px:** the grid stops scrolling and **stacks into one labeled card per offer** — each cell becomes a row whose `data-label` (`::before`) supplies the vanished column header; the firm cell caps the card, the chevron is dropped, and the top row is marked by a 1px accent border instead of the 3px rail.
- **1000px:** the journal split (`1.05fr .95fr`) and the 3-up honesty band collapse to single column.
- **≤560px:** masthead reflows, CTAs and readout go full-width.

## Elevation & Depth

**Flat by rule on data.** The home uses **no shadows and no glass on any data surface**. Depth and grouping are conveyed by (1) 1px hairlines, (2) the flat raised ground #0b0818 for the two solid containers (journal preview, stacked mobile cards), and (3) a barely-there CRT scanline overlay on the masthead (`repeating-linear-gradient`, ~1.4% white) that signals "screen" without gloss. Row separation is a 1px bottom hairline; hover is a faint indigo tint wash (`rgba(120,90,255,0.07)`), not a lift.

### Named Rules
**The Flat-Data Rule.** Data surfaces — the table, rows, readout, gauges — carry no drop shadow, no backdrop-filter, no card chrome. Structure is hairlines and tint. (This is the home's boundary against the product's `.ui` relief/glass system, which is legitimate elsewhere: glass is reserved for the product's floating navigation layer — header, menus, modals — and never appears on data. Do not import that relief onto the terminal, and do not ban glass product-wide.)

## Shapes

Small, functional radii; the language is rectangular and instrument-like, not pillowy. `--r-xs 6px` (promo codes), `--r-sm 8px` (logos, badges~5–7px), `--r-md 12px` (readout, payout block, mobile fields), `--r-lg 16px` (journal preview card, stacked offer cards), `--r-pill 999px` (all buttons and the count chip). Badges and rating pills are the tightest corners (5–7px). Borders, when present, are 1px hairlines in the violet-tinted divider color; the only accent border is the top-row rail (3px solid fuchsia) and the mobile top-card border. No dashed borders on the home.

## Components

### Buttons
- **Shape:** Full pill (`--r-pill`, 999px). Natural width with a `min-width` (10rem md / 11rem lg); full-width only on mobile (≤560px, where `.term-cta .btn` stretches).
- **Primary:** Indigo→fuchsia — resting indigo fill (#5b3fff), white text; the single primary action per view. `lg` in the masthead ("Compare"), `md` on section CTAs.
- **Hover / Focus:** Hover brightens/shifts toward fuchsia; focus is the accent double-ring (`--focus-accent`, 2px, offset).
- **Secondary:** Neutral pill, faint white fill, Ink-2 text; used for the "Open the comparator" FAQ CTA.
- **Ghost:** Transparent at rest, lifts to a faint fill on hover only.

### Data Row (signature component)
- **Structure:** A full-bleed `<Link>` (whole row clickable), 12-column grid, `12px 14px` padding, 1px bottom hairline. No card, no shadow.
- **Hover:** Faint indigo tint (`rgba(120,90,255,0.07)`); the chevron turns fuchsia and nudges 2px right.
- **Top row (`is-top`):** Most-reliable offer — very light indigo wash plus a **3px solid fuchsia rail** (`--c2`, a *solid* accent, deliberately not a gradient), fuchsia rank number.
- **Accessibility:** The visual header row is `aria-hidden`; the rows are a list of real links, each with a composed `aria-label` naming firm, plan, rating, size, price, and action. On mobile the rail becomes a 1px accent border (a >1px colored border or a second gradient would break the rules).

### Signal Cells (badges, notes, dots)
- **Rating pill:** min 28×24px, 7px radius, tinted-fill + inset ring in the state color (ok/warn/bad by threshold ≥8 / ≥4 / <4).
- **Drawdown badge:** mono uppercase micro-label, 5px radius. TRAIL → amber tint+ring; flat (EOD/STATIC) → neutral white tint.
- **Funded (hardening):** "unchanged" → plain lime text; any hardening → red tinted pill with ring.
- **Consistency:** a percentage → amber; absent → lime "none".
- **Verified:** lime dot (subtle glow) + date; else amber "unverified".
- **Legend:** three swatch chips (amber/red/lime) decoding the signals below the table.

### Numeric Readout (masthead)
Hairline-bordered horizontal band; each cell = mono uppercase key + large Ink value (`.tnum`, clamp 1.5–1.95rem) + optional Muted-Scan note. Cells split by 1px vertical rules. A terminal header strip, not cards.

### Journal Preview (solid card)
The one raised container: flat #0b0818 fill, 1px hairline, `--r-lg`. Holds an "example"-tagged account with three gauges (label + tabular value + thin track/fill bar in a soft periwinkle, *not* a state color — it is illustrative) and, beneath them, the payout gradient block.

### Payout Gradient Block (the single gradient)
The **only gradient fill on the page**: the "what you still need to withdraw" block — indigo→fuchsia (`--grad`), white text, `--r-md`, Sora 800 value. This is the product's signature moment; it is placed on the most decisive block that does *not* already carry a semantic state color.

### FAQ
Native `<details>` list separated by hairlines; Sora 700 questions; a mono `+` marker that flips to a fuchsia `−` when open.

## Do's and Don'ts

### Do:
- **Do** keep data surfaces flat: hairlines (1px, violet-tinted) and tint washes for structure, never cards or shadows on the table, rows, or readout.
- **Do** spend exactly one gradient fill per page, on the payout block; make every other "signal" a lime/amber/red state.
- **Do** use lime/amber/red for every rule/state cell (TRAIL=amber, funded hardening=red, unchanged/verified/no-consistency=lime, present-consistency=amber).
- **Do** set grid figures and measurement chrome in JetBrains Mono `.tnum`; set all other data numbers in Inter tabular `.num`; set body and headings in Inter/Sora.
- **Do** use Muted Scan (#9a8cbe) for small scannable text; reserve Ink-3 for furniture.
- **Do** gate the row cascade behind `prefers-reduced-motion: no-preference` and cap the stagger (~13ms × up to 26 rows); content is fully visible without it.
- **Do** stack the table into labeled per-offer cards below 860px; scroll it inside its own box (with the hint) between 861–1320px.
- **Do** keep whole rows as real links with composed aria-labels and the visual header row aria-hidden.

### Don't:
- **Don't** use the brand accent (indigo/fuchsia/magenta) to encode a data value — accent marks attention or an active control, never meaning.
- **Don't** use any blue or cyan, anywhere. The direction is tested and rejected.
- **Don't** add a second gradient, or make the top-row rail a gradient — it is a *solid* fuchsia.
- **Don't** put glass or directional-relief (`.ui` elevation) on the home's data; that language belongs to the product's floating nav layer, not here — but don't ban glass across the product either.
- **Don't** render the table as a `<table>` or let it scroll the page; it is a grid of links that scrolls only inside `term-scroll`.
- **Don't** pulse the live dot or fake a stream — the dot is static because the data is dated, not real-time.
- **Don't** promote Ink-3 to carry small informational text on the near-black ground (it fails AA); use Muted Scan.
