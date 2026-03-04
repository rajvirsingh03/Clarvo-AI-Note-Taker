# Nielsen's 10 Usability Heuristics — Complete Reference

> Source: Jakob Nielsen, Nielsen Norman Group (1994, updated 2024). These heuristics apply to any interactive system regardless of platform, domain, or technology.

---

## 1. Visibility of System Status

**Principle**: Keep users informed about what is happening through appropriate, timely feedback.

### Violations (What Goes Wrong)
- No loading indicator when content takes more than 300ms to appear
- Form submission with no visual confirmation of success or failure
- File upload with no progress bar or percentage indicator
- Background processes (syncing, saving, indexing) with no status indication
- Button that does not change state when clicked (no disabled state, no spinner)
- System errors that fail silently with no notification to the user

### Good Implementation
- Skeleton loaders that mirror the shape of incoming content
- Progress bars with percentage for operations longer than 2 seconds
- Inline save confirmation ("Saved" text or checkmark animation) within 1 second
- Real-time character counts on limited text fields (e.g., "42/280 characters")
- Status badges on async operations (queued, processing, complete, failed)
- Toast notifications confirming successful actions ("Project created successfully")

### Audit Checklist
- [ ] Every user action produces visible feedback within 100ms
- [ ] Operations longer than 1 second show a loading indicator
- [ ] Operations longer than 10 seconds show a progress bar with estimate
- [ ] Form submissions display success or error feedback
- [ ] Background processes show status (syncing, saving, updating)
- [ ] System status is communicated to screen readers via `aria-live` regions
- [ ] Error states are visually distinct and accompanied by explanatory text

---

## 2. Match Between System and Real World

**Principle**: Use language, concepts, and conventions that are familiar to the user. Follow real-world conventions and present information in a natural, logical order.

### Violations (What Goes Wrong)
- Technical jargon in user-facing text ("Error 500: Internal Server Error", "NULL reference")
- Database field names exposed in the UI ("created_at", "is_active", "user_id")
- Icons that use metaphors unfamiliar to the target audience
- Date formats inconsistent with the user's locale (MM/DD/YYYY vs DD/MM/YYYY)
- Actions labeled with system terms ("Execute query") instead of user terms ("Run search")
- Organization of content matching internal team structure rather than user mental models

### Good Implementation
- User-tested labels verified through card sorting or usability testing
- Natural language descriptions: "Last edited 3 hours ago" instead of "2024-01-15T14:32:00Z"
- Real-world metaphors: shopping cart, folder, trash/recycle bin, inbox
- Locale-aware formatting for dates, numbers, currencies, and units
- Domain-specific language matching what users call things in their own work
- Information organized by user task, not by system module

### Audit Checklist
- [ ] No technical jargon, error codes, or database terms visible to end users
- [ ] Labels and terminology match what users call things (validated by research)
- [ ] Icons use universally recognizable metaphors or include text labels
- [ ] Dates, numbers, and currencies follow the user's locale conventions
- [ ] Content is organized by user task or mental model, not internal structure
- [ ] Status messages use plain language ("Your file is ready" not "Process completed with exit code 0")

---

## 3. User Control and Freedom

**Principle**: Provide undo, redo, clear exits, and a way to go back. Users frequently perform actions by mistake and need a clearly marked emergency exit.

### Violations (What Goes Wrong)
- No undo after deleting an item (hard delete with no recovery)
- Modal dialogs with no close button or Escape key dismissal
- Wizard flows with no back button or ability to edit previous steps
- Forced onboarding that cannot be skipped or dismissed
- Browser back button that breaks or produces unexpected results
- Checkout or sign-up flows that trap the user with no clear exit

### Good Implementation
- Undo via toast notification with 5-10 second timer after destructive actions
- Soft-delete pattern: items move to trash with 30-day recovery period
- Escape key closes modals, dropdowns, and overlays universally
- Back button on every step of multi-step flows, with state preserved
- "Skip for now" option on all onboarding and tutorial flows
- Cmd/Ctrl+Z for undo in text editing and content creation contexts
- Clear "Cancel" or "Discard changes" buttons on all forms

### Audit Checklist
- [ ] Undo is available for destructive actions (delete, remove, archive)
- [ ] Modals can be closed via close button, Escape key, and backdrop click
- [ ] Multi-step flows have a back button that preserves entered data
- [ ] Onboarding and tutorials are skippable
- [ ] Browser back button works as expected on every page
- [ ] Cancel/discard option is available on all forms and editors
- [ ] Users can recover from accidental navigation (unsaved changes warning)

---

## 4. Consistency and Standards

**Principle**: Follow platform conventions. Users should not have to wonder whether different words, situations, or actions mean the same thing.

