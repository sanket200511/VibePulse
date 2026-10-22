# VibePulse Design System

This document defines the structural composition, layout grids, spacing scales, and visual hierarchies that govern the VibePulse user interface. It acts as the structural specification for all user interface layouts, ensuring absolute visual consistency across the product.

This document does not specify color palettes (defined in `COLOR_SYSTEM.md`) or typography scales (defined in `TYPOGRAPHY.md`). Instead, it defines the rules of composition and spatial relationships.

---

## 1. Design Goals

Consistency is the foundation of cognitive ease. In VibePulse, visual consistency is valued higher than novelty. The primary goals are:

- **Reduced Cognitive Load**: Predictable structures allow developers to focus entirely on their data, not on learning new layout patterns.
- **Visual Rhythm**: Harmonious spacing and sizing create an interface that feels calm, balanced, and premium.
- **Scalability**: New views and details must slot naturally into existing layouts by composing standard structural rules rather than inventing custom configurations.

---

## 2. Ownership Boundaries

Every visual and interactive concern has a single, unambiguous owner. This separation of concerns mirrors the backend's architectural boundaries, preventing overlapping responsibilities and ensuring long-term maintainability.

- **DESIGN_SYSTEM.md (This Document)**: Owns Layout, Spacing, Structure, grids, alignment, elevation patterns, and composition rules.
- **COLOR_SYSTEM.md**: Owns all aspects of color, contrast, theme states, and color accessibility boundaries.
- **TYPOGRAPHY.md**: Owns typography scales, font weights, leading, readability rules, and line-length constraints.
- **MOTION.md**: Owns all interactive animation rules, durations, transition curves, and timing policies.
- **COMPONENT_LIBRARY.md**: Owns component-specific behaviors, keyboard interactions, ARIA role mappings, and DOM implementation standards.

---

## 3. Design Token Philosophy

VibePulse translates visual designs into semantic decisions via Design Tokens. Rather than using raw, hard-coded numbers (e.g., specific pixels or animation milliseconds), components consume semantic names. This abstraction preserves long-term visual consistency and makes updates across multiple platforms frictionless.

- **Spacing Tokens**: Standardize layout margins, item spacing, and container padding.
- **Radius Tokens**: Regulate container corner styling and interactive elements.
- **Elevation Tokens**: Establish visual depth layers and layout hierarchy.
- **Motion Tokens**: Standardize transition durations, delay values, and physics-based easing.
- **Opacity Tokens**: Define visual states of priority, disabled content, and overlay backdrops.
- **Layer (Z-index) Tokens**: Govern stacking order and prevent overlap bugs in overlay components.

---

## 4. Grid System

VibePulse layouts use a clean, fluid grid that respects the widescreen monitors typical of software development environments.

- **Content Width**: Content is bounded to prevent line lengths from becoming uncomfortably wide. The central content container spans a maximum readable width and is horizontally centered.
- **Page Margins**: Standard margins exist on the outer edges of the screen, expanding dynamically on wider screens to create breathing room.
- **Responsive Breakpoints**: Layout transitions occur at fixed device-class boundaries:
  - _Small screens_: Single-column layout; text and details stack vertically.
  - _Medium screens_: Two-column layouts with inline navigation, balanced side-by-side.
  - _Large screens_: Full multi-column view with a permanent side-navigation panel, a central narrative view, and a supplementary insight panel.
- **Container Behavior**: Containers are fluid up to their maximum width limit, adapting smoothly to parent resize events.

---

## 5. Spacing System

Layout hierarchy is established through a strict 8-point linear spacing scale. All margins, padding, and gaps between elements must use a token from this scale.

### Spacing Scale

- **Token XS** (4 units): Micro-spacing. Used for tight associations (e.g., spacing between an icon and its text label, or padding within inline badges).
- **Token S** (8 units): Base-spacing. Used for internal padding of small components, gaps between related inline elements, and list-item margins.
- **Token M** (16 units): Component-spacing. Used for internal padding of primary containers, gaps between list items, and standard form field spacing.
- **Token L** (24 units): Section-spacing. Used for gaps between distinct layout sections, padding of parent panels, and list boundaries.
- **Token XL** (32 units): Page-spacing. Used for margins between primary layout blocks, page titles, and hero boundaries.
- **Token XXL** (48+ units): Large-scale division. Used strictly for outer layout margins, empty states, and large structural separations.

---

## 6. Corner Radius

A small, disciplined scale of corner radii creates visual cohesion and hierarchy:

- **Sharp / Zero Radius**: Used strictly for screen-edge containers, full-bleed backgrounds, or persistent horizontal divider lines.
- **Radius Small**: Used for small, interactive controls, inline badges, and input fields.
- **Radius Medium**: Used for primary containers, lists, navigation blocks, and grouped items.
- **Radius Large**: Used for overlay dialogs, contextual popovers, and major panels that sit at the highest level of visual elevation.

---

## 7. Elevation

Visual depth is communicated through layered elevation rather than line borders. Elevation represents how close a component is to the user in three-dimensional space:

1.  **Flat (Level 0 - Ground)**: The primary application background. It is solid, stationary, and houses all other components.
2.  **Raised (Level 1 - Container)**: The default level for primary containers, lists, and sections. They sit slightly above the ground layer, casting soft, wide, low-intensity shadows.
3.  **Floating (Level 2 - Actionable / Interactive)**: Elements that lift on hover or represent active selections. These have slightly more pronounced shadows and indicate interactivity.
4.  **Overlay (Level 3 - Modal / Contextual)**: Dialogs, drop-downs, and popovers that temporarily intercept focus. They sit highest, casting deep, soft shadows to visually separate them from all underlying content layers.

---

## 8. Alignment Philosophy

Alignment is not an aesthetic choice; it is an architectural contract. In VibePulse:

- **Precise Alignment**: Related elements align to the exact pixel along their structural axes (vertical or horizontal).
- **Intentional Separation**: Unrelated or primary/secondary groups of information are separated cleanly by designated spacing tokens.
- **No Approximate Alignment**: Elements must never be "close" or "almost" aligned. If two elements do not share an axis, they must be separated by enough space that the separation is clearly intentional.
- **Trust and Cognitive Load**: Human eyes instinctively recognize order. Perfect alignment creates a sense of professional trust, whereas minor misalignments increase cognitive load and trigger visual distraction.

---

## 9. Borders

Borders are used sparingly. When establishing separation, whitespace is the primary tool.

- **Border Usage**: Borders are reserved for indicating active states, separating adjacent headers from content streams, or defining input boundaries.
- **Whitespace Replacement**: Separate groups of information by increasing the spacing token (e.g., transitioning from Token M to Token L) rather than inserting solid lines.
- **Thickness Philosophy**: Where lines are necessary, they are strictly uniform and minimal. Double borders or heavy dividers are prohibited.

---

## 10. Layout Rhythm

A high-performance interface must balance information density with breathing space to prevent visual fatigue. Layouts establish a clear rhythm by alternating between:

- **High-Density Workzones**: Areas of high information density where data is structured, aligned, and optimized for rapid scanning (such as lists or timelines).
- **Breathing Spaces**: Quiet areas dominated by generous whitespace, surrounding narratives, or section headers.

Whitespace is never treated as empty space; it is a structural element. The interface must never feel visually compressed or crowded.

---

## 11. Iconography

Icons are functional visual indicators, not decorative illustrations.

- **Style & Stroke**: Icons must use a single, unified line style with consistent stroke weights. Mismatched icon families (e.g., mixing filled and outlined styles) are not allowed.
- **Sizing**: Icon dimensions are strictly paired with text sizes to maintain reading alignment. Large, isolated icon illustrations are reserved only for empty states.
- **Placement**: Icons always precede the text label they accompany (reading left-to-right).
- **Icon Omission**: Do not use icons when the surrounding text is self-explanatory or when multiple adjacent actions would create visual repetition.

---

## 12. Component Density

VibePulse favors a comfortable, spacious reading density over compact information packing.

- **Scanning Speed**: White space around text allows the eye to scan data quickly without getting bogged down in wall-to-wall characters.
- **Reading Rhythm**: Standard sections and tables must use generous vertical padding to establish a calm reading flow. Information-dense views must remain readable with distinct row gaps.

---

## 13. Layout Principles

- **Primary Content Priority**: The primary content occupies the largest visual footprint on the screen, centered or aligned left.
- **Secondary Content Scoped**: Auxiliary metrics and analytical profiles are placed in side panels or collapsible sections, subordinate to the primary content.
- **Progressive Disclosure**: Detailed data points are hidden behind interactive expanders or hover states, ensuring the initial page state remains simple.
- **Whitespace as Structure**: Layout blocks are positioned using the spacing scale rather than borders, allowing the background to act as the unifying frame.

---

## 14. Responsive Philosophy

