# DepRadar Color System

This document defines the semantic color language, hierarchy, and visual communication rules of DepRadar. It acts as the conceptual color specification for the entire product, ensuring that color is used exclusively to convey meaning, direct attention, and reduce cognitive fatigue.

This system defines roles and meanings, not implementation details. It contains no hex codes, RGB values, Tailwind classes, or platform-specific variables.

---

## 1. Color Philosophy

In DepRadar, color is a communication tool, never decoration.

Developers spend hours staring at complex interfaces. A colorful dashboard with glowing elements, high-saturation accents, and decorative gradients increases cognitive fatigue and distracts from the core data. By employing a highly restrained, neutral color strategy, DepRadar creates a calm, focused environment where the developer’s work—not the tool's interface—takes center stage. Color is introduced only when there is a state change, a critical warning, or a distinct action that requires cognitive processing.

---

## 2. Emotional Temperature

Semantic color in DepRadar communicates an emotional state rather than a visual preference. Every semantic role is selected to establish a specific emotional intent, ensuring that the visual language aligns with the developer's cognitive state:

- **Neutral → Calm**: Backgrounds and surfaces provide a quiet, stable workspace that reduces visual stimulation.
- **Observation → Awareness**: Visual indicators of active recording generate a quiet, confident awareness of passive telemetry collection.
- **Health → Confidence**: Developer rhythm metrics are presented with low-contrast, non-judgmental tones that build confidence and encourage healthy working patterns.
- **Focus → Attention**: Active inputs and keyboard-targeted elements stand out clearly, guiding active selection.
- **Reflection → Contemplation**: Retrospective summaries and user-added highlights use a deep tone to prompt contemplation and self-analysis.
- **AI → Curiosity**: Inferred analytical data is styled to invite curiosity and exploration, separating facts from speculation.
- **Warning → Caution**: Potential drifts or non-blocking issues use a distinct, warm accent to counsel caution before making key decisions.
- **Critical → Urgency**: System failures or destructive options are marked to trigger a sense of immediate priority and resolution.

---

## 3. Attention Budget

Every screen in DepRadar has a strict attention budget. Human attention is limited, and color is expensive. When too many accents compete for attention, the entire layout breaks down.

- **Single Dominant Target**: Each screen must contain exactly one dominant attention target. If a page requires the user to see a critical warning, that warning must be the only chromatic element on the screen.
- **Intentional Scarcity**: Accent colors are kept scarce. If every module, button, and badge uses its own accent, the user's eye is pulled in multiple directions. Chromatic color is applied only to primary actions, active states, or notifications.

---

## 4. Neutral Foundation

The foundation of the interface is built on a neutral spectrum that establishes structure and hierarchy without introducing chromatic noise.

- **Background Hierarchy**: Neutral colors progress from deep to lighter shades as components stack vertically. This establishes a logical layout where the background feels solid, and container elements appear layered on top.
- **Surface Hierarchy**: Primary surface containers use slightly elevated neutral shades. Secondary surfaces (like search inputs or disabled states) use receded or transparent neutral values to establish clear boundaries.
- **Layer Separation**: Depth is created by contrasting adjacent neutral layers. A container must look distinctly separated from the primary page background through its neutral value, creating visual calm without borders.

---

## 5. Semantic Color Roles

Chromatic color is reserved strictly for specific semantic roles:

- **Primary**: Indicates the main path of action, active navigation routes, or core interactive elements.
- **Secondary**: Indicates supportive actions, secondary options, or subordinate details.
- **Success**: Confirms that a process has successfully completed or that an active state is healthy.
- **Warning**: Flags non-blocking system states, minor drifts, or actions that require caution before execution.
- **Critical**: Highlights destructive actions, system errors, or blocked states that require immediate correction.
- **Information**: Provides helpful system tips, metadata descriptions, or contextual explanations.
- **Observation**: Identifies the system's active file-watching state and highlights boundaries in the session log.
- **Health**: Conveys developer wellness, focus levels, and state rhythms (e.g., flow vs. distraction).
- **Focus**: Marks elements currently targeted by keyboard navigation or cursor inputs.
- **Disabled**: Signals that an action or data point is currently unavailable.

---

## 6. Color Rhythm

The visual flow of the interface is governed by color rhythm, establishing a progression that invites the developer's eye to move naturally rather than demanding attention. This progression moves systematically:

```
Neutral (Calm baseline)
     ↓
  Surface (Visual depth)
     ↓
Semantic Accent (Interactive paths)
     ↓
Critical Attention (Actionable alerts)
```

By keeping the baseline neutral, the eye rests comfortably on the workspace. As the user begins scanning the page, they follow the subtle progression of surface depth, landing on semantic accents for interaction, and stopping only when critical attention flags require a decision.

---

## 7. Observation Identity

Observation—the passive recording of filesystem activity—is DepRadar's defining capability. To distinguish this state from standard application behaviors (like navigating page routes or adjusting configurations), Observation is granted a unique, dedicated semantic identity.

- **Dedicated Hue**: Observation actions (starting/stopping observation) and indicators (active recording banners) must use a distinct, highly identifiable semantic hue that is never shared with standard primary actions.
- **Why**: When a developer looks at the screen, they must know instantly whether DepRadar is active and capturing data. The dedicated observation identity acts as a secure indicator of active recording.

