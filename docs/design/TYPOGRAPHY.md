# DepRadar Typography System

This document defines the typography philosophy, reading hierarchies, text roles, and structural layout rules of DepRadar. It serves as the typographic architecture specification for the entire product, ensuring that typography is used to establish structure, reduce cognitive load, and support long developer workflows.

This system defines semantic roles and reading behavior, not implementation details. It contains no pixel sizes, line-height constants, Tailwind class names, or font-family declarations.

---

## 1. Typography Philosophy

In DepRadar, typography is information architecture, never decoration.

Typography communicates structure before content. Before a developer reads a single word, the spatial arrangement, density, and contrast of text must explain how the page is organized. Good typography becomes invisible; it creates an intuitive flow that guides the reader through information without drawing attention to itself. Reading must feel effortless. By structuring typography to reflect the natural cognitive patterns of developers, DepRadar reduces visual thinking and prioritizes clean information delivery.

---

## 2. Scanning Patterns

Developers do not read interfaces linearly; they consume them through specialized scanning patterns. The typography must facilitate this behavior by allowing the eye to enter, exit, and jump between content nodes without friction:

1.  **Glance**: A high-level visual check of the page title and narrative summary to understand the overall status.
2.  **Scan**: Rapid vertical navigation through section headers and timeline dates to locate anomalies or specific timeframes.
3.  **Jump**: Immediate transition to highlighted items, labels, or error indicators.
4.  **Compare**: Side-by-side scanning of technical metrics and sequence numbers.
5.  **Verify**: Detailed reading of timestamps and file paths to confirm sequence accuracy.
6.  **Return**: Navigating back to the narrative summary to contextualize detailed findings.
7.  **Deep Read**: Comprehensive reading of AI insights or user reflection logs.

By structuring typography to support this multi-tiered progression, the interface removes the need for linear reading and allows developers to find what they need instantaneously.

---

## 3. Reading Hierarchy

The interface organizes content into clear levels of reading priority, ensuring that high-level concepts and deep details are visually separated:

- **Product Identity**: Establishes the tool's presence. Highly structured and consistently positioned to orient the user without commanding active attention.
- **Page Title**: Announces the primary purpose of the view (e.g., the active workspace or session ID). Acts as the primary anchor point of the page.
- **Section Title**: Divides the page into primary functional areas, establishing logical boundaries.
- **Container Title**: Defines the purpose of specific component blocks or summary panels.
- **Primary Information**: The core text that contains the main message, narrative, or developer insight.
- **Supporting Information**: Explanatory details, descriptions, or evidence that back up primary statements.
- **Metadata**: Supportive context details (e.g., active directories or workspace environments) that are read secondary to primary content.
- **Labels**: Compact, functional text guiding interactions (e.g., buttons, form fields, tab titles).
- **Captions**: Supplementary micro-copy providing context to charts, diagrams, or timestamps.

---

## 4. Information Hierarchy

Typography guides attention systematically. Information must flow from the general to the specific, never forcing the user to struggle to find the core message:

```
Most Important (Narrative/Headline)
     ↓
  Important (Metrics/Summaries)
     ↓
Supporting (Evidence/Descriptions)
     ↓
 Reference (Timelines/Lists)
     ↓
  Metadata (Paths/Sequence Numbers)
```

This hierarchy is established through a combination of scale, weight contrast, and vertical positioning. It must remain fully readable and logical when rendered in high-contrast or grayscale modes, ensuring the structure never depends on color alone.

---

## 5. Typography Rhythm

Typography creates visual rhythm, establishing a comfortable reading cadence that guides the eye down the page. The interface alternates between text blocks, spacing, and controls to create a natural progression:

```
Headline (Primary entry point)
     ↓
Breathing Space (Visual rest)
     ↓
Summary (Supporting metrics)
     ↓
Details (Chronological logs)
     ↓
  Pause (Structural separator)
     ↓
 Action (Interactive decision)
```

Whitespace is considered an active component of typography. By spacing text elements according to this cadence, the interface invites reading rather than forcing it, ensuring that long sessions remain comfortable.

---

## 6. Silence

The absence of text is a core typographic principle in DepRadar. Confident products speak less.

