# UX Psychology Laws — Complete Reference

> These cognitive and perceptual laws govern how users perceive interfaces, make decisions, and take action. Apply them as design constraints and evaluation criteria for any interface.

---

## Fitts's Law

**Principle**: The time to acquire a target is a function of the distance to the target and the size of the target. Larger, closer targets are faster to reach.

**Mathematical basis**: T = a + b * log2(D/W + 1), where D = distance to target, W = width of target.

### Specific Measurements

| Context | Minimum Target Size | Recommended Size |
|---------|-------------------|------------------|
| Touch (WCAG 2.2) | 44x44 CSS pixels | 48x48px |
| Touch (Material Design) | 48x48px | 48x48px with 8px+ padding |
| Touch (Apple HIG) | 44x44pt | 44x44pt |
| Mouse pointer (desktop) | 24x24px | 32x32px+ for frequent actions |
| Gap between adjacent targets | 8px minimum | 12-16px for touch |

### UI Applications

- [ ] Place primary CTA buttons large (min 44px height) and near the user's current focus area
- [ ] Position frequently used actions at screen edges and corners (infinite edge effect makes these fastest to reach with a mouse)
- [ ] Keep confirm/save buttons near the form they relate to, not at a distant page location
- [ ] Group related actions together to minimize pointer travel between sequential steps
- [ ] Place destructive actions (delete, cancel) away from constructive actions (save, submit) to prevent mis-clicks
- [ ] On mobile, place primary actions in the thumb zone (bottom third of the screen)
- [ ] Use full-width buttons on mobile to maximize target size

### Anti-Patterns to Flag
- Small click targets under 24px for important actions
- Confirm/cancel buttons far from the triggering action
- Important actions placed in hard-to-reach screen areas
- Insufficient spacing between adjacent interactive elements (under 8px gap)
- Tiny close buttons on modals or notifications (under 24px)
- Actions that require precise mouse targeting in dense interfaces

---

## Hick's Law

**Principle**: The time it takes to make a decision increases logarithmically with the number and complexity of choices.

**Mathematical basis**: RT = a + b * log2(n), where n = number of equally probable choices.

### Specific Thresholds

| Context | Maximum Recommended Items |
|---------|--------------------------|
| Top-level navigation | 5-7 items |
| Dropdown menus | 7-10 items before grouping |
| Pricing plans | 3-4 options |
| Onboarding steps | 3-5 steps |
| Options in a radio group | 5-7 before using a different pattern |
| Actions in a toolbar | 5-7 visible, rest in overflow menu |

### UI Applications

- [ ] Limit primary navigation to 5-7 top-level items
- [ ] Use progressive disclosure: show basic options first, reveal advanced settings on demand
- [ ] Break complex decisions into smaller sequential steps (wizard pattern)
- [ ] Categorize long lists into logical groups with clear headings
- [ ] Use smart defaults to reduce the number of active decisions
- [ ] Recommend one option when presenting choices ("Most popular", "Recommended")
- [ ] Provide search and filtering for lists exceeding 10 items
- [ ] Use type-ahead/autocomplete for selections with 15+ options

### Anti-Patterns to Flag
- Dropdown menus with 50+ unsorted options
- Settings pages with 30+ toggles visible on one screen
- Feature comparison tables with 20+ rows and no way to filter
- Presenting all available actions simultaneously without hierarchy
- Navigation with more than 9 top-level items
- Onboarding flows with more than 5 steps before reaching product value

---

## Miller's Law

**Principle**: The average person can hold 7 (plus or minus 2) items in working memory at one time.

**Practical range**: Design for 5 items as the safe lower bound; 9 items as the upper limit.

### Chunking Strategies

| Content Type | Chunking Method |
|-------------|-----------------|
| Phone numbers | Groups of 3-4 digits: (555) 123-4567 |
| Credit card numbers | Groups of 4: 1234 5678 9012 3456 |
| Verification codes | Groups of 3: 123-456 |
| Long form fields | Multi-step wizard with 3-5 fields per step |
| Navigation items | Group into 5-7 categories with sub-navigation |
| Data tables | Show 5-7 columns by default, rest via column picker |
| Bullet point lists | Break into groups of 3-5 with subheadings |

### UI Applications

