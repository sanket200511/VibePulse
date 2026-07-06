# VibePulse Design System

> This document governs the visual language of the VibePulse dashboard.
> Every UI decision should trace back to a principle here.

---

## Philosophy

VibePulse is a premium developer tool. The interface must feel like it was built by engineers for engineers.

Every screen should communicate:

- **Confidence** — the data is accurate; the UI is trustworthy
- **Clarity** — information hierarchy is obvious at a glance
- **Speed** — interactions feel instant; nothing blocks the developer
- **Precision** — numbers are exact; states are unambiguous
- **Minimalism** — nothing on screen is accidental

**Primary inspirations**: Linear's spacing, GitHub's developer ergonomics, Vercel's typography, Raycast's command-first interactions. Never imitate directly — synthesise.

---

## Theme

**Dark Mode First.** Light mode may be added later. Never optimise for light mode over dark.

---

## Color Palette

| Name          | Hex       | CSS Variable         | Usage                       |
| ------------- | --------- | -------------------- | --------------------------- |
| Background    | `#09090B` | `--background`       | Page background             |
| Card          | `#111114` | `--card`             | Card/panel backgrounds      |
| Elevated      | `#18181B` | `--secondary`        | Dropdowns, tooltips         |
| Border        | `#27272A` | `--border`           | Card and input borders      |
| Divider       | `#3F3F46` | `--accent`           | Dividers, hover states      |
| Primary       | `#7C3AED` | `--primary`          | Primary actions, highlights |
| Primary Hover | `#8B5CF6` | —                    | Button hover state          |
| Blue          | `#3B82F6` | —                    | Information                 |
| Green         | `#22C55E` | —                    | Success, healthy status     |
| Amber         | `#F59E0B` | —                    | Warning                     |
| Red           | `#EF4444` | `--destructive`      | Error, danger               |
| Text Primary  | `#FAFAFA` | `--foreground`       | Body text                   |
| Text Muted    | `#A1A1AA` | `--muted-foreground` | Secondary text              |
| Text Subtle   | `#71717A` | —                    | Tertiary text, captions     |

**Rules**: Never pure black. Never pure white. Color is never the only indicator of state — always pair with an icon or label.

---

## Typography

| Role       | Font           | Weight       | Size      |
| ---------- | -------------- | ------------ | --------- |
| Display    | Inter          | 700 Bold     | 32px–48px |
| Heading    | Inter          | 600 SemiBold | 20px–28px |
| Subheading | Inter          | 500 Medium   | 16px–18px |
| Body       | Inter          | 400 Regular  | 14px      |
| Caption    | Inter          | 400 Regular  | 12px      |
| Code       | JetBrains Mono | 400 Regular  | 13px      |

Never mix more than two font families. Fallback: `system-ui, sans-serif`.

---

## Spacing

8px base unit. All spacing values are multiples of 4:

`4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64`

No arbitrary spacing values. If you need a value not in this scale, reconsider the layout.

---

## Border Radius

| Element  | Radius       |
| -------- | ------------ |
| Cards    | 16px         |
| Buttons  | 12px         |
| Inputs   | 12px         |
| Dialogs  | 20px         |
| Badges   | 999px (pill) |
| Tooltips | 8px          |

---

## Motion

Animations communicate **state**, never decoration.

- **Duration**: 150–250ms
- **Easing**: ease-out
- **Never**: bounce, elastic, large transitions, decorative animations

---

## Layout

- Maximum content width: **1440px**
- Dashboard structure: Sidebar + Top Navigation + Content Area
- Sidebar: collapsed `72px` / expanded `260px`
- Icons always visible in collapsed sidebar; labels hide
- Use generous whitespace. Never cram information.

---

## Component Vocabulary

### Cards

Primary building block. Each card: Title · Description · Primary Metric · Optional Chart · Optional Action.
Consistent padding · Subtle border · 16px radius.

### Buttons

- **Primary**: Filled Purple (`bg-primary`)
- **Secondary**: Neutral (`bg-secondary`)
- **Ghost**: Transparent background
- **Danger**: Red (`bg-destructive`)

Never more than three visual button styles per view.

### Forms

Large click targets. Generous spacing. Inline validation. Helpful error messages.

### Tables

Sorting · Filtering · Searching · Pagination · Sticky headers · Compact rows.

### Charts

Library: Recharts. Simple axes. Minimal gridlines. Readable labels.
Prefer: Line, Area, Bar, Heatmap. Never: 3D, Pie, decorative.

### Icons

Lucide Icons exclusively. Consistent stroke width. Never mix icon packs.

---

## Dashboard Principles

Every dashboard screen answers three questions:

1. What happened?
2. Why?
3. What should I do next?

Every page has a **primary metric**. No vanity metrics.

---

## Health Score

The Health Score is the central object of the application.

Display: Circular progress · Large number · Trend arrow · Last updated · Score history.
Never hide it. Always prominent.

---

## AI Interaction Language

AI findings should read like a senior engineer, not a marketing bot.

✅ `Hardcoded API key detected in src/config.ts line 42. Exposure risk: HIGH.`  
❌ `Potential issue found in your code.`

Every AI message includes:

- **Finding**: what was observed
- **Reason**: why it matters
- **Confidence**: how certain the system is
- **Suggested Fix**: concrete next step

---

## Accessibility

- Keyboard navigation first
- Visible focus states on all interactive elements
- WCAG AA contrast ratios minimum
- ARIA labels on icon-only buttons
- Never rely on color alone to communicate state

---

## Engineering Rules

- Never hardcode colors — use CSS variables exclusively
- Never hardcode spacing — use the 8px scale via Tailwind utilities
- Design tokens only — no magic numbers
- Component-driven architecture
- Dark mode by default
- Performance before animation
- Composition over duplication
