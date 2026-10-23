# AutoCloud Web Dashboard — Design System (design.md)

Source: "Donezo"-style reference dashboard (soft, rounded, green, card-based).
Purpose: single reference for every UI change in this folder. Read this BEFORE touching any visual code.

> **Golden rule — UI only.** Change colours, radius, spacing, typography, shadows and class names.
> Do NOT change: props, state, handlers, API calls, MongoDB/`lib/` logic, `proxy.ts`, workflow JSON
> compile logic, React Flow behaviour, or any node `nodeType` / config keys.
> This is Next.js 16 / React 19 / Tailwind v4 / shadcn (radix-nova). Per `AGENTS.md`, read
> `node_modules/next/dist/docs/` before touching framework-level files (layout, fonts, config).

---

## 1. Design personality (what makes the reference feel the way it does)

1. **Calm and airy.** Lots of white space, big radii, almost no borders or shadows. Separation comes from
   *tone* (white cards sitting on a very light grey canvas), not from lines.
2. **One hue, many shades.** Everything is green. Hierarchy is made with dark / mid / light green plus
   neutral greys. Colour outside green is reserved for status only (amber, red).
3. **Pill-shaped everything.** Buttons, search, chips, bars and avatars are fully rounded. Cards and panels are
   generously rounded (24–32px).
4. **Big confident numbers.** KPI values are huge (~64–72px), light-medium weight, tight tracking; labels
   around them are small and quiet.
5. **One hero moment per screen.** One card is filled with the dark-green gradient (Total Projects) and one
   dark widget anchors the bottom (Time Tracker / promo). Everything else stays light.
6. **Hatched = "not done / pending".** Diagonal grey stripes mark empty, pending or remaining state in
   charts. It is the signature texture.

---

## 2. Colour tokens

Use hex in CSS variables (Tailwind v4 accepts it). Values are sampled/estimated from the reference.

### Brand greens
| Token | Hex | Use |
|---|---|---|
| `--green-950` | `#0B3D26` | Deepest: dark widget bg start, "in progress" bars |
| `--green-900` | `#0F4F33` | Primary button start, sidebar promo |
| `--green-700` | `#14663F` | **Primary** (buttons, active icon, links) |
| `--green-600` | `#1E7F52` | Hero gradient end, chart mid bar |
| `--green-400` | `#5DBB8E` | Chart light bar / highlight |
| `--green-200` | `#BDF5C8` | Text on dark-green cards (deltas, captions) |
| `--green-100` | `#DDF3E6` | Soft chip bg, focus halo |
| `--green-50`  | `#EEF8F2` | Hover bg, subtle tint |

### Neutrals (slightly green-tinted greys)
| Token | Hex | Use |
|---|---|---|
| `--canvas-outer` | `#ECEDEE` → `#F5F5F5` | Page backdrop (soft vertical gradient) |
| `--canvas` | `#F6F7F6` | Inner panel / content area behind cards |
| `--surface` | `#FFFFFF` | Cards, search, icon buttons |
| `--line` | `#E6E9E7` | Rare hairlines, inputs |
| `--text` | `#0E1A13` | Headings / primary text (green-black, not pure black) |
| `--text-muted` | `#7B8680` | Subtitles, captions, inactive nav |
| `--text-faint` | `#A3ACA7` | Placeholders, hatched strokes |

### Status (only place non-green hues are allowed)
| Status | Text | Bg | Border |
|---|---|---|---|
| Completed / success | `#1F8A5B` | `#E8F5EE` | `#CBE8D8` |
| In progress / warning | `#D98A1C` | `#FDF4E3` | `#F6E1B8` |
| Pending / danger | `#E5484D` | `#FDEDED` | `#F6CFCF` |
| Stop / destructive button | `#EF4444` fill, white icon | | |

### Gradients
- **Hero card:** `linear-gradient(135deg, #14663F 0%, #1E7F52 100%)` + faint curved line texture (optional, 6–8% white).
- **Dark widget:** `linear-gradient(160deg, #0B3D26 0%, #0F5B38 100%)` + curved line texture.
- **Primary button:** `linear-gradient(90deg, #0F4F33, #14663F)`.

### Mapping to the existing shadcn tokens (in `app/globals.css`)
The project already themes through CSS variables, so **most of the restyle is changing `:root` / `.dark` only.**

