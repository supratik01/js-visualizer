# JavaScript Execution Visualizer - Design Guidelines

## Design Approach

**Selected Approach:** Design System - Developer Tools Pattern
**Justification:** This is a technical utility requiring clear information hierarchy and efficient workflows. Drawing inspiration from VS Code, Chrome DevTools, and Linear for clean, professional developer interfaces.

**Core Principles:**
- Information clarity over decoration
- Predictable spatial organization
- Semantic color coding for runtime states
- Minimal animation (only for execution flow)

## Layout System

**Spacing Scale:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: `p-4` or `p-6`
- Section gaps: `gap-4` or `gap-6`
- Container margins: `m-2` or `m-4`

**Grid Structure:**
- Left Panel (40-50%): Monaco Editor with dark theme
- Right Panel (50-60%): Stacked visualization sections
  - Call Stack (top)
  - Web APIs (middle-top)
  - Task Queue (middle-bottom)
  - Microtask Queue (bottom)
- Bottom Panel (fixed height ~200px): Console output

**Responsive:** Stack vertically on tablets/mobile with editor on top

## Typography

**Font Families:**
- UI Text: Inter (400, 500, 600)
- Code/Monospace: JetBrains Mono or Fira Code (400, 500)

**Hierarchy:**
- Panel Headers: 14px, font-medium, uppercase tracking
- Code Content: 13px, monospace
- Runtime Values: 12px, monospace
- Labels: 11px, font-medium

## Component Library

### Control Bar (Top)
- Play/Pause/Step/Reset buttons (icon-only with tooltips)
- Execution speed slider
- Current line indicator
- Use Heroicons for controls

### Monaco Editor Panel
- Dark theme matching VS Code
- Line highlighting for current execution
- Gutter markers for breakpoints

### Visualization Panels (Right Side)
**Call Stack:**
- Card-based stack items, newest on top
- Each card shows: function name + line number
- Subtle shadow/border for depth perception
- Height: auto-grow with max-height constraint

**Web APIs Section:**
- Grid of active API calls (setTimeout, fetch, etc.)
- Each item: API type + countdown/status
- Use badges for timing display

**Queue Sections:**
- Horizontal scrollable list
- Task items as compact cards
- Arrow indicators showing direction of flow
- Task Queue distinct from Microtask Queue

**Console Output:**
- Log entries with timestamps
- Color-coded by type (log=neutral, error=red accent, warn=amber accent)
- Auto-scroll to latest
- Monospace font

### Execution Flow Animation
**Minimal Animation Strategy:**
- Line highlight: 200ms fade transition
- Stack push/pop: 300ms slide-in/out
- Queue movement: 400ms shift animation
- Active step indicator: subtle pulse (2s duration)
- No elaborate effects—clarity over spectacle

### Status Indicators
- Execution state badge (Running/Paused/Completed)
- Active queue highlights during event loop tick
- Current execution context marker

## Visual Hierarchy

**Panel Containment:**
- Each section has defined borders (border class)
- Headers with background distinction
- Nested depth through shadow/inset treatments

**Data Emphasis:**
- Currently executing line: highlighted background
- Active stack frame: border accent
- Pending tasks: muted state
- Completed items: strikethrough + opacity reduction

## Interaction Patterns

- Hover states on interactive elements (buttons, code lines)
- Click to set breakpoints in editor gutter
- Keyboard shortcuts (Space=play/pause, →=step)
- Tooltips on all control buttons
- Resizable panels using drag handles

## Accessibility

- ARIA labels for all controls
- Keyboard navigation through all panels
- High contrast for code syntax
- Focus indicators on interactive elements
- Screen reader announcements for execution state changes

## No Images Required

This is a functional developer tool—no hero images or decorative photography needed. All visual interest comes from the code editor, runtime state visualization, and clean information architecture.