- **Concise Communication**: Not every interface element requires a descriptive paragraph or an explanatory tooltip. Text is kept minimal, concise, and focused.
- **Cognitive Relief**: The deliberate omission of redundant labels or descriptive text reduces cognitive load, allowing the developer to focus entirely on the core data.
- **System Trust**: Concise writing signals system maturity and confidence, reassuring the user that the captured data is clean and self-explanatory.

---

## 7. Progressive Disclosure

Typography supports progressive disclosure by allowing developers to engage with information at multiple depths. A developer should never feel forced to read everything on a screen to gain a basic understanding:

1.  **Quick Glance**: The highest level of hierarchy, conveying the overall status in seconds.
2.  **Scanning**: Secondary headers, bold badges, and key metrics that provide context.
3.  **Focused Reading**: Sub-headings and body text describing specific events or insights.
4.  **Investigation**: Deep details, full file paths, terminal outputs, and historical logs.

Each level of depth is visually isolated, allowing the developer to decide when and where to drill down.

---

## 8. Cognitive Budget

Every typographic emphasis is an expenditure of the developer's attention. Because attention is finite, DepRadar treats emphasis as a strictly budgeted resource:

- **Emphasis Scarcity**: Bold weights, capitalizations, scale increases, and highlighted values are applied sparingly. Every time a value is bolded or enlarged, it consumes a portion of the page's attention budget.
- **Deliberate Expenditure**: If a screen highlights multiple values simultaneously, the hierarchy is diluted, and cognitive fatigue increases. Typography spends attention intentionally, ensuring that only the most critical information stands out.

---

## 9. Typography Roles

Text is categorized into semantic roles, separating explanatory narrative from system data:

- **Display**: Used for high-impact numbers or major system states. Extremely readable and scaled for scanning.
- **Heading**: Used for page and section titles to partition layouts.
- **Subheading**: Used to introduce secondary components or panel groups.
- **Body**: The main reading role for narrative text and developer summaries. Optimized for paragraph legibility.
- **Supporting Text**: Used for descriptions, instructions, or detailed evidence.
- **Metadata**: Small, low-contrast text for secondary facts.
- **Caption**: Used for chart labels and inline footnotes.
- **Badge**: Compact, capitalized text inside status indicators.
- **Status**: Used to indicate current processes or connection status.
- **Timestamp**: Precise chronological markers. Always formatted for readability and alignment.
- **File Path**: Indicates file locations. Optimized to handle long strings gracefully.
- **Git Branch**: Indicates branch names.
- **Commit Hash**: Identifies code versions.
- **Sequence Number**: Monotonic indicators that verify event sequence and detect gaps.
- **Code**: Inline code snippets or language classifications.
- **Terminal Output**: Logs, command outputs, or shell traces.

---

## 10. Developer Reading Behaviour

Developers interact with interfaces differently than casual web users. Rather than consuming pages linearly, they employ high-frequency scanning patterns:

- **Scan**: Fast scanning of summaries to check for anomalies.
- **Compare**: Side-by-side verification of metrics across different intervals.
- **Verify**: Checking sequence numbers and timestamps to confirm order.
- **Return**: Jumping between active details and higher-level lists.
- **Search**: Rapidly scanning text blocks for specific keywords or file paths.
- **Cross-Reference**: Correlating timeline entries with insights.

Typography must support these non-linear reading habits by providing strong, predictable vertical alignments and distinct code styling, enabling developers to skip content, locate targets, and jump back with ease.

---

## 11. Code-Oriented Typography

Technical data has its own visual identity, separating it from conversational English.

- **Semantic Differentiation**: Technical facts (such as file names, directories, repository names, branches, commit hashes, timestamps, IDs, terminal output, and sequence numbers) must be easily distinguishable from explanatory narratives.
- **Readability Constraints**: Code-oriented typography prioritizing absolute character distinction (e.g., differentiating between `0` and `O`, or `l` and `1`). It is structured to align perfectly in columns, facilitating structural comparison.

---

## 12. Numerical Information

Numerical data (e.g., focus percentages, health indicators, timestamps, event counters, durations, and system IDs) should support understanding rather than dominate attention.

- **Scale Restraint**: Numbers must not be oversized unless they represent a primary, high-level summary metric.
- **Tabular Alignment**: Multi-row counters and durations must align vertically to support fast scanning and arithmetic comparison.
- **Clarity Over Emphasis**: Numbers are treated as structured evidence. They do not use heavy weights or neon highlights simply to create visual impact.