Layouts adapt gracefully to varying screen dimensions by reorganizing structure, never by scaling down text or elements.

- **Widescreen Focus**: On large monitors, columns sit side-by-side to make full use of horizontal space.
- **Laptops**: Multi-column layouts compress safely, wrapping secondary panels beneath or collapsing them into side drawer menus.
- **Tablets**: Layouts transition to single-column streams with fixed, readable margins.
- **Mobile Support**: The interface prioritizes vertical stacking. Interactive targets enlarge slightly to support touch input.

---

## 15. Component Families

Components are conceptually categorized by their structural and interactive purposes:

- **Structural Components**: Primitives that define the physical boundaries, nesting rules, and layouts of the page (e.g., panels, containers, dividers).
- **Interactive Components**: Controls that allow the user to trigger actions, toggle states, or input information (e.g., buttons, selectors, input fields).
- **Data Display Components**: Read-only elements designed to present session information, metrics, or logs clearly (e.g., charts, timelines, lists).
- **Feedback Components**: Indicators that inform the user of system status, action success, or active processes (e.g., progress indicators, inline alerts, status badges).
- **Navigation Components**: Utilities that help users orient themselves and move between views (e.g., menus, breadcrumbs, link bars).
- **Overlay Components**: Temporary containers that sit above all other layouts to handle high-priority or contextual tasks (e.g., dialogs, popovers).

---

## 16. Component State Model

Every interactive component shares a universal state model representing its lifecycle. The visual representation of these states is governed by their respective system owners (e.g., color and motion systems), but the behavioral lifecycle is absolute:

1.  **Default**: The resting state of the component when it is ready for interaction.
2.  **Hover**: Triggered when the user positions a pointing device over the component. Indicates interactivity.
3.  **Focus**: Triggered when the component receives keyboard focus or direct selection. Essential for accessibility.
4.  **Active / Pressed**: The state during the click, touch, or keypress event, indicating the action is executing.
5.  **Disabled**: Indicates the component exists but is currently unavailable for interaction.
6.  **Loading**: The component is waiting for a response from the system. Interaction is temporarily suspended.
7.  **Success**: Indicates that the triggered action was completed successfully.
8.  **Error**: Indicates that the action failed, prompting the user for correction or retry.

---

## 17. Component Consistency Rules

- **Buttons**: Must use clear size variations (small, medium, large) matching the spacing scale. Primary actions must look visually distinct from secondary actions.
- **Containers**: Share identical padding and corner radius across the entire application.
- **Panels**: Persistent panels use matching elevation levels and align perfectly to the parent layout grid.
- **Dialogs / Overlays**: Always use Radius Large, Level 3 Elevation, and center themselves on the screen with a dark, semi-transparent backdrop.
- **Inputs**: Share height, border radius, and internal padding with medium buttons to ensure alignment in forms.
- **Tables**: Must include clear column headers, left-aligned text, right-aligned numbers, and generous row heights.
- **Badges**: Muted status pills with Radius Small and Token XS padding.
- **Empty States**: Group an icon, a clear headline, a supportive paragraph, and a single call-to-action button, centered within the container.
- **Lists**: Must maintain consistent vertical gaps using the spacing scale, never collapsing into a single block of text.
- **Navigation**: High-level routes are consistently positioned (e.g., a persistent side or top bar) with clear visual indicators for active states.

---

## 18. Anti-Patterns

The following composition patterns are prohibited:

- **Random Spacing**: Mixing arbitrary padding values outside the 8-point scale.
- **Inconsistent Radii**: Using rounded controls inside sharp panels, or varying corner radii within the same container block.
- **Multiple Shadow Styles**: Combining sharp shadows with soft shadows, or mixing colored glows with neutral shadows.
- **Visual Clutter**: Inserting separator lines between every single item in a list or table.
- **Deeply Nested Containers**: Placing a container inside a container inside a container. Limit nesting to two levels to preserve visual depth.
- **Oversized Controls**: Interactive elements that dominate the screen or dwarf their text labels.

---

## 19. Success Criteria

A layout design is successful if:

1.  **Alignment is Perfect**: Drawing a vertical line down any column edge reveals perfect alignment of headers, paragraphs, and controls.
2.  **Depth is Instantly Clear**: The user can identify at a glance which panels are background, which are interactive, and which are temporary overlays.
3.  **Hierarchy is Natural**: The user's eye moves automatically from the main narrative headline, to the metrics summary, and finally to the detailed timeline without needing visual guides.
