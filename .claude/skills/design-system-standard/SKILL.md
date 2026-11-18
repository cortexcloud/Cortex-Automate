---
name: design-system-standard
description: Reusable UI design system (color tokens, radius/shadow/motion scale, typography, and a cataloged set of component patterns — buttons, cards, badges, data tables, forms, banners, modals, top nav) extracted from the Test Runner (Cortex QA) app. Use whenever creating or styling UI in a new or existing app — choosing colors, building buttons/cards/badges/tables/modals/forms, or setting up a project's base stylesheet/theme — to keep visual language consistent across apps instead of inventing a new one per project.
---

# Design System Standard

Extracted from `web/app/globals.css` in the Test Runner (Cortex QA) app —
that file is the canonical, always-up-to-date reference implementation of
everything below. This skill is a portable copy of its *system*, not a
fork: when the two disagree, treat `globals.css` as source of truth and
update this file to match, not the other way around.

## Origin & philosophy

- **Visual identity**: Jira/Atlassian's actual palette (structure + color
  identity), with Linear-style shadows/radius/motion layered on top — not a
  new hue set, a specific pairing of an established enterprise palette with
  softer, more modern surface treatment.
- **Stack**: plain CSS + CSS custom properties (`:root` tokens). No
  Tailwind, no CSS-in-JS, no component framework — hand-rolled, class-based.
- **Baseline is light-mode only.** Dark mode is **not defined anywhere in
  this system** — don't assume it's covered; treat it as a gap to design
  fresh if a project needs it.
- **Bilingual type pairing**: a Latin sans (Geist Sans in the source app)
  paired with Noto Sans Thai for Thai-language UI, falling back to system
  fonts. Reuse this pairing for any EN/TH bilingual product.