---

## 13. Alignment Philosophy

Typographic alignment is an engineering constraint, not a stylistic preference:

- **Left Alignment**: All paragraphs, lists, and narratives are left-aligned (reading left-to-right). Centered body text is prohibited as it disrupts reading rhythm.
- **Vertical Rhythm**: Text lines align to a virtual grid, ensuring that adjacent columns maintain identical baselines.
- **Indentation and Grouping**: Child lists and secondary metadata are systematically indented using spacing tokens, visually communicating parent-child relationships.
- **Predictable Positioning**: Primary action labels, navigation paths, and header metadata occupy fixed, consistent positions across all screens.

---

## 14. Emphasis Philosophy

Emphasis must be earned through necessity. When everything is emphasized, nothing is.

- **Intentional Scarcity**: Bold text, capitalization, and scale increases are applied sparingly. They are reserved for critical headlines, active states, or severe system errors.
- **Multi-Dimensional Contrast**: Emphasis must never rely on font weight alone. A combination of scale, positioning, and color contrast is used to establish priority.
- **Muted Information**: Secondary details, inactive buttons, and background logs are systematically muted to clear the screen for active focus.

---

## 15. Long-Session Readability

DepRadar is designed to support developers during extended coding sessions. The typography system actively mitigates eye fatigue and supports sustained concentration:

- **Line Length Limitation**: Text containers restrict paragraph widths to a readable character length (typically 50–75 characters per line). Excessively long lines are prohibited as they increase reading fatigue.
- **Luminance Balance**: High-contrast, stark white text on pure black backgrounds is avoided. Instead, the system uses soft, off-white text values against deep slate backgrounds, reducing contrast glare while maintaining legibility.
- **Scale Adaptability**: Layouts adjust spacing gracefully on large widescreen monitors, maintaining a comfortable reading scale without forcing the developer's eye to travel vast horizontal distances.

---

## 16. Accessibility

The visual structure of text must accommodate all users:

- **Screen Readers**: Explicit mapping of text roles to semantic HTML5 tags (`<h1>`, `<p>`, `<code>`, `<time>`).
- **Zoom Support**: Layouts are designed to scale text fluidly without overlapping panels, cutting off strings, or breaking containment borders.
- **Dyslexia & Low Vision**: Line spacing (leading) and character tracking are set generously to prevent letter-crowding. Bold text is used clearly to separate labels, and thin font weights (under 400) are avoided for body copy.
- **Redundant Hierarchy**: Visual hierarchy must remain distinguishable in high-contrast environments and grayscale modes.

---

## 17. Anti-Patterns

The following typographic patterns are prohibited:

- **Decorative Typography**: Applying complex, decorative fonts to functional headers or text blocks.
- **Excessive Font Weights**: Mixing more than three font weights on a single screen.
- **Centered Paragraphs**: Centering body text, list items, or technical data tables.
- **Random Capitalization**: Using all-caps on long sentences or using arbitrary letter casing in headers.
- **Excessive Bold**: Highlighting multiple sentences within a body paragraph.
- **Oversized Numbers**: Displaying huge, high-contrast counters that dwarf their semantic description labels.
- **Tiny Metadata**: Setting metadata text sizes so small that they become illegible or strain readability.
- **Inconsistent Spacing**: Varying line-heights or paragraph gaps within the same text family.
- **Multiple Competing Hierarchies**: Having section headers, card titles, and body highlights fight for visual dominance.
- **Typography as a Layout Patch**: Never use typography to compensate for poor layout or weak alignment. If a screen requires excessive font size changes or extreme weights to indicate hierarchy or separate sections, the layout itself must be redesigned.

---

## 18. Success Criteria

The typography system is successful if:

1.  **Hierarchy is Immediate**: A developer can glance at the page for one second and immediately identify the primary headline, secondary summaries, and detail streams.
2.  **Reading is Effortless**: Text is read smoothly without eye-strain or visual skipping, even after hours of continuous use.
3.  **Technical Data is Distinct**: File paths, hashes, and sequence numbers are instantly recognizable and never get confused with body text or titles.
4.  **Layout Rhythm Guides Action**: The natural flow of text elements guides the developer's attention smoothly from summary to detail, culminating in clear, logical interaction points.
