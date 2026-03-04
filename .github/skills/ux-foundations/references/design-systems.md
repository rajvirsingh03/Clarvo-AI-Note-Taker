# Design System Fundamentals — Complete Reference

> Specific values, scales, and tokens for building and evaluating design systems. These values represent industry consensus drawn from Material Design, Apple HIG, Tailwind CSS, and leading SaaS design systems (Atlassian, Shopify Polaris, Ant Design).

---

## Spacing System (4pt Base Grid)

All spacing, padding, margin, and sizing values derive from a 4px base unit. Use 8px as the primary increment; use 4px for fine detail.

### Spacing Scale

| Token | Value | Common Usage |
|-------|-------|-------------|
| `space-0` | 0px | No spacing |
| `space-0.5` | 2px | Hairline gaps, borders, dividers |
| `space-1` | 4px | Tight inline spacing (icon to text, badge margin) |
| `space-2` | 8px | Default inline spacing, small padding, gap between adjacent touch targets |
| `space-3` | 12px | Form label to input, compact component padding |
| `space-4` | 16px | Default component padding, standard gap between elements |
| `space-5` | 20px | Comfortable component padding |
| `space-6` | 24px | Between related components in a section |
| `space-8` | 32px | Between component groups |
| `space-10` | 40px | Section padding (small) |
| `space-12` | 48px | Section padding (medium) |
| `space-16` | 64px | Section padding (large), page margins on desktop |
| `space-20` | 80px | Major section breaks |
| `space-24` | 96px | Hero/feature section padding, page-level vertical rhythm |

### Spacing Hierarchy Rules

| Relationship | Spacing Range | Purpose |
|-------------|--------------|---------|
| Tight | 4-8px | Related inline elements: icon + label, badge + text, avatar + name |
| Default | 12-16px | Elements within a component: form label to input, card title to body |
| Loose | 24-32px | Between components in a section: card to card, form group to form group |
| Section | 48-96px | Between major page sections: hero to features, features to testimonials |

**Core rule**: Internal spacing (within a component) must always be less than external spacing (between components). This enforces Gestalt proximity -- tighter internal spacing makes elements read as a group.

---

## Typography Scale

### Base Size
**16px** for body text on web. This is the browser default, accessible, and readable across devices.

### Modular Scale Ratios

| Ratio Name | Value | Best For | Visual Contrast |
|------------|-------|----------|----------------|
| Major Second | 1.125 | Dense data UIs, admin panels | Very subtle |
| Minor Third | 1.200 | Text-heavy SaaS, documentation | Gentle |
| Major Third | 1.250 | General purpose, most SaaS products | Moderate |
| Perfect Fourth | 1.333 | Marketing sites, content-heavy pages | Distinct |
| Augmented Fourth | 1.414 | Editorial, blog layouts | Strong |
| Perfect Fifth | 1.500 | Presentation-style layouts | Bold |
| Golden Ratio | 1.618 | Landing pages, hero sections | Dramatic |

### Recommended Type Ramp

A practical type ramp covering all common use cases:

| Token | Size (px) | Common Usage |
|-------|-----------|-------------|
| `text-xs` | 12px | Captions, footnotes, badges, fine print |
| `text-sm` | 14px | Secondary text, table content, form help text |
| `text-base` | 16px | Body text, form inputs, default reading size |
| `text-lg` | 18px | Lead paragraphs, emphasized body text |
| `text-xl` | 20px | Card titles, small headings (h5/h6) |
| `text-2xl` | 24px | Section headings (h4), sub-section titles |
| `text-3xl` | 30px | Page sub-headings (h3) |
| `text-4xl` | 36px | Page headings (h2) |
| `text-5xl` | 48px | Hero sub-headings, feature titles |
| `text-6xl` | 60px | Hero headings (landing pages) |
| `text-7xl` | 72px | Display headings (splash pages, marketing) |

### Typography Rules
- [ ] Limit distinct font sizes to 6-8 across the entire product
- [ ] Use font weight (regular 400, medium 500, semibold 600, bold 700) as secondary hierarchy alongside size
- [ ] Body line-height: 1.4-1.6 (1.5 is the standard recommendation)
- [ ] Heading line-height: 1.1-1.3 (tighter for large text)
- [ ] Maximum line length: 60-75 characters for body text (for readability)
- [ ] Minimum body text on mobile: 16px (never smaller)
- [ ] Use responsive scaling: larger ratio on desktop (e.g., 1.333), smaller ratio on mobile (e.g., 1.200)
- [ ] Use `clamp()` for fluid responsive type: `clamp(min, preferred, max)`

---

## Color System

### Semantic Color Categories