---

## 8. Health Communication

Visualizing developer health and focus rhythms is a core capability of DepRadar. The color system deliberately rejects "traffic-light" scoring models (e.g., green for high focus, red for distraction) to avoid gamification and false value judgments.

- **Continuous Spectrum**: Health metrics utilize a soft, continuous spectrum of low-contrast tones.
- **Informative, Not Judgmental**: The color roles map to states of mind rather than scorecards. A transition from deep focus to an idle gap does not transition from "healthy green" to "danger red." Instead, it moves between calm, distinct hues representing different phases of the working cycle (e.g., Flow, Contemplation, Recharging).

---

## 9. Timeline Event Language

The timeline displays a complex chronological sequence of events. Each event category is assigned a distinct semantic color identity:

- **Creation**: Represents a new addition. Uses a light, forward-looking semantic accent signifying growth.
- **Evolution**: Represents ongoing changes, iteration, and steady-state work. Uses a neutral, balanced accent.
- **Removal**: Represents cleanup or structural subtraction. Uses a subtle, warm accent indicating removal.
- **Checkpoint**: Represents a structural milestone or commit marker. Uses a distinct, structural accent.
- **Observation**: Represents the session's recording boundaries. Uses the dedicated Observation identity.
- **Replay**: Represents active step-by-step playback states. Uses a motion-oriented semantic accent indicating playback activity.
- **Reflection**: Represents user reflection and retrospective notes. Uses a deep, contemplative accent.
- **Insight**: Represents automated analysis and inferred metadata. Uses a supportive, analytical semantic accent.

---

## 10. Future AI Features

As DepRadar integrates advanced AI summarization and predictive capabilities, the color system reserves a dedicated semantic role for AI-generated elements.

- **Coexistence**: AI-inferred insights must not compete visually with developer-authored code or deterministic system facts.
- **Delineation**: AI-generated elements are consistently colored with an analytical, high-contrast, yet low-saturation accent. This distinguishes automated insights from raw system metrics (e.g., file modification histories) at a glance, maintaining clarity about the source of the data.

---

## 11. Dark Mode Philosophy

For developers, dark interfaces are the default. DepRadar treats Dark Mode as the primary design target.

> **Darkness is the canvas, not the feature.**

Dark mode exists strictly to reduce eye strain, minimize light emissions, and support long engineering sessions. It is not designed to create high-contrast visual drama or look theatrical. Brightness is carefully controlled, utilizing soft, low-luminance neutral backgrounds. Light Mode is a derived translation of this dark-first system, preserving the same ratios and semantic hierarchy by reversing luminance for bright working environments.

---

## 12. Accessibility

Visual meaning must never rely solely on color. The color system is structured to support color blindness, grayscale rendering, and high-contrast settings.

- **Color Blindness Compatibility**: Hues are selected to remain distinguishable across red-green (deuteranopia/protanopia) and blue-yellow (tritanopia) color vision deficiencies. Contrast differences are prioritized over hue differences.
- **Redundant Encoding**: When color is used to signal a state change, a secondary indicator (such as an icon, a text label, or a shape change) must accompany it.
- **Grayscale Adaptability**: The interface must remain fully functional and understandable when rendered in pure grayscale.

---

## 13. Color Ratios

To ensure the interface remains calm and focused, color application is strictly governed by the following ratio rule:

- **70% Neutral Foundation**: Backgrounds, page borders, and primary layout panels.
- **20% Supporting Surfaces**: Inactive tabs, disabled inputs, and secondary panels.
- **8% Semantic Accents**: Primary action buttons, active navigation, and key icons.
- **2% Critical Attention**: Active warnings, error states, and destructive controls.

This distribution guarantees that the interface is visually quiet, allowing the 2% critical attention accents to instantly draw the developer's eye when action is required.

---

## 14. Anti-Patterns

The following color application patterns are prohibited:

- **Rainbow Dashboards**: Using different colors for every metric or panel simply to make the interface look busy.
- **RGB Aesthetics**: Utilizing high-saturation pure primary red, green, and blue values.
- **Excessive Gradients**: Applying multi-color gradients on buttons, headers, or backgrounds.
- **Decorative Color**: Injecting color into non-interactive layout containers, borders, or illustration vectors.
- **Multiple Competing Accents**: Displaying more than one primary color variant in the same visual group.
- **Glowing Interfaces**: Applying colored glows, neon shadows, or high-luminance borders to panels.
- **Inconsistent Semantics**: Using a success color to represent a file deletion, or a warning color for standard navigation.
- **Color as a Layout Patch**: Never use color to compensate for poor layout or weak alignment. If a screen requires excessive color accents, borders, or highlights to separate elements or guide the user's eye, the layout itself is flawed and must be redesigned.

---

## 15. Success Criteria

The color system is successful if:

1.  **Eye Strain is Minimized**: A developer can use DepRadar for eight hours in a dark room without experiencing visual fatigue.
2.  **No Action is Missed**: Critical system failures or warning indicators are identified instantly, even when scanning the page from a distance.
3.  **Grayscale Test Passes**: The entire application remains fully usable, navigable, and legible when the screen is viewed in complete black-and-white.
