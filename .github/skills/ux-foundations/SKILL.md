---
name: ux-foundations
description: Use this skill whenever the user mentions UX, UI, interface design, user experience, usability, accessibility, design systems, Nielsen heuristics, WCAG, color contrast, typography scale, spacing, or any question about how an interface should look, feel, or behave. Also use it when designing, reviewing, or auditing any interface — even if the user doesn't explicitly say "UX". This is the foundational knowledge base that underpins all other ux-expert skills. When in doubt about whether UX principles apply, they do — load this skill.
---

# UX Foundations

This skill provides the core UX knowledge base that underpins all interface design work. It covers four pillars:

1. **Usability Heuristics** -- Nielsen's 10 principles for evaluating any interface
2. **UX Psychology** -- Cognitive laws governing how users perceive, decide, and act
3. **Accessibility (WCAG 2.2 AA)** -- Requirements for inclusive, standards-compliant interfaces
4. **Design System Fundamentals** -- Spacing, typography, color, and layout specifications

Apply these foundations universally -- they hold true for SaaS dashboards, landing pages, admin portals, mobile apps, and any web-based interface.

---

## Nielsen's 10 Usability Heuristics (Quick Reference)

| #   | Heuristic                                               | Core Rule                                                                                     |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Visibility of system status                             | Always inform users about what is happening through timely, appropriate feedback.             |
| 2   | Match between system and real world                     | Use language, concepts, and conventions familiar to the user, not internal jargon.            |
| 3   | User control and freedom                                | Provide undo, redo, cancel, and clear exit paths -- users will make mistakes.                 |
| 4   | Consistency and standards                               | Follow platform conventions; identical actions must produce identical results everywhere.     |
| 5   | Error prevention                                        | Design constraints and confirmations that prevent errors before they occur.                   |
| 6   | Recognition rather than recall                          | Make elements, actions, and options visible so users never need to memorize.                  |
| 7   | Flexibility and efficiency of use                       | Offer shortcuts and customization for experts without confusing novices.                      |
| 8   | Aesthetic and minimalist design                         | Remove every element that does not serve a clear purpose; information competes for attention. |
| 9   | Help users recognize, diagnose, and recover from errors | Write error messages in plain language, identify the problem specifically, and suggest a fix. |
| 10  | Help and documentation                                  | Provide searchable, task-focused help that is easy to find and contextually relevant.         |

> Full details with violation examples, good implementation examples, and checkable audit items: see `./references/nielsen-heuristics.md`

---

## Key UX Psychology Laws (Quick Reference)

| Law                       | Core Rule                                                                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Fitts's Law**           | Make targets large and close to the user's focus area -- time to reach a target depends on its size and distance. Min touch target: 44x44px (WCAG), 48x48px (Material).        |
| **Hick's Law**            | Limit choices to reduce decision time -- keep primary navigation to 5-7 items, use progressive disclosure, and break complex decisions into sequential steps.                  |
| **Miller's Law**          | Working memory holds 7 +/- 2 items -- chunk information into groups of 3-4, limit steps in wizards, and use external memory aids.                                              |
| **Cognitive Load Theory** | Minimize extraneous load (visual clutter, inconsistency), simplify intrinsic load (break tasks into steps), and maximize germane load (use familiar patterns to aid learning). |
| **Gestalt Principles**    | Users perceive visual groups based on proximity, similarity, closure, continuity, figure-ground, common region, and symmetry -- use these to structure layouts.                |
| **Von Restorff Effect**   | An item that stands out from its group is more likely to be remembered -- use visual distinction for primary CTAs and critical information.                                    |
| **Jakob's Law**           | Users spend most of their time on other sites and expect similar patterns -- follow established conventions rather than reinventing interactions.                              |

> Full details with specific measurements, UI applications, and examples: see `./references/psychology-laws.md`

---

## UX Scoring Rubric (Quick Reference)

Score each dimension from 1 (poor) to 10 (excellent). Global score = sum of 10 dimensions (max 100).

| Dimension          | 1-3 (Poor)                            | 4-6 (Adequate)                          | 7-10 (Excellent)                                  |
| ------------------ | ------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| **Navigation**     | Users cannot find core features       | Users find features with some searching | Users find everything instantly                   |
| **Clarity**        | Users do not understand what to do    | Users figure it out with effort         | Intent is immediately clear                       |
| **Feedback**       | No response to user actions           | Basic loading/success states            | Rich, contextual feedback for every action        |
| **Error Handling** | Errors cause data loss or dead ends   | Errors caught with generic messages     | Errors prevented, with specific recovery guidance |
| **Consistency**    | Every page feels like a different app | Most patterns are consistent            | Complete pattern consistency throughout           |
| **Accessibility**  | Keyboard unusable, no alt text        | Partial WCAG compliance                 | Full WCAG 2.2 AA compliance                       |
| **Performance**    | LCP > 5s, significant CLS             | LCP 2.5-4s, some layout shift           | LCP < 2.5s, CLS < 0.1, FID < 100ms                |
| **Mobile**         | Broken on mobile                      | Functional but awkward on mobile        | Native-quality mobile experience                  |
| **Visual Design**  | Cluttered, no hierarchy               | Clean with some hierarchy issues        | Clear hierarchy, purposeful whitespace, polished  |
| **Content**        | Jargon-heavy, unclear                 | Mostly clear, some jargon               | Scannable, user-centered, helpful                 |