| Category | Purpose | Typical Hue | Usage |
|----------|---------|-------------|-------|
| **Primary** | Brand color, primary actions, key interactive elements | Brand-specific | Primary buttons, active states, links, selected indicators |
| **Secondary** | Secondary actions, supporting elements | Brand-specific | Secondary buttons, hover states, less prominent actions |
| **Accent** | Highlights, emphasis, decorative touches | Brand-specific | Badges, tags, highlights, promotional elements |
| **Success** | Positive states, confirmations, completion | Green | Success alerts, checkmarks, completed status, positive trends |
| **Warning** | Caution states, approaching limits, non-critical issues | Yellow/Orange | Warning alerts, limit indicators, attention-needed states |
| **Error** | Errors, destructive actions, critical alerts | Red | Error messages, validation errors, delete buttons, critical alerts |
| **Info** | Informational messages, tips, neutral alerts | Blue | Info banners, tooltips, help text, neutral notifications |

### Neutral Palette (Gray Scale)

Build a 10-step neutral palette from near-white to near-black:

| Token | Shade | Typical Value | Usage |
|-------|-------|--------------|-------|
| `neutral-50` | Lightest | #FAFAFA / #F9FAFB | Page backgrounds, subtle backgrounds |
| `neutral-100` | Very light | #F5F5F5 / #F3F4F6 | Card backgrounds, alternate table rows |
| `neutral-200` | Light | #E5E5E5 / #E5E7EB | Borders, dividers, input borders |
| `neutral-300` | Light-mid | #D4D4D4 / #D1D5DB | Disabled text, placeholder text |
| `neutral-400` | Mid-light | #A3A3A3 / #9CA3AF | Secondary icons, muted text |
| `neutral-500` | Mid | #737373 / #6B7280 | Secondary body text, labels |
| `neutral-600` | Mid-dark | #525252 / #4B5563 | Primary body text on light backgrounds |
| `neutral-700` | Dark | #404040 / #374151 | Headings, emphasis text |
| `neutral-800` | Very dark | #262626 / #1F2937 | High-emphasis text, dark mode backgrounds |
| `neutral-900` | Darkest | #171717 / #111827 | Primary text on light backgrounds, dark mode surfaces |

### Color Usage Rules
- [ ] Never use color as the sole indicator of state -- always pair with text, icons, or patterns
- [ ] Limit total palette to 3-5 hues plus neutrals (excessive color creates visual noise)
- [ ] Ensure all colors meet WCAG AA contrast requirements in both light and dark modes
- [ ] Use opacity/alpha variations of core colors for hover and active states instead of introducing new hues
- [ ] Test for color blindness (affects ~8% of men, ~0.5% of women): ensure red/green pairs have secondary encoding
- [ ] Define semantic color tokens (e.g., `color-error`) that reference the primitive palette (e.g., `color-red-600`)

---

## Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0px | Sharp corners (rarely used in modern UI, useful for data-dense tables) |
| `radius-sm` | 2-4px | Subtle rounding: inputs, small elements, tags, badges |
| `radius-md` | 6-8px | Default rounding: cards, buttons, dropdowns, modals |
| `radius-lg` | 12-16px | Prominent rounding: large cards, floating panels, image containers |
| `radius-xl` | 20-24px | Heavy rounding: pill buttons, feature cards, marketing elements |
| `radius-full` | 9999px | Full circle: avatars, circular buttons, dot indicators, pills |

### Border Radius Rules
- [ ] Choose one consistent border radius for each component category and apply it throughout the product
- [ ] Cards, modals, and dropdowns should share the same radius
- [ ] Buttons and inputs should share the same radius
- [ ] Nested elements: inner radius = outer radius - padding (to maintain consistent visual spacing)

---

## Shadows and Elevation

Shadows communicate elevation and importance. Use a consistent elevation system with 4-5 levels.

### Shadow Scale

