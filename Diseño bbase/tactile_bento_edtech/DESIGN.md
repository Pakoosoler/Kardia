---
name: Tactile Bento EdTech
colors:
  surface: '#f7f9ff'
  surface-dim: '#d5dae4'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eef4fe'
  surface-container: '#e9eef8'
  surface-container-high: '#e3e8f2'
  surface-container-highest: '#dde3ec'
  on-surface: '#161c23'
  on-surface-variant: '#474556'
  inverse-surface: '#2b3138'
  inverse-on-surface: '#ecf1fb'
  outline: '#787588'
  outline-variant: '#c8c4d9'
  surface-tint: '#533cee'
  primary: '#4223de'
  on-primary: '#ffffff'
  primary-container: '#5b46f6'
  on-primary-container: '#e6e1ff'
  inverse-primary: '#c5c0ff'
  secondary: '#006a62'
  on-secondary: '#ffffff'
  secondary-container: '#70f8e8'
  on-secondary-container: '#007168'
  tertiary: '#961f18'
  on-tertiary: '#ffffff'
  tertiary-container: '#b8382d'
  on-tertiary-container: '#ffddd8'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c5c0ff'
  on-primary-fixed: '#140067'
  on-primary-fixed-variant: '#3912d8'
  secondary-fixed: '#70f8e8'
  secondary-fixed-dim: '#4fdbcc'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#005049'
  tertiary-fixed: '#ffdad5'
  tertiary-fixed-dim: '#ffb4aa'
  on-tertiary-fixed: '#410001'
  on-tertiary-fixed-variant: '#8c1712'
  background: '#f7f9ff'
  on-background: '#161c23'
  surface-variant: '#dde3ec'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  data-tabular-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  data-tabular-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  data-tabular-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system targets educators, academic administrators, and institutional leads seeking an ergonomic, fatigue-reducing workspace. It bridges operational rigor with modern visual poise, converting chaotic administrative overhead—gradebooks, attendance, lesson planning, and student analytics—into a calm, tactile, and highly legible cockpit.

### Design Aesthetic: Tactile Bento Glassmorphism
The aesthetic combines structured Bento-grid modularity with soft, luminous glassmorphism. Containers appear as elevated, physical tiles resting on a warm, matte canvas. Key stylistic attributes include:
- **Organized Density:** Heavy use of grouped Bento cards to separate cognitive domains (e.g., student roster, quick grade entry, timetable).
- **Physical Softness:** Generous corner radii (16px to 24px) paired with delicate border definitions to prevent rigid institutional sterility.
- **Micro-Depth:** Dual-layer visual hierarchy using pure white opaque tiles over translucent utility overlays (modals, floating filter panels, sticky grade headers).
- **Dynamic Energy:** Purposeful use of high-energy kinetic accents (Indigo-Violet to Mint Sage gradients) against ultra-restrained neutral backdrops to celebrate student progress and teacher flow states.

## Colors

The palette establishes an ergonomic, daylight-optimized palette that minimizes eye strain during extended grading and planning sessions.

### Core Palette Application
- **Primary (`#5B46F6`):** The primary action and focus color. Drives primary button fills, selected states, active tab indicators, and primary focus rings.
- **Secondary (`#2EC4B6`):** The success and health indicator. Applied to passing grades, present attendance markers, completed competencies, and positive growth vectors.
- **Tertiary (`#FF6B5B`):** Urgent and critical semantic signaling. Reserved for unexcused absences, failing marks, urgent guardian alerts, and destructive actions.
- **Neutral (`#1E242B`):** Deep Slate Charcoal, serving as the high-contrast anchor for typography, structural framing, and primary icons.

### Supporting Semantic Tokens
- **Warning / Pending (`#FFBE0B`):** Indicates tardiness, pending assessments, draft lesson plans, and provisional grade weighting.
- **Accent Soft Base (`#EEF0FD`):** Tonal resting state for active table rows, selected Bento card highlights, and secondary chip backgrounds.
- **Canvas Base (`#F8F9FA`):** Warm alabaster backdrop serving as the global viewport background.
- **Sub-Canvas Tier (`#F1F3F5`):** Structural trough and track color for grid gutters, disabled controls, and segmented control wells.
- **Border Default (`#E2E8F0`):** Precise 1px hairline boundary for all resting cards, Bento tiles, and table dividers.

## Typography

The typographic hierarchy balances modern brand personality with absolute tabular precision:

- **Headlines & Section Titles:** Driven by Plus Jakarta Sans. Its contemporary humanist shapes and open apertures bring clarity and optimism to module titles, student roster overview headers, and dashboard summaries.
- **Body & Tabular Numerical Data:** Driven by Inter. All instances of data grids, percentage progress indicators, gradebook matrices, and timetables must enforce `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum" 1`. This aligns decimals and integer values vertically without layout jitter when live calculations update.
- **Labels & Micro-Badges:** Inter Semi-Bold (`600`) with tracked letter-spacing ensures that small status flags (`ABSENT`, `PENDING`, `HONORS`) remain sharp and legible at 11px.

## Layout & Spacing

The foundation is built on an adaptive 12-column Bento-grid layout that balances modular widget organization with wide, continuous data canvases for gradebooks.

### Grid Model
- **Desktop (>= 1280px):** 12-column fluid grid. Outer margins are `2rem` (`32px`) and gutters are `1.5rem` (`24px`). Bento tiles span in multiples of 3, 4, 6, or 12 columns to maintain structural alignment.
- **Tablet (768px - 1279px):** 8-column layout. Gutters compress to `1rem` (`16px`); margins to `1.5rem` (`24px`). Multi-column grade tables introduce sticky first-column freezing for student identities with horizontal scrolling for assignment columns.
- **Mobile (< 768px):** 4-column single-stack arrangement. Gutters and outer canvas margins collapse to `0.75rem` (`12px`) and `1rem` (`16px`) respectively. Bento blocks collapse into vertically stacked cards.

