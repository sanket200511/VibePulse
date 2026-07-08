# VibePulse Motion Guidelines

Version: 1.0

---

# Purpose

Motion exists to communicate.

It should never exist purely for decoration.

Every animation should answer at least one question:

- What changed?
- Where did it go?
- What happened?
- What should the user notice?

If motion does not improve understanding, it should not exist.

---

# Motion Philosophy

VibePulse should feel:

- Calm
- Intentional
- Responsive
- Natural
- Professional

Motion should never compete with the user's attention.

Instead, it should quietly support understanding.

---

# Core Principles

## 1. Motion Has Meaning

Every animation must communicate state.

Examples:

✓ Replay progresses through time.

✓ Timeline expands naturally.

✓ Cards appear because new information becomes available.

Avoid decorative animations.

---

## 2. Fast, Never Flashy

Animations should complete quickly.

Recommended durations:

100–150 ms

Small UI interactions

150–200 ms

Cards

Panels

Dialogs

200–300 ms

Page transitions

Replay progression

Anything longer must have a clear purpose.

---

## 3. Respect User Focus

Developers spend long periods concentrating.

Motion should never interrupt reading.

Avoid:

- bouncing
- shaking
- spinning
- pulsing forever
- blinking

The interface should remain calm.

---

## 4. Preserve Spatial Memory

Users should always understand where content came from.

Examples:

Replay controls remain in the same location.

Timeline expands downward.

Dialogs fade and scale naturally.

Avoid teleporting UI.

---

## 5. One Motion At A Time

Avoid multiple simultaneous animations.

The user's eye should have one focal point.

Example:

If Replay progresses,

other interface elements should remain stable.

---

# Motion Categories

## Entrance

Purpose

Reveal new content.

Examples

Cards

Replay panel

Session details

Style

Fade + slight upward movement.

Never dramatic.

---

## Exit

Purpose

Remove content.

Style

Fade only.

Avoid sliding elements across the screen unless necessary.

---

## State Change

Purpose

Explain interaction.

Examples

Play

Pause

Loading complete

Health updated

Motion should reinforce the change.

---

## Progress

Purpose

Show continuous activity.

Examples

Replay timeline

Loading progress

Story playback

Motion should feel steady and predictable.

---

## Navigation

Purpose

Maintain orientation.

Examples

Open Session

Return Home

Replay

Transitions should preserve context.

Users should never feel lost.

---

# Motion Rules

Allowed

✓ Fade

✓ Scale (subtle)

✓ Slide (small distance)

✓ Opacity transitions

✓ Timeline progression

✓ Progress indicators

Discouraged

✗ Bounce

✗ Elastic effects

✗ Continuous pulsing

✗ Large rotations

✗ Flying cards

✗ Confetti

✗ Flash effects

---

# Timing

Hover

100 ms

Button Press

100 ms

Card Appearance

150 ms

Dialog

200 ms

Drawer

250 ms

Page Transition

250–300 ms

Replay Progression

Controlled by playback speed.

Never artificial.

---

# Easing

Preferred

ease-out

ease-in-out

Avoid

Highly elastic curves.

Spring animations unless justified.

Motion should feel natural.

---

# Replay Motion

Replay is the only feature allowed continuous movement.

Rules

The playback cursor moves smoothly.

Frames fade naturally.

Timeline progression remains predictable.

Users must always retain control.

Replay must never feel like a video.

It is an interactive story.

---

# Skeleton Loading

Skeletons are preferred over spinners.

Reasons

Maintain layout stability.

Reduce perceived waiting.

Avoid unnecessary movement.

Spinners should only appear when progress cannot be estimated.

---

# Accessibility

Motion must respect:

prefers-reduced-motion

If reduced motion is enabled:

Remove:

Large transitions

Replay animations

Decorative fades

Keep:

Essential state changes only.

Accessibility always overrides visual polish.

---

# Performance

Animations must remain smooth.

Prefer:

opacity

transform

Avoid animating:

width

height

top

left

layout-affecting properties

Motion should never reduce application responsiveness.

---

# Product Personality

Motion should feel like:

Turning pages in a well-designed notebook.

Not playing a video game.

Developers should notice the product becoming clearer,

not the animations themselves.

---

# Motion Checklist

Before adding any animation, ask:

1.

Does this communicate something?

2.

Would removing this animation reduce understanding?

3.

Does this respect developer focus?

4.

Will this still feel good after thousands of uses?

5.

Does it support the VibePulse identity?

If any answer is "No",

do not implement the animation.

---

# Guiding Principle

The best motion is often the motion users barely notice.

If users describe VibePulse as

"smooth",

"natural",

or

"thoughtful",

then the motion system has succeeded.

---

## VibePulse Design Manifesto

Every design decision should help developers understand their work more clearly.

If a feature, animation, interaction, or sentence does not improve understanding, it does not belong in VibePulse.