- [ ] Chunk phone numbers, card numbers, and verification codes into 3-4 digit groups
- [ ] Limit navigation items, stepper steps, and tab sets to 5-9 items
- [ ] Break long forms into multi-step wizards with 3-5 fields per step
- [ ] Group related information into meaningful visual clusters
- [ ] Use lists and bullet points instead of long paragraphs
- [ ] Provide external memory aids: saved states, history, recently viewed items, bookmarks
- [ ] Display summaries of previous steps in multi-step flows
- [ ] Show no more than 5-7 data columns by default in tables

### Anti-Patterns to Flag
- Forms with more than 7 visible fields on a single step
- Tab bars with more than 9 tabs
- Navigation with more than 9 top-level items and no grouping
- Unformatted strings of numbers longer than 4 digits
- Dense data tables with 10+ columns all visible simultaneously
- Long lists without grouping, categorization, or search

---

## Cognitive Load Theory

**Principle**: The total amount of mental effort required to use an interface. Total cognitive load = intrinsic + extraneous + germane.

### Three Types of Cognitive Load

#### Intrinsic Load (Inherent Task Complexity)
The mental effort inherent to the task itself. Cannot be eliminated, but can be managed.

**Reduction strategies:**
- [ ] Break complex tasks into sequential steps (wizard pattern)
- [ ] Use progressive disclosure to reveal complexity gradually
- [ ] Provide smart defaults to eliminate unnecessary decisions
- [ ] Offer templates and presets for common configurations
- [ ] Show only the information relevant to the current step

#### Extraneous Load (Poor Design)
The mental effort caused by the interface design itself, not the task. This is waste -- eliminate it.

**Reduction strategies:**
- [ ] Remove visual clutter and decorative-only elements
- [ ] Use consistent patterns (same action = same interaction everywhere)
- [ ] Reduce the number of choices presented simultaneously
- [ ] Improve readability: adequate font size (16px+ body), line height (1.4-1.6), contrast (4.5:1+)
- [ ] Maintain spatial consistency (same elements in same positions across pages)
- [ ] Use clear, jargon-free language in all UI copy

#### Germane Load (Learning and Schema Building)
The mental effort that contributes to learning and forming mental models. This is productive -- maximize it.