- **Accessibility**: `:focus-visible` outlines are handled everywhere;
  nothing beyond that has been audited (contrast ratios, screen-reader
  labeling, etc. — verify per project, don't assume compliance).

## Design tokens

The complete token block — copy this verbatim into a new project's global
stylesheet as the starting point:

```css
:root {
  --background: #f4f5f7;
  --foreground: #172b4d;
  --bg-card: #ffffff;
  --bg-subtle: #f4f5f7;
  --border-color: #dfe1e6;
  --border-subtle: #ebecf0;
  --accent-color: #0052cc;
  --accent-hover: #0747a6;
  --accent-soft: #deebff;
  --text-secondary: #5e6c84;
  --text-faint: #97a0af;
  --pass-color: #00875a;
  --pass-bg: #e3fcef;
  --in-progress-color: #0052cc;
  --in-progress-bg: #deebff;
  --fail-color: #de350b;
  --fail-bg: #ffebe6;
  --block-color: #ff991f;
  --block-bg: #fff7d6;
  --out-of-scope-color: #42526e;
  --out-of-scope-bg: #dfe1e6;
  --notrun-color: #6b778c;
  --notrun-bg: #ebecf0;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-xs: 0 1px 2px rgba(16, 24, 40, 0.05);
  --shadow-sm: 0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04);
  --shadow-md: 0 4px 12px -2px rgba(16, 24, 40, 0.08), 0 2px 6px -2px rgba(16, 24, 40, 0.04);
  --shadow-lg: 0 12px 24px -6px rgba(16, 24, 40, 0.12), 0 4px 8px -4px rgba(16, 24, 40, 0.06);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
```

Token groups, what they mean, when to reach for them:

| Group | Tokens | Use for |
|---|---|---|
| Surfaces | `--background`, `--bg-card`, `--bg-subtle` | Page background, card/panel background, subtle recessed areas (hover states, static-value fields) |
| Text | `--foreground`, `--text-secondary`, `--text-faint` | Primary text, secondary/caption text, faintest labels (e.g. section eyebrows) |
| Borders | `--border-color`, `--border-subtle` | Interactive element borders (inputs, buttons) vs. structural dividers (card edges, table rows) |
| Accent | `--accent-color`, `--accent-hover`, `--accent-soft` | Primary brand/action color, its hover state, and a soft tint for badges/focus rings/backgrounds |
| **6-state status** | `--pass-*`, `--in-progress-*`, `--fail-*`, `--block-*`, `--out-of-scope-*`, `--notrun-*` (color + `-bg` pair each) | Any pass/in-progress/fail/blocked/out-of-scope/not-run-style state — a domain pattern from QA test execution, reusable anywhere a multi-way outcome status applies |
| Radius | `--radius-sm/md/lg` (8/10/14px) | Small controls → cards, roughly smallest-to-largest surface |
| Shadow | `--shadow-xs/sm/md/lg` | Resting state → hover/elevated state → modals/floating elements, in that order |
| Motion | `--ease-standard` | The one easing curve used everywhere; transitions are short (0.12s-0.2s) |

## Typography

```css
body {
  font-family: var(--font-geist-sans), var(--font-thai), "Segoe UI", Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
}
h1, h2, h3 { margin: 0; font-weight: 700; letter-spacing: -0.01em; text-wrap: balance; }
h1 { font-size: 1.6rem; }
h2 { font-size: 1.2rem; }
h3 { font-size: 1rem; }
```

`font-variant-numeric: tabular-nums` matters for anything showing numbers in
a column or updating in place (stat cards, data tables) — keeps digits from
shifting width. Body copy generally runs smaller: 0.85-0.92rem is the norm
for secondary text/labels, 0.72rem for all-caps eyebrow/section labels
(`letter-spacing: 0.04-0.06em; text-transform: uppercase`).

## Component catalog

Each entry: class name(s), when to use it, and the shape reused verbatim
from the source app. Full CSS for every class lives in
`web/app/globals.css` in the Test Runner app — treat these as the "what and
why," and copy the real declarations from there (or the excerpts below)
rather than re-deriving them.

- **Buttons** — `.btn` (base: bordered, white background, `--shadow-xs`,
  lifts on hover), `.btn-primary` (accent-filled), `.btn-sm` / `.btn-lg`
  (size variants), `.btn-danger-text` (text-only destructive action). A
  disabled button drops to `opacity: 0.5` and kills the hover lift — don't
  use `disabled` for a "blocked but explain why" case (see
  `.btn-danger-text--blocked`, which stays clickable to open an explanatory
  modal).
- **Cards & surfaces** — `.card` (white surface, `--radius-lg`,
  `--shadow-sm`, lifts to `--shadow-md` + `translateY(-1px)` on hover when
  it's a link). `.empty-state` for zero-data placeholders (centered,
  muted, generous padding).
- **Badges & pills** — `.stat-pill` (neutral by default, `.pass`/`.fail`/
  `.block` modifiers recolor it via the 4-state tokens), `.tag-pill`
  (same shape, different semantic use), `.gate-badge` (`.ready`/`.notready`
  — pill-shaped, bold, larger padding, for a single prominent go/no-go
  status), `.critical-badge` (small, fail-colored, for flagging severity).
  `.status-btn` group is the interactive version — a row of toggleable pills
  for a 4-state field (`data-status="passed|failed|blocked|notrun"` driving
  the active color via the same tokens).
- **Data tables** — `.data-table-wrap` (card-like container, scrolls
  horizontally) > `.data-table` with uppercase, secondary-colored `<th>`,
  `14px 16px` cell padding, bottom-border row dividers (no vertical
  borders). `.sortable-header` for clickable sort columns (cursor +
  hover-to-accent-color). `.stats-bar` (search + count, above the table) and
  `.pagination-bar` (page-size select + controls + status text, below it)
  are the standard header/footer chrome for any admin list.
- **Forms** — `.field-row` (responsive auto-fill grid of labeled fields,
  label is uppercase/bold/secondary-colored above the input), inputs get
  `--radius-sm`, `--border-color`, and an accent focus ring
  (`box-shadow: 0 0 0 3px var(--accent-soft)` on `:focus-visible`).
  `.checkbox-row` for a single labeled checkbox. `.toggle-switch` (`.on`/
  `.off` states, pass-color when on) for boolean settings. `.field-static-value`
  for a read-only field rendered as text, not an input.
- **Banners** — one shared shape (`display:flex`, icon+text, `--radius-md`,
  `12px 16px` padding, bold 0.85rem text) reused three times with different
  token pairs: `.error-banner` (fail), `.success-banner` (pass),
  `.warning-banner` (block). Adding a 4th semantic banner should follow the
  same shape with the matching token pair rather than inventing new colors.
- **Modals & lightbox** — `.modal-overlay` (fixed, centered, dark
  translucent backdrop `rgba(9,30,66,0.54)`) > `.modal-card` (`--radius-lg`,
  `--shadow-lg`, max-width 560px, scrolls internally past 85vh). `.modal-footer`
  right-aligns action buttons. `.lightbox-overlay`/`.lightbox-img` is the
  same overlay pattern at a darker backdrop (`0.75` alpha) for full-size
  image viewing.
- **Top nav** — `.top-nav` (sticky, white, `--shadow-xs`, space-between
  layout), `.top-nav-brand` with a `.top-nav-mark` (small accent-colored
  square as a logo mark), `.manage-menu` dropdown pattern
  (`.manage-menu-btn` → `.manage-menu-panel`, absolute-positioned), `.avatar`
  (circular, accent-soft background) + `.user-chip` for the signed-in user.
- **Evidence / attachment thumbnails** — `.evidence-pastezone` (dashed
  border, accent on hover/focus — a paste/drop target), `.evidence-thumb`
  (64×64, rounded, `cursor: zoom-in`) with an absolutely-positioned
  `.evidence-thumb-remove` circular delete button in the corner.
- **Print-friendly report layout** — `.report-paper` (a bounded, card-like
  "document" surface, 860px max-width) with `.report-header`,
  `.gate-banner` (`.approved`/`.rejected`, solid pass/fail background,
  white text — a full-bleed verdict banner), `.kpi-grid`/`.kpi-card` for
  headline numbers, `.report-table`, and `.signature-section` for a
  print-only sign-off block. Wrap non-printable chrome (toolbars, nav) in
  `.no-print`; the `@media print` block itself drops shadows and expands
  the paper to full width.
- **Filter picker** — `.filter-picker` + `.filter-picker-panel` (absolute
  dropdown, checklist-based) with `.filter-pill` chips showing active
  selections above it — the pattern for any "pick N items from a
  categorized list" control (tags, scenarios, sites, etc.).

## Adoption guidance for a new project

1. **Always port the tokens exactly** — the `:root` block above, unchanged.
   This is the actual standard; everything else is one valid expression of
   it.
2. **Same stack (Next.js/plain CSS/CSS Modules)**: copy component classes
   verbatim from `web/app/globals.css` as needed — don't rewrite from
   scratch.
3. **Different stack** (Tailwind, CSS-in-JS, another framework): re-express
   each component pattern in that stack's idiom, but keep the values —
   same radii, same shadow curves, same color roles, same 4-state status
   mapping. E.g. in Tailwind, wire the tokens into `theme.extend.colors`/
   `borderRadius`/`boxShadow` rather than hardcoding hex values inline.
4. **Don't invent new hues** for new semantic states before checking if an
   existing token already covers the intent (e.g. a "warning" state should
   almost always reuse `--block-color`/`--block-bg`, not a new orange).

## Known gaps (carry forward, don't silently "fix" by guessing)

- No dark mode / `prefers-color-scheme` handling anywhere in the source.
- No accessibility audit beyond `:focus-visible` — contrast ratios and
  screen-reader semantics are unverified.
- No responsive breakpoint system beyond ad-hoc `@media (max-width: ...)`
  rules scoped to specific components (e.g. the New Run 2-column layout).