### Violations (What Goes Wrong)
- Primary buttons styled differently across pages (different colors, sizes, or shapes)
- Same action called different names ("Remove" on one page, "Delete" on another, "Trash" on a third)
- Inconsistent icon usage (same icon meaning different things in different contexts)
- Navigation that moves position or changes structure between pages
- Mixed interaction patterns (some lists are click-to-select, others are click-to-navigate)
- Form layouts that change between pages (labels above on one form, beside on another)

### Good Implementation
- Design system with documented component library used across the entire product
- Consistent terminology glossary enforced in all UI copy
- Uniform button hierarchy: primary (filled), secondary (outlined), tertiary (text/ghost)
- Same interaction patterns for identical components throughout the product
- Consistent form layout pattern (labels above inputs, single column, inline validation)
- Platform-appropriate keyboard shortcuts (Cmd on Mac, Ctrl on Windows)

### Audit Checklist
- [ ] Primary, secondary, and tertiary button styles are used consistently
- [ ] Same terminology is used for the same concept across all pages
- [ ] Icon meanings are consistent throughout the product
- [ ] Navigation structure and position are identical on every page
- [ ] Form layout patterns are uniform across all forms
- [ ] Interaction patterns (click, hover, drag) behave identically for identical components
- [ ] Platform conventions are followed (standard shortcuts, native select/date inputs)

---

## 5. Error Prevention

**Principle**: Design to prevent errors before they happen. Good error messages are important, but the best design prevents problems from occurring in the first place.

### Violations (What Goes Wrong)
- Delete button with no confirmation dialog, especially for irreversible actions
- Free-text input where a constrained input (dropdown, date picker) would prevent invalid entries
- No character limit enforcement on fields with database constraints
- Submit button enabled when required fields are empty
- No autosave on long forms, risking data loss from accidental navigation or timeout
- Adjacent destructive and constructive buttons with similar visual weight

### Good Implementation
- Confirmation dialogs for all destructive actions with clear consequence description
- Type-to-confirm for high-stakes deletions ("Type the project name to delete")
- Input constraints: date pickers instead of free-text date entry, numeric keyboards for number fields
- Disable submit button until all required fields pass validation
- Autosave drafts every 30 seconds on long-form content
- Smart defaults that pre-fill common values correctly
- Inline validation as the user types, showing errors before submission
- Visual separation between destructive and constructive actions (e.g., red "Delete" far from blue "Save")

### Audit Checklist
- [ ] Destructive actions require explicit confirmation
- [ ] High-stakes deletions require typing the resource name
- [ ] Constrained inputs used where possible (dropdowns, date pickers, toggles)
- [ ] Submit/save buttons are disabled until minimum valid input is provided
- [ ] Long forms autosave drafts to prevent data loss
- [ ] Smart defaults reduce the number of decisions users must make
- [ ] Inline validation catches errors before form submission
- [ ] Destructive and constructive buttons are visually distinct and spatially separated

---

## 6. Recognition Rather Than Recall

**Principle**: Minimize the user's memory load by making elements, actions, and options visible. Users should not have to remember information from one part of the interface to another.

### Violations (What Goes Wrong)
- Icon-only navigation without text labels or persistent tooltips
- Search with no recent searches or suggestions
- Form fields with no visible labels (placeholder-only labels that disappear on focus)
- Reference codes or IDs that users must memorize to complete tasks
- Settings that require remembering what the previous value was
- Multi-step forms where earlier entries are not visible from later steps

### Good Implementation
- Icon + text label pairs for all navigation items
- Recent searches and autocomplete suggestions in search fields
- Persistent, visible labels above form inputs (not just placeholders)
- Recently viewed items, favorites, and bookmarks for quick re-access
- Contextual help tooltips on complex or infrequently used features
- Summary panels in multi-step flows showing all previous entries
- Command palette with searchable list of all available actions

### Audit Checklist
- [ ] All navigation items have visible text labels (not icon-only)
- [ ] Search includes recent searches, suggestions, or autocomplete
- [ ] Form fields have persistent visible labels (not placeholder-only)
- [ ] Recently viewed or recently used items are accessible
- [ ] Contextual help is available for complex features
- [ ] Multi-step flows display a summary of previously entered data
- [ ] Users do not need to memorize codes, IDs, or values to complete tasks

---

## 7. Flexibility and Efficiency of Use

**Principle**: Provide accelerators for expert users that do not interfere with the experience of novice users. Allow users to customize frequent actions.

### Violations (What Goes Wrong)
- No keyboard shortcuts for common actions
- Forced step-by-step wizard for experienced users who know what they want
- No bulk actions for repetitive tasks (editing, deleting, tagging multiple items)
- No way to save custom views, filters, or presets
- One-size-fits-all interface with no density or layout options
- No quick-create or inline-add for frequently created items

### Good Implementation
- Keyboard shortcuts for power users with a discoverable shortcut reference (? key)
- Command palette (Cmd/Ctrl+K) for quick navigation and action execution
- Bulk selection and bulk actions on tables and lists
- Saved filters, custom views, and bookmarked searches
- Compact/comfortable/spacious density toggles for data-heavy interfaces
- Quick-create shortcuts: "N" for new item, inline-add rows in tables
- Customizable dashboard widgets with drag-and-drop arrangement
- Reusable templates for frequently created content