- Below 60/100 = Critical attention needed
- 60-80/100 = Solid foundation with room for improvement
- Above 80/100 = Strong UX

When auditing, score each dimension independently and include a 1-sentence justification per score.

---

## Core Accessibility Requirements (WCAG 2.2 AA)

Apply these four requirements to every interface without exception:

### 1. Color Contrast

- Normal text (under 18px bold or 24px regular): minimum **4.5:1** contrast ratio
- Large text (18px+ bold or 24px+ regular): minimum **3:1** contrast ratio
- Non-text UI elements (icons, borders, form controls): minimum **3:1** contrast ratio
- Never use color as the sole means of conveying information -- always pair with text, icons, or patterns

### 2. Touch and Click Targets

- Minimum target size: **44x44 CSS pixels** (WCAG 2.2), **48x48px** recommended (Material Design)
- Minimum spacing between adjacent targets: **8px**
- Place primary actions in the thumb zone (lower third of mobile screens)

### 3. Keyboard Navigation

- All functionality must be operable via keyboard alone
- Focus indicator must be visible: minimum **2px** outline with **3:1** contrast against adjacent colors
- Focus order must follow logical visual reading order
- No keyboard traps -- users must be able to Tab away from every element
- Provide a skip-navigation link as the first focusable element

### 4. Screen Reader Support

- All images require `alt` text (decorative images use `alt=""`)
- Form inputs must have associated `<label>` elements or `aria-labelledby`
- Dynamic content updates require `aria-live` regions
- Use semantic HTML (`<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`) as the foundation
- Custom interactive components require appropriate ARIA roles, states, and properties

> Complete WCAG 2.2 AA checklist with POUR principles, ARIA patterns, and screen reader considerations: see `./references/accessibility-wcag.md`

---

## Design System Essentials

### Spacing Grid (4pt base)

Use multiples of 4px for all spacing, padding, and margin values:
`4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96`

- Tight (4-8px): icon-to-label gaps, inline element spacing
- Default (12-16px): form label to input, component internal padding
- Loose (24-32px): between components within a section
- Section (48-96px): between major page sections

### Typography Scale

Base size: **16px** body text. Apply a modular scale ratio:

| Ratio Name       | Value | Best For                    |
| ---------------- | ----- | --------------------------- |
| Major Second     | 1.125 | Dense data UIs              |
| Minor Third      | 1.200 | Text-heavy SaaS interfaces  |
| Major Third      | 1.250 | General purpose, versatile  |
| Perfect Fourth   | 1.333 | Marketing and content sites |
| Augmented Fourth | 1.414 | Editorial, blog layouts     |
| Perfect Fifth    | 1.500 | Presentation-style layouts  |
| Golden Ratio     | 1.618 | Landing pages, high drama   |

Recommended type ramp (px): `12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72`

Limit distinct sizes to 6-8 across the product. Use font weight (regular, medium, semibold, bold) as a secondary hierarchy tool.

### Breakpoints

| Token        | Width  | Target                            |
| ------------ | ------ | --------------------------------- |
| `mobile`     | 320px  | Small phones                      |
| `mobile-lg`  | 480px  | Large phones                      |
| `tablet`     | 768px  | Tablets (portrait)                |
| `laptop`     | 1024px | Small desktops, landscape tablets |
| `desktop`    | 1280px | Standard desktops                 |
| `desktop-lg` | 1440px | Large desktops                    |
| `wide`       | 1920px | Full HD monitors                  |

> Complete design system reference with color systems, border radius, shadows, elevation, and z-index scale: see `./references/design-systems.md`

---

## Reference Files

For detailed, audit-ready content on each pillar, consult:

| File                                 | Contents                                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `./references/nielsen-heuristics.md` | Full Nielsen's 10 heuristics with violation examples, good examples, and checkable audit items           |
| `./references/psychology-laws.md`    | Complete UX psychology laws with specific measurements, UI applications, and cognitive load theory       |
| `./references/accessibility-wcag.md` | Full WCAG 2.2 AA reference with POUR checklists, ARIA patterns, and screen reader guidance               |
| `./references/design-systems.md`     | Complete design system specifications with spacing, typography, color, shadows, z-index, and breakpoints |