```css
:root {
  --background: #F6F7F6;            /* canvas */
  --foreground: #0E1A13;
  --card: #FFFFFF;
  --card-foreground: #0E1A13;
  --popover: #FFFFFF;
  --popover-foreground: #0E1A13;
  --primary: #14663F;
  --primary-foreground: #FFFFFF;
  --secondary: #EEF8F2;
  --secondary-foreground: #0F4F33;
  --muted: #F1F3F2;
  --muted-foreground: #7B8680;
  --accent: #EEF8F2;
  --accent-foreground: #0F4F33;
  --destructive: #EF4444;
  --border: #E6E9E7;
  --input: #E6E9E7;
  --ring: #1E7F52;
  --chart-1: #0B3D26; --chart-2: #1E7F52; --chart-3: #5DBB8E; --chart-4: #BDF5C8; --chart-5: #A3ACA7;
  --radius: 1rem;                   /* base; see radius scale below */
  --sidebar: #F6F7F6;
  --sidebar-foreground: #7B8680;
  --sidebar-primary: #14663F;
  --sidebar-primary-foreground: #FFFFFF;
  --sidebar-accent: #EEF8F2;
  --sidebar-accent-foreground: #0E1A13;
  --sidebar-border: #E6E9E7;
  --sidebar-ring: #1E7F52;
}
```

**Dark mode** (the reference has none; keep the existing `.dark` class working with a green-black theme):
`--background #0A120E`, `--card #111C16`, `--muted #17241D`, `--border rgba(255,255,255,.08)`,
`--primary #2BA86B`, `--primary-foreground #06140D`, `--foreground #EAF2ED`, `--muted-foreground #8FA096`.
Hatching and status chips use the same hues at lower opacity.

---

## 3. Typography

- **Font:** geometric humanist sans with a friendly, slightly tall feel. Use **Plus Jakarta Sans** (fallback
  **Figtree**, then system sans). Load with `next/font/google` and map to `--font-sans`.
  Keep Geist Mono for code/IDs (hardware ID, ports, logs).
- Weights used: 400 (body, captions), 500 (headings, numbers, buttons), 600 only for tiny labels/badges.
  Avoid 700+ — the reference never goes heavy.
- Tracking: headings and big numbers `-0.02em`; uppercase section labels `+0.06em`.

| Role | Size / line-height | Weight | Colour |
|---|---|---|---|
| Page title ("Dashboard") | 40–44 / 1.1 | 500 | `--text` |
| Page subtitle | 16–18 / 1.4 | 400 | `--text-muted` |
| Card title | 18–20 / 1.2 | 500 | `--text` (white on green cards) |
| KPI number | 56–72 / 1 | 500 | `--text` (white on hero) |
| List item title | 16 / 1.3 | 500 | `--text` |
| Body / meta | 13–14 / 1.4 | 400 | `--text-muted` |
| Section label (MENU, GENERAL) | 12–13 / 1 | 500, uppercase | `--text-muted` |
| Chip / badge | 11–12 / 1 | 500 | status colour |
| Timer / clock numerals | 48–56, tabular-nums | 500 | white |

---

## 4. Shape, spacing, elevation

### Radius scale
| Element | Radius |
|---|---|
| App shell (outer white frame) | 40–48px |
| Large panels (sidebar, top bar, content area) | 28–32px |
| Cards / widgets | 20–24px |
| Inputs, small cards | 14–16px |
| Buttons, search, status pills, chart bars, avatars | `9999px` (full) |
| Small tags / "5▲" delta badge | 6–8px |

### Spacing
- Shell padding 24–28px; gap between panels/cards **20px**; card inner padding **24–28px**.
- Vertical rhythm inside cards: title → 16px → content → 16px → footer.
- Sidebar item height ~48px, gap 8px; list rows gap 18–20px.
- Layout grid: 12 columns. Stat row = 4 equal cards. Below: 6/3/3, then 5/4/3 style splits.

### Elevation
- Cards: **no shadow** by default. `border: 1px solid transparent` (or `--line` at 60% if needed on white-on-white).
- Only the outer shell gets a soft shadow: `0 30px 80px rgba(15, 30, 22, 0.08)`.
- Popovers/dialogs: `0 12px 32px rgba(15, 30, 22, 0.12)`; keep radius 24px.
- Hover on cards: raise tone (`--green-50`) or translate-y `-1px`; never a heavy shadow.