| Token | CSS Value | Elevation | Usage |
|-------|-----------|-----------|-------|
| `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` | 1 (subtle) | Cards at rest, subtle input focus, hover states |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | 2 (default) | Cards on hover, dropdown menus, popovers |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | 3 (raised) | Modals, dialog boxes, floating panels |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)` | 4 (high) | Notifications, toasts, overlays |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | 5 (highest) | Spotlight elements, onboarding highlights |

### Elevation Rules
- [ ] Higher elevation = more important or more temporary (tooltips > modals > dropdowns > cards)
- [ ] Only one element at the highest elevation level on screen at a time
- [ ] Shadows should become larger and more diffused (not just darker) as elevation increases
- [ ] Dark mode: use lighter surface colors instead of (or in addition to) shadows to convey elevation
- [ ] Avoid solid black shadows -- use brand-tinted or neutral shadows with low opacity

---

## Breakpoints

### Standard Breakpoint Scale

| Token | Width | Target Device/Context |
|-------|-------|-----------------------|
| `mobile` | 320px | Small phones (iPhone SE, older Android) |
| `mobile-lg` | 480px | Large phones (iPhone 14/15, Samsung Galaxy S series) |
| `tablet` | 768px | Tablets in portrait (iPad mini, iPad) |
| `laptop` | 1024px | Small desktops, tablets in landscape, laptop screens |
| `desktop` | 1280px | Standard desktop monitors, external displays |
| `desktop-lg` | 1440px | Large desktops, design reference width |
| `wide` | 1920px | Full HD monitors, ultrawide-adjacent |

### Breakpoint Rules
- [ ] Design mobile-first: start from the smallest breakpoint and progressively enhance for larger screens
- [ ] Use relative units (%, rem, vw) for layout, not fixed pixel widths
- [ ] Add content-driven breakpoints where specific content breaks, in addition to device breakpoints
- [ ] Test at all standard breakpoints plus at arbitrary widths between breakpoints
- [ ] Body text remains 16px minimum at all breakpoints
- [ ] Content area maximum width: 1200-1440px to maintain readable line lengths on wide screens
- [ ] Use CSS `clamp()` for fluid values between breakpoints

---

## Z-Index System

Establish a layered z-index system to prevent stacking context conflicts. Reserve ranges for each layer.

### Z-Index Scale

| Token | Value | Layer | Usage |
|-------|-------|-------|-------|
| `z-base` | 0 | Base content | Default page content, static elements |
| `z-dropdown` | 1000 | Dropdowns | Select menus, autocomplete results, context menus |
| `z-sticky` | 1020 | Sticky elements | Sticky headers, sticky sidebar, sticky table headers |
| `z-fixed` | 1030 | Fixed elements | Fixed navigation bars, floating action buttons |
| `z-modal-backdrop` | 1040 | Backdrop | Modal backdrops, overlay backgrounds |
| `z-modal` | 1050 | Modals | Modal dialogs, slide-over panels, drawers |
| `z-popover` | 1060 | Popovers | Popovers, floating menus, rich tooltips |
| `z-tooltip` | 1070 | Tooltips | Simple tooltips, toast notifications |

### Z-Index Rules
- [ ] Never use arbitrary z-index values -- always use the token system
- [ ] Each layer must fully cover the layer below it (no visual bleed-through)
- [ ] Only one modal-level element visible at a time; stacking modals is an anti-pattern
- [ ] Tooltips and toasts should always be on the highest z-index layer
- [ ] Dropdowns inside modals should use `z-modal + z-dropdown` or be scoped within the modal's stacking context
- [ ] Document the z-index scale in the design system and enforce it via linting

---

## Component Sizing Scale

### Standard Component Heights

| Token | Height | Usage |
|-------|--------|-------|
| `size-xs` | 24px | Small badges, chips, compact tags |
| `size-sm` | 32px | Small buttons, compact inputs, table cells (compact density) |
| `size-md` | 40px | Default buttons, standard inputs, table cells (default density) |
| `size-lg` | 48px | Large buttons, touch-optimized inputs, table cells (comfortable density) |
| `size-xl` | 56px | Extra large buttons, prominent CTAs, hero-level inputs |

### Icon Sizes

| Token | Size | Usage |
|-------|------|-------|
| `icon-xs` | 12px | Inline text indicators, badges |
| `icon-sm` | 16px | Default inline icons (within text, buttons, form fields) |
| `icon-md` | 20px | Standalone icons in toolbars, navigation |
| `icon-lg` | 24px | Primary navigation icons, action icons |
| `icon-xl` | 32px | Feature icons, empty state illustrations (small) |
| `icon-2xl` | 48px | Large feature icons, hero section icons |

---

## Design Token Architecture

### Token Hierarchy

Design tokens follow a three-tier hierarchy for maximum flexibility:

**Tier 1 — Global/Primitive Tokens** (raw values)
```
color-blue-500: #3B82F6
color-red-600: #DC2626
space-4: 16px
font-size-base: 16px
radius-md: 8px
```

**Tier 2 — Semantic/Alias Tokens** (purpose-driven references)
```
color-primary: {color-blue-500}
color-error: {color-red-600}
spacing-component: {space-4}
font-size-body: {font-size-base}
radius-button: {radius-md}
```

**Tier 3 — Component Tokens** (component-specific overrides)
```
button-primary-bg: {color-primary}
button-primary-text: {color-white}
button-padding-x: {space-4}
button-radius: {radius-button}
input-border-color: {color-neutral-300}
```

### Token Rules
- [ ] Always reference semantic tokens in component code, never primitive tokens directly
- [ ] Never hard-code raw values (e.g., `#3B82F6`) -- always use tokens
- [ ] Theme switching (light/dark, brand) operates at the semantic token layer
- [ ] Token names describe purpose, not appearance (`color-primary`, not `color-blue`)
- [ ] Document every token with its intended usage context
- [ ] Use CSS custom properties (`var(--color-primary)`) for runtime theme switching
