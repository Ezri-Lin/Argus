---
name: Argus
description: Ambient intelligence radar — cold dark base, sentiment color lattice, heat-driven luminance, restrained everywhere except the treemap border glow.
colors:
  void: "#0B0C0E"
  surface: "#141619"
  surface-elevated: "#1A1D22"
  surface-layer: "#1C1F24"
  border-subtle: "#23262B"
  hairline: "rgba(255,255,255,0.08)"
  text-primary: "#E6E8EB"
  text-secondary: "#9CA3AF"
  text-muted: "#6B7280"
  accent: "#E6E8EB"
  accent-soft: "rgba(255,255,255,0.10)"
  sentiment-positive: "#3FB950"
  sentiment-positive-bg: "rgba(63,185,80,0.28)"
  sentiment-negative: "#F85149"
  sentiment-negative-bg: "rgba(248,81,73,0.26)"
  sentiment-warning: "#D29922"
  sentiment-warning-bg: "rgba(210,153,34,0.14)"
  sentiment-neutral: "#6B7280"
  treemap-positive-border: "#46D49A"
  treemap-neutral-border: "#8B949E"
  treemap-negative-border: "#FF6B6B"
  heat-glow: "255,255,255"
typography:
  display:
    fontFamily: "Geist Variable, HarmonyOS Sans SC, Source Han Sans SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 560
    lineHeight: 1.15
    letterSpacing: "0"
  title:
    fontFamily: "Geist Variable, HarmonyOS Sans SC, Source Han Sans SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 560
    lineHeight: 1.15
    letterSpacing: "0"
  body:
    fontFamily: "Geist Variable, HarmonyOS Sans SC, Source Han Sans SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Geist Variable, HarmonyOS Sans SC, Source Han Sans SC, Noto Sans CJK SC, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 520
    lineHeight: 1.3
    letterSpacing: "0"
rounded:
  card: "14px"
  inner: "8px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
components:
  widget-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "10px 14px 14px"
  widget-card-hover:
    shadow: "0 8px 32px rgba(0,0,0,0.50), inset 0 1px 0 {colors.hairline}"
  widget-border:
    border: "1px solid {colors.hairline}"
  control-button:
    backgroundColor: "{colors.surface-layer}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.inner}"
    size: "24px"
---

# Design System: Argus

## 1. Overview

**Creative North Star: "Radar meets Star Map"**

A cold void canvas where information appears as luminous points. Each news source is a star: its brightness driven by heat (recency x importance), its color driven by sentiment (green/red/neutral). The treemap is the signature surface — bordered cells with sentiment-colored outlines that glow when hot. Everything else recedes: cards are near-invisible glass, text is muted, borders are hairlines. The system's beauty comes from information density on a quiet stage, not from decoration.