---

## 5. Component recipes

Class names are Tailwind v4 starting points; adapt to existing components rather than rewriting them.

### 5.1 App shell
- Page background: soft gradient `#ECEDEE → #F5F5F5`.
- Single white rounded shell (`rounded-[40px] bg-white`) containing: sidebar panel (fixed width ~300px) and a
  column with top bar + content panel (`bg-[--canvas] rounded-[28px]`).

### 5.2 Sidebar
- Panel `bg-[--canvas] rounded-[28px] p-6`.
- Logo row top; then section label `MENU`, nav list, section label `GENERAL`, nav list; promo card pinned bottom.
- **Nav item:** `h-12 rounded-xl px-4 flex items-center gap-3 text-[--text-muted]`; line icons (lucide, 20px, stroke 1.75).
- **Active item:** text `--text` weight 500, icon `--green-700`; a **6px-wide vertical green bar** flush on the
  left edge of the panel (rounded on the right side) — this is the signature active marker.
- **Count badge** (e.g. Tasks `12+`): `bg-[--green-900] text-white text-[10px] rounded-md px-1.5 py-0.5`.
- **Promo card:** dark-green gradient, 20–24px radius, white title (medium) + small caption + full-width
  dark-green pill button.

### 5.3 Top bar
- White rounded panel (28px). Left: search **pill** (`bg-white rounded-full h-14 px-5`, icon + placeholder + `⌘F`
  keycap chip `bg-[#F1F3F2] rounded-lg text-xs`).
- Right: two **56px white circle icon buttons** (mail, bell), then avatar (circle) + name (500) + email (muted).

### 5.4 Page header
- Left: title + muted subtitle. Right: primary pill button (with `+` icon) and outlined pill button
  (`border-[1.5px] border-[--green-700] text-[--text] bg-transparent`).

### 5.5 Buttons
| Variant | Style |
|---|---|
| Primary | `h-12–14 px-7 rounded-full text-white font-medium` + primary gradient |
| Outline | `rounded-full border-[1.5px] border-[--green-700] text-[--text] hover:bg-[--green-50]` |
| Small outline ("+ New", "+ Add Member") | `h-9 px-4 text-sm rounded-full border border-[--green-700] text-[--green-900]` |
| Icon circle | `size-10–14 rounded-full bg-white` (on hero: white fill, dark arrow) |
| Destructive/Stop | `rounded-full bg-[#EF4444] text-white` (circle) |
- Hover: slightly darker gradient, no scale. Focus: 3px ring `--green-100` + `--ring`.

### 5.5b Inputs / selects / dialogs (shadcn)
- `h-11 rounded-xl border border-[--line] bg-white px-4`, focus ring green. Search uses the full pill.
- Dialogs: white, `rounded-3xl`, no heavy border, overlay `rgba(10,18,14,.35)` with slight blur.

### 5.6 Stat (KPI) card
- Card `rounded-3xl p-6–7`, title (20px/500) top-left, **circular outlined arrow button** top-right
  (↗ icon, 1.5px green border, 44–48px).
- Big number (64–72px), then a small delta row: tiny rounded-square badge with number+▲ (`bg-green-100/60`) +
  muted caption ("Increased from last month").
- **Hero variant (first card only):** green gradient bg, white title, white filled arrow button with green icon,
  white number, caption in `--green-200`.
- Neutral caption variant (e.g. "On Discuss") has no badge.

### 5.7 Bar chart ("Project Analytics")
- Vertical **capsule** bars, fully rounded top and bottom, equal width (~80px), labels S M T W T F S below in muted.
- States: `dark` (`--green-950`), `mid` (`--green-600`), `light` (`--green-400`), **hatched** (empty/pending).
- A tooltip chip (`74%`, tiny, white with border) with a dot on the highlighted bar.
- **Hatch pattern:** `repeating-linear-gradient(135deg, #8E9A94 0 2px, transparent 2px 7px)` clipped to the pill.

### 5.8 Gauge / progress ("Project Progress")
- Thick semicircle (half-donut) with **rounded caps**, three overlapping segments:
  completed (mid green), in progress (dark green), pending (hatched grey).
- Huge % in the middle (64px/500) with a muted caption below; legend row underneath with dot + label.

### 5.9 List rows (Projects, Team collaboration)
- Leading 40px icon/avatar (circle for people), title 16px/500, sub-line 13px muted
  (inline emphasis: "Working on **Task name**" — name in `--text`, 500).
