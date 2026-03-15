# Accessibility — WCAG 2.2 AA Complete Reference

> Based on W3C Web Content Accessibility Guidelines (WCAG) 2.2, Level AA. These requirements are the minimum standard for inclusive, legally compliant web interfaces.

---

## POUR Principles Overview

WCAG organizes all success criteria under four principles. Content must be:

1. **Perceivable** — Users must be able to perceive the information (it cannot be invisible to all their senses)
2. **Operable** — Users must be able to operate the interface (it cannot require interactions a user cannot perform)
3. **Understandable** — Users must be able to understand the information and the operation of the UI
4. **Robust** — Content must be robust enough that it can be interpreted by a wide variety of user agents, including assistive technologies

---

## 1. Perceivable

### 1.1 Text Alternatives
- [ ] All informational images have descriptive `alt` text that conveys the purpose of the image
- [ ] Decorative images use `alt=""` (empty alt) or are applied via CSS background
- [ ] Complex images (charts, diagrams) have extended descriptions via `aria-describedby` or adjacent text
- [ ] Icon buttons without visible text have `aria-label` or `aria-labelledby`
- [ ] SVG icons include a `<title>` element or `aria-label` for screen readers
- [ ] CAPTCHAs provide an audio alternative

### 1.2 Time-Based Media
- [ ] Pre-recorded video has synchronized captions
- [ ] Pre-recorded audio has a text transcript
- [ ] Live video has real-time captions (where feasible)
- [ ] Audio descriptions provided for video content where visual information is essential
- [ ] Media player controls are keyboard accessible

### 1.3 Adaptable Content
- [ ] Content structure is conveyed through proper semantic HTML, not visual styling alone
- [ ] Heading hierarchy is logical (h1 > h2 > h3, no skipped levels)
- [ ] Lists use `<ul>`, `<ol>`, or `<dl>` elements, not styled paragraphs
- [ ] Tables use `<th>` for headers and `scope` attributes for complex tables
- [ ] Reading order in the DOM matches the visual order on the page
- [ ] Content adapts to portrait and landscape orientations without loss of information
- [ ] Form fields are programmatically associated with their labels

### 1.4 Distinguishable Content

#### Color Contrast Requirements

| Element Type | Minimum Contrast Ratio (AA) | Enhanced Ratio (AAA) |
|-------------|---------------------------|---------------------|
| Normal text (under 18px bold / 24px regular) | **4.5:1** | 7:1 |
| Large text (18px+ bold / 24px+ regular) | **3:1** | 4.5:1 |
| UI components (borders, icons, form controls) | **3:1** | — |
| Focus indicators | **3:1** against adjacent colors | — |
| Disabled elements | No requirement | — |
| Logos and decorative elements | No requirement | — |

#### Contrast Checklist
- [ ] Body text meets 4.5:1 contrast against its background
- [ ] Heading text meets 4.5:1 (or 3:1 if 18px+ bold / 24px+ regular)
- [ ] Link text is distinguishable from surrounding text (3:1 contrast between link and non-link text, or use underline)
- [ ] Placeholder text meets 4.5:1 contrast (often fails -- use 16px+ placeholder if lower contrast)
- [ ] Button text meets 4.5:1 against the button background
- [ ] Icon-only controls meet 3:1 against their background
- [ ] Form input borders meet 3:1 against the page background
- [ ] Focus indicator meets 3:1 against adjacent colors
- [ ] All contrast requirements hold in both light mode and dark mode

#### Other Distinguishable Requirements
- [ ] Color is NOT the sole means of conveying information (pair with icons, text, or patterns)
- [ ] Text can be resized up to 200% without loss of content or functionality
- [ ] Content reflows at 320px width without horizontal scrolling (for 1280px default viewport)
- [ ] Text spacing can be adjusted (line-height to 1.5x, paragraph spacing to 2x, letter spacing to 0.12em, word spacing to 0.16em) without loss of content
- [ ] Hover and focus tooltips/popovers are dismissible (Escape), hoverable (user can move pointer over them), and persistent (stay until dismissed)

---

## 2. Operable

### 2.1 Keyboard Accessible
- [ ] ALL functionality is available via keyboard alone (no mouse required)
- [ ] No keyboard traps: users can Tab into AND out of every element
- [ ] Tab order follows the visual reading order (left-to-right, top-to-bottom for LTR)
- [ ] Custom keyboard shortcuts do not conflict with browser or screen reader shortcuts
- [ ] Keyboard shortcuts can be turned off or remapped
- [ ] Skip navigation link is the first focusable element on the page

#### Standard Keyboard Patterns

| Interaction | Keys |
|------------|------|
| Navigate between focusable elements | Tab / Shift+Tab |
| Activate buttons and links | Enter or Space |
| Navigate within a group (tabs, radio, menu) | Arrow keys |
| Close overlays (modal, dropdown, popover) | Escape |
| Select/deselect checkbox | Space |
| Open a dropdown | Enter, Space, or ArrowDown |
| Navigate to first/last item | Home / End |