### Spacing Philosophy
- Use `space-xs` (4px) and `space-sm` (8px) for internal pill padding, table cell internal spacing, and badge margins.
- Use `space-md` (16px) for inner card padding on dense data tiles and gap layouts between grouped controls.
- Use `space-lg` (24px) for canonical Bento tile padding, dashboard header spacing, and section separators.
- Use `space-xl` (32px) strictly for major layout boundaries and view transitions.

## Elevation & Depth

Visual hierarchy uses a refined layering scheme consisting of matte base tiers, crisp solid surfaces, floating glass utility layers, and tinted micro-shadows.

### Layering Stack
1. **Base Surface (Level 0):** Warm Alabaster (`#F8F9FA`). Recessed, non-interactive, and completely flat.
2. **Bento Card Tier (Level 1):** Solid Pure White (`#FFFFFF`) with a 1px border of `#E2E8F0`. Shadow is soft and diffused: `0 4px 20px -2px rgba(30, 36, 43, 0.04), 0 2px 6px -1px rgba(30, 36, 43, 0.02)`.
3. **Interactive & Hover Tier (Level 2):** Applied when cards are hovered or focused: `0 12px 32px -4px rgba(91, 70, 246, 0.08), 0 4px 12px -2px rgba(30, 36, 43, 0.03)`. The subtle indigo tint signals elevated interactivity.
4. **Floating Translucent Tier (Level 3):** Reserved for sticky column headers, quick grading action bars, and filter trays. Constructed with `rgba(255, 255, 255, 0.82)` combined with a `backdrop-filter: blur(12px)` and a crisp `1px solid rgba(226, 232, 240, 0.8)`.
5. **Modal & Flyout Tier (Level 4):** Contextual popovers, quick attendance trays, and student dossiers. Shadow: `0 24px 48px -12px rgba(30, 36, 43, 0.16)`.

## Shapes

The geometric signature combines soft, architectural tiles with tactile pill controls:

- **Bento Tiles & Outer Cards:** Utilize large structural corners (`1.5rem` / `24px` on desktop, scaling to `1rem` / `16px` on mobile screens).
- **Secondary Containers & Inner Wells:** Modular sections within Bento cards (such as individual student performance summaries or timetable slots) use `rounded-lg` (`1rem` / `16px`).
- **Interactive Controls & System Pills:** Buttons, status badges, search bars, and selection chips utilize full pill geometry (`rounded-full` / `9999px`) to invite immediate touch and click interaction.
- **Form Inputs & Matrix Cells:** Inputs and inline grade editor cells use `rounded-md` (`0.5rem` / `8px`) to maximize data density while softening the interface.

## Components

### Buttons
- **Primary:** Filled with the Primary Indigo-Violet gradient (`linear-gradient(135deg, #5B46F6 0%, #4834DF 100%)`), text in `#FFFFFF`, with a 9999px pill radius. Hover shifts brightness and applies an active drop shadow (`0 4px 14px rgba(91, 70, 246, 0.35)`).
- **Secondary / Soft:** Background `#EEF0FD`, text `#5B46F6`, 0 border, transitioning to a 10% darker tint on hover.
- **Ghost / Tertiary:** Transparent background, text `#1E242B`, 1px border `#E2E8F0`. Hover triggers background `#F1F3F5`.

### Chips & Badges
- **Status Pills:** Compact layout (`space-xs` vertical, `space-sm` horizontal), 9999px radius.
  - *Present / Passing:* Background `rgba(46, 196, 182, 0.12)`, text `#0F766E`.
  - *Absent / Failing:* Background `rgba(255, 107, 91, 0.12)`, text `#C53030`.
  - *Late / Pending:* Background `rgba(255, 190, 11, 0.16)`, text `#B45309`.
  - *Active Filter:* Background `#5B46F6`, text `#FFFFFF`.

### High-Density Data Grid (Gradebook)
- **Container:** Bento container styling with `overflow: auto`.
- **Sticky Column 0:** Fixed student avatar and name container using translucent white (`rgba(255, 255, 255, 0.95)` with `backdrop-filter: blur(8px)`) and a hard 1px border-right `#E2E8F0`.
- **Table Cells:** Height fixed at `44px`. Cell text set to `data-tabular-md`. Hovering a row sets background to `#EEF0FD` across all non-pinned and pinned cells simultaneously.
- **Active Editing Cell:** 2px solid border `#5B46F6` with an inner glow, disabling default input styling and displaying tabular numerical entry immediately.

### Bento Cards
- **Base Style:** Background `#FFFFFF`, 24px border radius, 1px solid border `#E2E8F0`, padding `1.5rem` (`24px`).
- **Header Structure:** Title displayed in `headline-sm` with an accompanying subtle metadata label or action icon in the top right.
- **Nested Modular Tiles:** Sub-panels inside the Bento card carry a background of `#F8F9FA` with 16px radius and 12px padding.

### Circular Score Rings
- Compact SVG rings representing overall student mastery or completion metrics.
- Track color: `#F1F3F5`. Stroke width: 4px.
- Progress fill: Employs dynamic linear gradient between `#5B46F6` and `#2EC4B6`. Center label rendered in `data-tabular-md`.

### Form Fields & Inputs
- **Base Input:** Background `#FFFFFF`, border `1px solid #E2E8F0`, 8px radius, text `body-md` (`#1E242B`). Placeholder text `#64748B`.
- **Focus State:** 2px ring `#5B46F6` with an offset of 1px.