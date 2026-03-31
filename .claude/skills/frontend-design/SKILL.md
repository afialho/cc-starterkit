---
name: frontend-design
description: Design and implement production-grade UI components with design contract, component hierarchy, TDD for frontend, accessibility checklist, and performance checklist.
disable-model-invocation: true
argument-hint: <component or page>
---

# /frontend-design — Frontend Design and Implementation

Create distinctive, production-grade frontend interfaces.

## Instructions

When invoked with `/frontend-design [component or page]`, execute this workflow:

### Phase 1 — Understand Context
Before designing anything:
1. Identify the user's goal for this component/page
2. Understand the data it needs (domain entities involved)
3. Identify existing design system tokens if any (colors, spacing, typography)
4. Check for existing components that can be reused or extended
5. Identify responsive breakpoints relevant to this UI

### Phase 2 — Design Contract
Before writing any code, define the design contract:

```
COMPONENT: [Name]
Purpose: [what the user achieves with this]
Variants: [default, loading, error, empty]
States: [hover, focus, active, disabled if interactive]
Props/API:
  - [prop]: [type] — [purpose]
Data: [what domain data it displays or mutates]
Accessibility:
  - ARIA role: [role]
  - Keyboard nav: [tab order, keyboard shortcuts]
  - Screen reader: [announcements needed]
Responsive:
  - Mobile (< 768px): [layout description]
  - Tablet (768–1024px): [layout description]
  - Desktop (> 1024px): [layout description]
```

### Phase 3 — Component Hierarchy
Design from the outside in:

```
Page/Container (smart, fetches data)
└── Layout (grid, flex structure)
    ├── Header/Navigation
    ├── Main Content
    │   ├── [PrimaryComponent]
    │   │   ├── [SubComponent A]
    │   │   └── [SubComponent B]
    └── Sidebar/Footer (if applicable)
```

- **Smart components** (containers): fetch data, manage state, handle events
- **Dumb components** (presentational): receive props, render UI, emit events

### Phase 4 — Design Principles to Apply
Every UI implementation must respect:

**Visual Hierarchy**
- One primary action per screen
- F-pattern or Z-pattern content layout
- Clear visual weight: primary > secondary > tertiary

**Typography**
- Maximum 2 font families (heading + body)
- Consistent scale (e.g., 12/14/16/20/24/32/40/48px)
- Line height: 1.4–1.6 for body text

**Color**
- Base: neutral/zinc/slate tones for backgrounds and surfaces
- One accent color for primary actions
- Semantic: green (success), red (error), yellow (warning), blue (info)
- Sufficient contrast (WCAG AA minimum: 4.5:1 for text)

**Spacing**
- Consistent spacing scale (4px base unit or equivalent)
- Generous whitespace — don't crowd elements
- Align to grid

**States**
- Every interactive element has: default, hover, focus, active, disabled states
- Every data-dependent component has: loading, empty, error, populated states

**Dark Mode**
- Default to dark mode for dashboards, developer tools, AI products
- Light mode for content-first or editorial surfaces

### Phase 5 — TDD for Frontend
Write component tests before implementing:

```
Unit tests (component-level):
  - Renders correctly with all props
  - Shows loading state when isLoading=true
  - Shows error state when error is set
  - Shows empty state when data is empty
  - Fires correct events on user interaction

Integration tests:
  - Data fetching and display end-to-end

Cypress E2E:
  - Full user flow involving this component
```

### Phase 6 — Implementation Order
1. Write failing component tests (RED)
2. Build the component skeleton (GREEN — tests pass with minimal impl)
3. Add all states (loading, error, empty, populated)
4. Add interactivity and event handlers
5. Apply styling (classes/CSS modules/styled)
6. Add responsive behavior
7. Add accessibility attributes (ARIA, keyboard nav)
8. Refactor for readability (REFACTOR)
9. Run tests + Cypress

### Phase 7 — Accessibility Checklist
Before marking any UI component done:
- [ ] All interactive elements reachable by keyboard (Tab)
- [ ] Focus visible (not removed by CSS)
- [ ] Images have `alt` attributes
- [ ] Forms have associated `<label>` elements
- [ ] ARIA roles correct (`role="button"`, `role="dialog"`, etc.)
- [ ] Error messages announced to screen readers
- [ ] Color is not the only way to convey information
- [ ] Touch targets ≥ 44×44px on mobile

### Phase 8 — Performance Checklist
- [ ] Images optimized (WebP/AVIF, lazy loaded, correct sizes)
- [ ] No layout shift (CLS < 0.1)
- [ ] Large lists virtualized (> 100 items)
- [ ] Expensive computations memoized
- [ ] Event listeners cleaned up on unmount
- [ ] No unnecessary re-renders

### Phase 9 — Code Review Checklist
- [ ] Component does one thing (Single Responsibility)
- [ ] Props interface clearly typed
- [ ] No hardcoded strings (use constants or i18n keys)
- [ ] No inline styles unless truly dynamic
- [ ] Tests cover all states and main interactions
- [ ] Accessible (checklist above passed)
- [ ] Responsive on mobile, tablet, desktop

---

## Anti-Patterns to Avoid
- Raw `<div>` buttons (use `<button>`)
- `onClick` without keyboard equivalent
- Nested conditional renders more than 2 levels deep (extract components)
- Fetching data inside presentational components
- State that could be derived from props
- God components that do everything
- Repeated magic color/size values instead of design tokens
- Missing loading/error/empty states
- Forgetting to handle the case where data is null or undefined