### 2.2 Sufficient Time
- [ ] Time limits are adjustable: user can turn off, extend (at least 10x), or adjust
- [ ] Moving, blinking, or scrolling content that starts automatically can be paused, stopped, or hidden
- [ ] Auto-updating content can be paused, stopped, or controlled
- [ ] No session timeout without warning and ability to extend

### 2.3 Seizures and Physical Reactions
- [ ] No content flashes more than 3 times per second
- [ ] Motion animations can be disabled (respect `prefers-reduced-motion` media query)

### 2.4 Navigable

#### Focus Indicators

| Property | Requirement |
|----------|------------|
| Outline width | Minimum **2px** |
| Outline contrast | **3:1** against adjacent colors |
| Outline offset | 2px offset from the element (recommended, prevents overlap) |
| Shape | Must enclose the entire interactive element |
| Visibility | Must not be removed with `outline: none` without a visible replacement |

#### Focus Checklist
- [ ] Every focusable element has a visible focus indicator
- [ ] Focus indicator has a minimum 2px outline
- [ ] Focus indicator meets 3:1 contrast against adjacent colors
- [ ] `outline: none` is never used without providing an alternative visible focus style
- [ ] Focus is not trapped in any element or component
- [ ] Focus is managed correctly when opening/closing modals (focus moves to modal, returns on close)
- [ ] Focus order is logical and matches the visual layout
- [ ] Page has a descriptive `<title>` element
- [ ] Headings describe the content that follows them
- [ ] Link text is descriptive out of context (no "click here" or "read more" without context)

#### Touch Target Requirements (WCAG 2.2)

| Requirement | Size |
|------------|------|
| WCAG 2.2 AA minimum target size | **24x24 CSS pixels** |
| WCAG recommended target size | **44x44 CSS pixels** |
| Material Design target size | **48x48px** |
| Apple Human Interface Guidelines | **44x44pt** |
| Minimum spacing between targets | **8px** |
| Recommended spacing between targets | **12-16px** |

- [ ] All interactive elements meet 44x44px minimum touch target
- [ ] Spacing between adjacent targets is at least 8px
- [ ] Inline links within text have sufficient target area (padding applied or sufficient line-height)
- [ ] Close buttons, checkboxes, and small controls meet minimum target size

---

## 3. Understandable

### 3.1 Readable
- [ ] Page language is declared via `lang` attribute on `<html>` element
- [ ] Language changes within the page are marked with `lang` attribute on the containing element
- [ ] Reading level is appropriate for the target audience
- [ ] Abbreviations are explained on first use or via `<abbr>` element

### 3.2 Predictable
- [ ] Navigation is consistent across all pages (same order, same position, same labels)
- [ ] Components that have the same functionality have consistent identification across pages
- [ ] No unexpected context changes on focus (page should not navigate or submit on focus alone)
- [ ] No unexpected context changes on input (dropdowns should not auto-submit on selection)
- [ ] Form submission requires explicit user action (clicking a submit button)

### 3.3 Input Assistance

#### Form Labels and Instructions
- [ ] Every form input has a visible `<label>` element programmatically associated via `for`/`id`
- [ ] Required fields are indicated (asterisk, "required" text, or `aria-required="true"`)
- [ ] Input purpose is identified using `autocomplete` attributes for personal data fields
- [ ] Complex inputs have additional instructions or help text via `aria-describedby`
- [ ] Group related fields using `<fieldset>` and `<legend>` (e.g., radio button groups, address fields)

#### Error Handling
- [ ] Errors are identified automatically when the user leaves a field or submits
- [ ] Error messages describe the problem in plain language
- [ ] Error messages suggest how to fix the problem
- [ ] Error text is programmatically associated with the field via `aria-describedby` or `aria-errormessage`
- [ ] Errors do NOT clear the user's previously entered (valid) input
- [ ] For critical submissions (legal, financial), allow review and confirmation before final submit, or provide ability to reverse the submission

---

## 4. Robust

### 4.1 Compatible with Assistive Technologies
- [ ] HTML is valid and well-formed (no duplicate IDs, properly nested elements)
- [ ] Semantic HTML elements are used (`<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`, `<section>`, `<article>`)
- [ ] Heading hierarchy is complete and logical (`<h1>` through `<h6>`, no skipped levels)
- [ ] ARIA attributes are used correctly (valid roles, states, and properties)
- [ ] ARIA is used only when native HTML elements cannot achieve the same result (first rule of ARIA: do not use ARIA if native HTML works)

### 4.2 Status Messages
- [ ] Status messages (success, error, warning, info) are announced to screen readers without moving focus
- [ ] Use `aria-live="polite"` for non-urgent updates (save confirmation, item added to cart)
- [ ] Use `aria-live="assertive"` for urgent updates (session expiring, critical error)
- [ ] Use `role="status"` for status messages
- [ ] Use `role="alert"` for urgent alerts that need immediate attention
- [ ] Toast/snackbar notifications are announced to screen readers