**Maximization strategies:**
- [ ] Use familiar patterns and conventions (Jakob's Law)
- [ ] Provide contextual help at the moment of need
- [ ] Use real-world metaphors and analogies
- [ ] Support exploration without penalty (undo, sandbox modes)
- [ ] Reinforce learning with consistent, predictable behavior

### Measurable Indicators of High Cognitive Load
- Users pause for more than 5 seconds before acting
- High error rate on forms (above 10%)
- Users ask "what does this mean?" during usability testing
- Excessive scrolling or back-and-forth navigation
- Frequent use of the browser back button
- Task abandonment rates above 20%
- Users re-reading instructions multiple times

---

## Gestalt Principles of Perception

These principles describe how the human visual system groups and organizes visual elements.

### Proximity

**Principle**: Elements close together are perceived as belonging to a group.

**Specific measurements:**
- Space between items within a group: use base spacing (8-12px)
- Space between groups: use 2x-3x the within-group spacing (16-32px)
- Space between sections: use 4x-8x the within-group spacing (32-64px)

**UI applications:**
- [ ] Group related form fields with tight spacing; separate field groups with larger spacing
- [ ] Cluster related navigation items together
- [ ] Space between card elements (title, description, metadata) should be less than space between cards
- [ ] Related action buttons grouped together, separated from unrelated actions
- [ ] Dashboard widget internal padding smaller than the gap between widgets

### Similarity

**Principle**: Elements that look alike are perceived as related or having the same function.

**UI applications:**
- [ ] All primary buttons share the same color, size, and shape
- [ ] All links share the same text color, underline style, and hover behavior
- [ ] Related data in tables uses consistent formatting (dates formatted identically, numbers aligned)
- [ ] Similar UI elements (cards, list items) follow identical visual patterns
- [ ] Status indicators use consistent color coding throughout the product (green=success, red=error, yellow=warning)
- [ ] Differentiate interactive from non-interactive elements using consistent visual treatment

### Closure

**Principle**: People perceive a complete shape even when parts are missing. The brain fills in gaps to create recognizable forms.

**UI applications:**
- [ ] Progress indicators (rings, bars) that show partial completion imply the full journey
- [ ] Partially visible carousel items hint that more content exists (show ~15% of the next card)
- [ ] Card designs with implied borders (shadow or background) rather than explicit outlines
- [ ] Cropped images or text that suggest scrollable or expandable content
- [ ] Step indicators with incomplete states that suggest what comes next

### Continuity

**Principle**: The eye follows the smoothest path and perceives elements arranged on a line or curve as related.

**UI applications:**
- [ ] Align elements along clear vertical or horizontal axes
- [ ] Use consistent left alignment for text-heavy content (LTR languages)
- [ ] Guide the eye through visual flow: headline to subheadline to body to CTA
- [ ] Timelines, progress steppers, and breadcrumbs leverage continuity
- [ ] Table rows with consistent alignment create strong horizontal continuity

### Figure-Ground

**Principle**: People distinguish objects (figures) from their background. The brain determines which element is the focal point and which is the background.

**UI applications:**
- [ ] Modal dialogs with dimmed/blurred backdrop to separate foreground from background
- [ ] Active/selected states visually elevated above inactive/unselected states
- [ ] Dropdown menus with shadow and z-index to appear above the page content
- [ ] Focus highlighting: focused element appears to "lift" off the page
- [ ] Card elevation (shadow) to distinguish content blocks from the background surface
- [ ] Highlighted table rows on hover or selection

### Common Region

**Principle**: Elements enclosed within a shared boundary are perceived as belonging to a group.

**UI applications:**
- [ ] Cards with borders or backgrounds to group related content
- [ ] Form sections enclosed in bordered or shaded containers
- [ ] Sidebar sections with dividers or background color changes
- [ ] Alert/notification boxes that visually contain their message, icon, and action
- [ ] Table header rows with distinct background color
- [ ] Navigation groups separated by horizontal dividers or grouped within visual containers

### Symmetry

**Principle**: Symmetrical elements are perceived as belonging together. The brain prefers symmetrical compositions.

**UI applications:**
- [ ] Pricing cards displayed in a balanced, equal-width row
- [ ] Feature comparison grids with symmetrical column widths
- [ ] Centered hero sections with balanced text and imagery
- [ ] Form layouts with consistent label/input width ratios
- [ ] Dashboard layouts with equal-sized grid cells

---

## Von Restorff Effect (Isolation Effect)

**Principle**: When multiple similar items are present, the one that differs from the rest is most likely to be remembered and noticed.

### UI Applications

- [ ] Make the primary CTA visually distinct from secondary and tertiary actions (filled vs outlined vs text)
- [ ] Highlight the recommended pricing plan with a different color, badge ("Most popular"), or size
- [ ] Use color accent on the single most important metric in a dashboard
- [ ] Badge, highlight, or animate new or unread items in a list
- [ ] Distinguish the current step in a stepper from past and future steps
- [ ] Apply a unique visual treatment to critical warnings vs informational messages

### Anti-Patterns to Flag
- Every button on the page uses the same visual weight (nothing stands out)
- Multiple elements competing for attention with equal emphasis
- Overuse of highlights or badges that diminishes the isolation effect
- Warning and info messages styled identically (nothing feels urgent)

---

## Jakob's Law

**Principle**: Users spend most of their time on other sites and products. They prefer interfaces that work the same way as the ones they already know.

### UI Applications

- [ ] Follow established conventions for common patterns: shopping cart icon for e-commerce, bell icon for notifications, gear icon for settings
- [ ] Place the logo top-left, linking to the homepage
- [ ] Position search in the top center or top right
- [ ] Use standard form patterns: labels above inputs, submit button bottom-right
- [ ] Match the navigation model of dominant products in the category (e.g., sidebar nav for SaaS = Slack, Notion, Linear)
- [ ] Use familiar confirmation patterns: "Are you sure?" dialogs for destructive actions
- [ ] Adopt widely recognized gestures: swipe to delete, pull to refresh, pinch to zoom

### Anti-Patterns to Flag
- Custom scroll behavior that overrides native scrolling
- Non-standard navigation placement (bottom nav on desktop, top nav on mobile app)
- Invented gestures with no discoverability cues
- Custom select/dropdown components that do not support keyboard navigation like native selects
- Unconventional icon meanings (using a star icon to mean "delete")
- Modal close behavior that differs from the universal X-button and Escape-key pattern