### Audit Checklist
- [ ] Keyboard shortcuts exist for the 5 most common actions
- [ ] Shortcut reference is discoverable (help modal or ? key)
- [ ] Bulk actions are available for lists and tables
- [ ] Custom views, saved filters, or presets can be created and recalled
- [ ] Interface density is adjustable for power users
- [ ] Quick-create paths exist for frequently added items
- [ ] Expert features do not interfere with the novice experience

---

## 8. Aesthetic and Minimalist Design

**Principle**: Every element on the screen should serve a purpose. Remove decorative-only elements. Information competes for attention -- irrelevant information diminishes the visibility of relevant information.

### Violations (What Goes Wrong)
- Decorative imagery that adds no informational value
- Excessive use of color, making color meaningless as a signal
- Dense pages with no visual hierarchy (everything has equal weight)
- Redundant text that restates what is already visible ("Click the Save button to save")
- Multiple competing calls-to-action on the same screen
- Chrome and UI overhead that reduces the content area unnecessarily

### Good Implementation
- Clear visual hierarchy: one primary focal point per screen
- Purposeful whitespace that groups related content and separates sections
- Progressive disclosure: show essential information first, details on demand
- Minimal chrome: maximize content area, minimize navigation and toolbar overhead
- Focused screens: each page or view has one clear purpose and primary action
- Typography and spacing (not decoration) as the primary tools for creating hierarchy
- Data-ink ratio: maximize the proportion of visual elements conveying data vs decoration

### Audit Checklist
- [ ] Every page has one clear primary action or focal point
- [ ] No decorative-only elements that serve no informational purpose
- [ ] Whitespace is used purposefully to group and separate content
- [ ] Content is progressively disclosed (summary first, detail on demand)
- [ ] Color is used as a meaningful signal, not as decoration
- [ ] Competing CTAs are reduced to one primary and at most one secondary per view
- [ ] Screen real estate is dominated by content, not by chrome or empty decoration

---

## 9. Help Users Recognize, Diagnose, and Recover from Errors

**Principle**: Error messages should be expressed in plain language (no codes), precisely indicate the problem, and constructively suggest a solution.

### Violations (What Goes Wrong)
- Generic error messages: "Something went wrong", "Error", "Invalid input"
- Technical error codes shown to end users: "Error 500", "ERR_CONNECTION_REFUSED"
- Error messages that blame the user: "You entered an invalid email"
- Errors that do not identify which field or action caused the problem
- Error states with no suggested recovery action
- Errors that clear the form, losing all user input

### Good Implementation
- Structured error messages: what happened + why + what to do next
- Field-level inline errors appearing next to the problematic input
- Empathetic, non-blaming tone: "That email address doesn't look right. Check for typos."
- Specific guidance: "Password needs at least 8 characters, including a number" (not "Invalid password")
- Retry buttons and alternative paths: "Try again" or "Contact support"
- Form state preserved after errors so users do not re-enter valid data
- Error summaries at the top of long forms linking to each problematic field

### Audit Checklist
- [ ] Error messages are written in plain language with no technical codes
- [ ] Error messages identify the specific field or action that failed
- [ ] Error messages suggest a concrete recovery action
- [ ] Tone is empathetic and does not blame the user
- [ ] Inline errors appear next to the relevant field (not only at form top)
- [ ] Form input is preserved after validation errors
- [ ] Long forms include an error summary with jump-links to problematic fields
- [ ] Network/server errors offer a retry option

---

## 10. Help and Documentation

**Principle**: Provide searchable, task-focused help that is easy to find. Even though it is better if the system can be used without documentation, help should be available and contextual.

### Violations (What Goes Wrong)
- No help section, FAQ, or documentation at all
- Help documentation that is outdated and does not match the current UI
- No search within help content
- Contextual help (tooltips, popovers) that is absent from complex features
- Help content written from the system perspective rather than the user task perspective
- No way to contact support from within the product

### Good Implementation
- Searchable help center accessible from every page (? icon or Help in navigation)
- Contextual tooltips on complex or unfamiliar UI elements
- In-product onboarding tours for key features (replayable from help menu)
- Keyboard shortcut reference accessible via ? key press
- Task-oriented documentation: "How to invite a team member" not "User management API"
- Live chat or support contact accessible from within the product
- Changelog or "What's new" section for feature updates

### Audit Checklist
- [ ] Help/documentation is accessible from every page
- [ ] Help content is searchable
- [ ] Contextual tooltips exist for complex or unfamiliar features
- [ ] Documentation is written from the user's task perspective
- [ ] Documentation matches the current state of the product
- [ ] Keyboard shortcut reference is available
- [ ] Support contact or live chat is accessible in-product
- [ ] New feature announcements or changelog exist