---

## ARIA Patterns for Common Components

### Modal Dialog
```
role="dialog"
aria-modal="true"
aria-labelledby="[heading-id]"
aria-describedby="[description-id]" (optional)
```
- [ ] Focus moves to the first focusable element inside the modal when it opens
- [ ] Focus is trapped within the modal (Tab cycles through modal elements only)
- [ ] Escape key closes the modal
- [ ] Focus returns to the triggering element when the modal closes
- [ ] Background content is marked `aria-hidden="true"` or `inert` while modal is open

### Dropdown Menu
```
button: aria-haspopup="true", aria-expanded="false|true"
menu: role="menu"
items: role="menuitem"
```
- [ ] Toggle button has `aria-expanded` reflecting open/closed state
- [ ] Arrow keys navigate between menu items
- [ ] Enter/Space activates the focused menu item
- [ ] Escape closes the menu and returns focus to the toggle button
- [ ] Type-ahead: typing a letter moves focus to the next item starting with that letter

### Tab Panel
```
tablist: role="tablist"
tab: role="tab", aria-selected="true|false", aria-controls="[panel-id]"
panel: role="tabpanel", aria-labelledby="[tab-id]"
```
- [ ] Left/Right arrow keys navigate between tabs
- [ ] Tab key moves focus from the active tab to the tab panel content
- [ ] Home/End keys move to first/last tab
- [ ] Only the active tab is in the tab order (`tabindex="0"`); inactive tabs have `tabindex="-1"`
- [ ] `aria-selected="true"` is set on the active tab only

### Accordion
```
trigger: button with aria-expanded="true|false", aria-controls="[panel-id]"
panel: role="region", aria-labelledby="[trigger-id]"
```
- [ ] Each accordion header is a `<button>` (or element with `role="button"`)
- [ ] `aria-expanded` reflects the open/closed state
- [ ] Enter/Space toggles the accordion section
- [ ] Optionally: Up/Down arrow keys navigate between accordion headers

### Combobox / Autocomplete
```
input: role="combobox", aria-expanded="true|false", aria-controls="[listbox-id]", aria-activedescendant="[option-id]"
listbox: role="listbox"
options: role="option", aria-selected="true|false"
```
- [ ] `aria-expanded` updates when the suggestion list opens/closes
- [ ] `aria-activedescendant` updates as the user arrows through suggestions
- [ ] Enter selects the active suggestion
- [ ] Escape closes the suggestion list
- [ ] Screen readers announce the number of available suggestions

### Tooltip
```
trigger: aria-describedby="[tooltip-id]"
tooltip: role="tooltip"
```
- [ ] Tooltip appears on focus and hover
- [ ] Tooltip dismissible via Escape key
- [ ] Tooltip is hoverable (user can move pointer over it)
- [ ] Tooltip is persistent until dismissed or focus/hover leaves the trigger

---

## Screen Reader Considerations

### Content Announcement
- [ ] Use semantic HTML over ARIA wherever possible (native elements announce correctly by default)
- [ ] Images: screen reader announces alt text. Decorative images with `alt=""` are skipped
- [ ] Buttons: screen reader announces button text and role. Icon-only buttons require `aria-label`
- [ ] Links: screen reader announces link text and role. Ensure link text is descriptive out of context
- [ ] Headings: screen reader allows heading-level navigation (h1-h6). Maintain proper hierarchy
- [ ] Lists: screen reader announces "list, X items" for `<ul>`/`<ol>`. Use list elements for list content
- [ ] Tables: screen reader navigates by cell and announces row/column headers. Use `<th>` and `scope`

### Dynamic Content
- [ ] Use `aria-live` regions to announce content that updates without page reload
- [ ] Avoid excessive live region announcements (screen reader chatter is disorienting)
- [ ] Loading states: announce "Loading..." when starting, announce completion or result count when finished
- [ ] Route changes in SPAs: announce the new page title or heading on navigation
- [ ] Form errors: announce error count and first error on submission failure

### Hidden Content
- [ ] Content hidden with `display: none` or `visibility: hidden` is hidden from screen readers
- [ ] Content hidden only visually (CSS clipping for `.sr-only` / `.visually-hidden`) remains available to screen readers
- [ ] `aria-hidden="true"` hides content from screen readers while keeping it visually present
- [ ] Off-screen content that should not be announced uses `aria-hidden="true"`

### Testing Approach
- [ ] Test with VoiceOver (macOS/iOS) as the primary screen reader for Safari
- [ ] Test with NVDA (Windows) as the primary screen reader for Chrome/Firefox
- [ ] Test with TalkBack (Android) for mobile Android
- [ ] Navigate the entire page using only Tab, Shift+Tab, Enter, Space, Escape, and Arrow keys
- [ ] Verify all interactive elements are reachable and operable via keyboard
- [ ] Verify all dynamic content changes are announced appropriately
- [ ] Run automated audit tools (axe, Lighthouse accessibility) as a supplement, not a replacement, for manual testing