- Trailing **status pill:** `text-xs rounded-md px-2.5 py-1 border` using the status colours in §2.
- No dividers between rows — use spacing only.

### 5.10 Reminder / highlight card
- Title, then a **green** medium-size headline (24px/500, `--green-700`), muted time line, full-width dark-green pill CTA with leading icon.

### 5.11 Dark widget (Time Tracker style)
- Dark-green gradient card, white title, centred large tabular numerals, two circular controls
  (white pause, red stop). Reuse this for any live/running-status widget (e.g. an active automation run timer).

### 5.12 Tables (Nodes table, Groups)
- Table inside a white card, **no vertical lines, no zebra**. Header row: 12–13px, muted, medium weight, no bg.
- Rows: `h-14`, hover `bg-[--green-50]`, rounded row highlight (`rounded-xl`). Status with the pill styles above.
- Row actions as small circle icon buttons.

---

## 6. Iconography & imagery
- **lucide-react**, 20px default, stroke 1.75, rounded joins. Active = `--green-700`, inactive = `--text-muted`.
- Avatars: circles, 40–56px. Project/app icons sit on their own 40px tile; colour pops on those icons are OK.
- Decorative curved line texture only on the two dark-green surfaces; keep it ≤ 8% opacity.

---

## 7. Motion
- 150–200ms ease-out for hover/focus (background, border, translate-y).
- Bars/gauge animate once on mount (grow from bottom / sweep) ≤ 600ms.
- Respect `prefers-reduced-motion`. No bouncy springs.

---

## 8. Accessibility guardrails
- White text on `--green-700` or darker only (contrast ≥ 4.5:1). Never white on `--green-400`.
- `--text-muted` (#7B8680) is for secondary text 13px+ on white/canvas; do not use below 12px.
- Status is never colour-only: keep the text label in every pill.
- Keep visible focus rings on all interactive elements.

---

## 9. Workflow editor (`components/WorkflowEditor.tsx`) — special rules
This file is large (~2.5k lines) and drives React Flow + workflow JSON compile. Restyle **conservatively**:
- Allowed: panel backgrounds, radii, borders, shadows, button styles, chip styles, font tokens, canvas bg tint.
- Not allowed: changing node `type`/`nodeType` strings, `data`/`config` keys, `compile`/`extractTokens` logic,
  node ids, edge handling, or palette item structure.
- **Keep per-category node accent colours** (teal for file nodes, etc.). They carry meaning; only soften them
  to fit the system (pill badges, lighter tints). Primary actions (Save/Deploy) use the primary green button.
- Canvas background: `--canvas` with a subtle dot grid in `--text-faint` at ~40% opacity.

---

## 10. Rollout plan (so nothing breaks)
1. **Tokens first:** update `:root` / `.dark` in `app/globals.css` + font + `--radius`. Verify every page still renders.
2. **Shell:** layout wrapper, `Sidebar.tsx` (active bar, section labels, badge, promo/footer card), top bar.
3. **Primitives:** `components/ui/` (button, card, input, badge, dialog, table) — shared by everything.
4. **Pages one at a time:** dashboard/overview → Nodes table → Groups → Settings → Task Builder.
5. **Workflow editor last**, per §9.
6. After each step: run `npm run lint` and `npm run build`; confirm behaviour is identical (no logic diffs).

---

## 10b. Table density rule (user requirement)
Tables must be viewable on ONE screen: no horizontal scrolling, all row actions visible without scrolling sideways.
- Cell padding `px-2.5 py-2` (set on `<Table className="[&_td]:px-2.5 [&_td]:py-2 [&_th]:px-2.5 [&_th]:h-10">`), 12 rows per page.
- Truncate long IDs (`max-w-[120px] truncate` + `title`), use pills/icons for actions, wide page container (`max-w-[1600px]`, `p-6 lg:p-8`).
- Reference implementation: `components/NodesTableClient.tsx`.

---

## 11. Do / Don't
**Do:** white cards on light canvas · pill buttons · big numerals · green-only palette · status pills ·
hatched = pending · generous padding · line icons.
**Don't:** hard borders everywhere · heavy shadows · pure black text · bright non-green accents outside status ·
tight cramped tables · gradients on light cards · font weights above 600 · changing any logic while restyling.