The accent is white itself (#E6E8EB) — not a hue. Color enters the system only through data: sentiment, freshness, heat. This is deliberate: a radar screen doesn't paint itself green; the contacts are green.

**Key Characteristics:**
- Monochromatic dark base (#0B0C0E to #1C1F24) with zero warm-tinted surfaces
- Color is data, not decoration: sentiment drives hue, heat drives luminance
- Treemap border glow is the signature visual — the one place the system "breathes"
- Glass-edge highlights (1px top inset) are the only decorative concession
- Widget health states (degraded/failed) use desaturation and blur, not color overlays
- Zero-chrome at rest: all controls appear on hover, disappear when idle

## 2. Colors: The Void Palette

A cold, near-achromatic palette where color is reserved entirely for data encoding. The void background (#0B0C0E) is the deepest surface — a radar screen powered off. Cards lift slightly above it; text glows faintly against it.

### Primary
- **Polar White** (#E6E8EB): Text, accent, brand. The only "accent" in the system. Used for headings, active states, and the heat-glow treemap border. Its neutrality is the point — it doesn't bias the data's sentiment colors.

### Neutral
- **Void** (#0B0C0E): Root background. The deepest surface.
- **Surface** (#141619): Card and widget backgrounds. Slightly lifted from void — just enough to read card edges.
- **Surface Elevated** (#1A1D22): Hover states, elevated modals. One step above surface.
- **Surface Layer** (#1C1F24): Secondary surfaces, input backgrounds, tab bars.
- **Border Subtle** (#23262B): Structural borders (rare). Most borders use hairline instead.
- **Hairline** (rgba(255,255,255,0.08)): The default border. Invisible at distance, readable up close.
- **Text Primary** (#E6E8EB): Body text, headings.
- **Text Secondary** (#9CA3AF): Timestamps, metadata, secondary labels.
- **Text Muted** (#6B7280): Hints, placeholders, lowest-priority text.

### Data (Sentiment)
- **Sentiment Positive** (#3FB950): Positive news sentiment. Fill uses low-opacity variant (0.08-0.24). Border uses brighter treemap variant (#46D49A).
- **Sentiment Negative** (#F85149): Negative sentiment. Same opacity strategy. Border: #FF6B6B.
- **Sentiment Warning** (#D29922): Caution / unconfirmed status.
- **Sentiment Neutral** (#6B7280): Neutral sentiment. Default treemap border (#8B949E).

### Named Rules

**The Data-Only Color Rule.** Hue enters the system exclusively through sentiment encoding. No decorative color. No branded accent hue. If a color isn't telling the user something about the data, it doesn't exist.

**The Hairline Rule.** Borders are 1px hairline (rgba(255,255,255,0.08)) by default. The only exceptions: structural dividers use #23262B, and treemap borders use sentiment colors. No colored side-stripe borders, ever.

**The Contrast Rule.** Restraint in hue does not mean restraint in contrast. bg, surface, and text must form three distinct layers. Every screen needs 1-2 decisive focal points — a sentiment-colored treemap cell, a heat-glowing border — that break the monochrome with purpose.

## 3. Typography: The Single Voice

**Display Font:** Geist Variable (with HarmonyOS Sans SC, Source Han Sans SC, Noto Sans CJK SC, system-ui, sans-serif fallback stack for CJK)

**Body Font:** Same stack.

**Character:** A single variable-weight sans-serif across all roles. Geist's optical size axis gives tight display headings and readable body text from the same family. The CJK fallback chain ensures Chinese/Japanese/Korean text renders without a separate font load. `font-variant-numeric: tabular-nums` is always on — numbers align in data-dense contexts.

### Hierarchy
- **Display** (560, 28px, line-height 1.15): Widget titles, large metrics. Used sparingly — the dashboard is ambient, not shouting.
- **Title** (560, 14px, line-height 1.15): Section headings, widget card titles. The workhorse heading size.
- **Body** (400, 13px, line-height 1.5): Feed items, descriptions, detail panels. Max line length ~65ch where applicable.
- **Label** (520, 10px, line-height 1.3): Timestamps, badges, metadata, status indicators. Always small, always secondary.

### Named Rules

**The One-Family Rule.** Geist Variable for everything. No second typeface. The weight axis (400-560) creates hierarchy without font-family switching. CJK fallbacks are not "another font" — they're the same role in a different script.

**The Tabular Numbers Rule.** `font-variant-numeric: tabular-nums` is set on `*`. Numbers must align in columns. This is non-negotiable for a data dashboard.

## 4. Elevation: Flat with Glass Edges

Flat by default. Depth is conveyed through tonal layering (void, surface, surface-elevated), not shadows. Shadows exist but are subtle and functional — they mark hover elevation and card boundaries, not decorative depth.

### Shadow Vocabulary
- **Rest** (`0 4px 24px rgba(0,0,0,0.40)`): Default card shadow. Barely visible — it's a 4% lift, not a floating card.
- **Elevated** (`0 8px 32px rgba(0,0,0,0.50)`): Hover state. Combined with an inset top highlight (`inset 0 1px 0 rgba(255,255,255,0.08)`) to create a glass-edge effect.
- **Heat Glow** (drop-shadow on treemap cells when heat > 0.8): White glow at 35% opacity. The signature "breathing" element — the only place the system emits light.

### Widget Health States
- **Degraded**: Desaturation (saturate 0.55) + subtle blur (0.5px) on content. Border switches to dashed. A dark overlay (rgba(7,8,9,0.15)) mutes the surface.
- **Failed**: Grayscale (0.75) + stronger blur (1px). Border turns dashed red. A diagonal hatch overlay appears. Content opacity drops to 0.6.

### Named Rules

**The Flat-By-Default Rule.** Cards are flat at rest. Shadows appear only on hover. No decorative drop-shadows, no persistent floating elements.

**The Glass-Edge Rule.** Every widget card has a 1px inset top highlight (rgba(255,255,255,0.06) at rest, rgba(255,255,255,0.08) on hover). This is the only decorative concession in the system — a single pixel of light that says "this surface has an edge."

**The Signature Glow Rule.** Heat glow (white drop-shadow) is reserved exclusively for treemap cells with heat > 0.8. Its rarity is the point. If everything glows, nothing glows.

## 5. Components

### Widget Card
The fundamental surface. A rounded rectangle on the void canvas.

- **Shape:** 14px corner radius outer, 13px inner (1px inset for the border).
- **Background:** Surface (#141619).
- **Border:** 1px solid hairline (rgba(255,255,255,0.08)). Dashed when degraded; dashed with red tint when failed.
- **Shadow:** Rest shadow at rest; elevated shadow + glass-edge on hover. Transition: 0.3s.
- **Internal Padding:** 14px sides, 10px top (under header), 14px bottom.
- **Header:** Title (14px, 560 weight) left, timestamp (10px, muted) right. Drag handle occupies the full header row.
- **Hover Controls:** Absolute-positioned top-right. 24x24px buttons, 8px inner radius, surface-layer background. Appear on hover, disappear on leave.

### Control Button
Compact action button in widget hover state.

- **Shape:** 24x24px, 8px radius.
- **Background:** Surface Layer (#1C1F24).
- **Text:** 12px, text-secondary (#9CA3AF). Danger variant uses negative red (#F85149).
- **Border:** None.
- **Behavior:** Appears only on widget hover. Stops event propagation on click.

### Treemap Cell
The signature data surface — a sentiment-colored bordered rectangle.

- **Shape:** d3 squarify layout, 3px padding between cells.
- **Fill:** Sentiment-driven — green/red/neutral at 8-24% opacity. Hover doubles fill opacity, capped at 0.45.
- **Border:** 1.5px solid for confirmed items, 2.5px dashed for watch/unconfirmed. Color: treemap-positive-border (#46D49A), treemap-neutral-border (#8B949E), or treemap-negative-border (#FF6B6B).
- **Heat Glow:** When heat > 0.8, a white drop-shadow(0 0 8px rgba(255,255,255,0.35)) appears. This is the system's signature "breathing" element.
- **Text:** White, sized to fit cell area. Sentiment-colored for the member name label.

### Feed Item
A row in a feed list.

- **Layout:** Flex row. Importance indicator (left dot), title + metadata (flex-grow), timestamp (right).
- **Title:** 13px body weight, text-primary. Max 2 lines with ellipsis.
- **Metadata:** 10px label, text-muted. Source name, outlet.
- **Sentiment Dot:** 6px circle, sentiment-colored. Positioned left of title.
- **Hover:** Background shifts to surface-elevated (#1A1D22).

### Input Field
Minimal text input for settings and search.

- **Shape:** 8px radius.
- **Background:** Surface Layer (#1C1F24).
- **Border:** 1px solid border-subtle (#23262B). Focus: border shifts to text-secondary (#9CA3AF).
- **Text:** 13px body, text-primary.
- **Padding:** 8px 12px.

### Badge / Tag
Small inline label for status, kind, sentiment.

- **Shape:** Pill radius (999px).
- **Background:** accent-soft (rgba(255,255,255,0.10)). Sentiment variants use the respective bg colors.
- **Text:** 10px label, text-secondary. Sentiment variants use the respective foreground colors.
- **Padding:** 2px 8px.

### Tab Bar
Horizontal tab navigation for settings and filters.

- **Style:** Minimal text tabs. Active: text-primary + accent-soft background. Inactive: text-muted.
- **Indicator:** No underline indicator. Active state is a subtle pill background.
- **Spacing:** 1px gap between tabs, 6px padding per tab.

## 6. Do's and Don'ts

### Do:
- **Do** use hairline borders (rgba(255,255,255,0.08)) as the default edge treatment. They're invisible at ambient distance, readable up close.
- **Do** let sentiment colors carry meaning through both fill opacity and border color. The treemap is a data visualization, not a color palette.
- **Do** reserve the heat glow (white drop-shadow at heat > 0.8) exclusively for treemap cells. It's the signature element — its rarity is the point.
- **Do** use `font-variant-numeric: tabular-nums` everywhere. Numbers must align in data columns.
- **Do** use widget health states (desaturation for degraded, grayscale + blur for failed) instead of color overlays. The data speaks for itself.
- **Do** keep the accent as neutral white (#E6E8EB). Color bias from the accent would compete with sentiment encoding.
- **Do** maintain three distinct contrast layers: bg, surface, text. "Restraint in hue does not mean restraint in contrast."
- **Do** keep chrome invisible at rest. All controls (add widget, settings, delete) appear on hover, disappear when idle.

### Don't:
- **Don't** add decorative color — no branded accent hue, no gradient backgrounds, no colored side-stripe borders. "If a color isn't telling the user something about the data, it doesn't exist." (PRODUCT.md: Data-Only Color Rule)
- **Don't** use glassmorphism as decoration. Blurs and glass cards are reserved exclusively for widget health states (degraded/failed).
- **Don't** add persistent animations or idle loops. The dashboard is ambient — it sits still. Transitions are user-triggered only (hover, click, panel slide).
- **Don't** use shadows for decorative depth. Shadows exist to mark hover elevation, not to make cards "float."
- **Don't** create gradient text (background-clip: text). Use solid text-primary for headings, sentiment colors for data labels.
- **Don't** add tiny uppercase tracked eyebrows above sections. The "ABOUT / PROCESS / PRICING" kicker pattern is banned.
- **Don't** nest cards. A card inside a card is always wrong.
- **Don't** make the dashboard look like a SaaS analytics tool (Grafana/Google Analytics), a news portal (CNN/36kr), a social media feed (Twitter/Reddit), or a dark-theme dev tool (VS Code/terminal). (PRODUCT.md anti-references)
- **Don't** use numbered section markers (01/02/03) as default scaffolding.
- **Don't** display unread counts or notification badges. The system is debt-free — information decays and disappears, it doesn't pile up.
- **Don't** use warm-tinted surfaces (cream, sand, beige). The palette is cold-neutral. "Warmth" is not a design goal.
